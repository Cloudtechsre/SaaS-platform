import express from "express";
import { v4 as uuidv4 } from "uuid";
import { query } from "../../common/db";
import { tenantContext, TenantRequest } from "../../common/middleware/tenantContext";
import {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  ordersCreatedTotal,
  getMetricsRegistry,
} from "../../common/metrics";

const app = express();
app.use(express.json());

const SERVICE_NAME = "ingest-api";

// small helper to wrap handlers with metrics
function wrapRoute(
  serviceName: string,
  route: string,
  handler: (req: TenantRequest, res: express.Response) => Promise<any> | any
) {
  return async (req: TenantRequest, res: express.Response) => {
    const endTimer = httpRequestDurationSeconds.startTimer({
      service: serviceName,
      method: req.method,
      route,
    });

    try {
      await handler(req, res);
      httpRequestsTotal.inc({
        service: serviceName,
        method: req.method,
        route,
        status: res.statusCode,
      });
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
      httpRequestsTotal.inc({
        service: serviceName,
        method: req.method,
        route,
        status: 500,
      });
    } finally {
      endTimer();
    }
  };
}

// health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

// main endpoint
app.post(
  "/ingest",
  tenantContext, // attaches tenantId to req
  wrapRoute(SERVICE_NAME, "/ingest", async (req, res) => {
    const { amount, status } = req.body;
    const tenantId = (req as TenantRequest).tenantId!;

    if (typeof amount !== "number" || !status) {
      return res.status(400).json({
        error: "amount (number) and status (string) are required",
      });
    }

    const id = uuidv4();

    // Write to Postgres
    await query(
      "INSERT INTO orders (id, tenant_id, amount, status) VALUES ($1, $2, $3, $4)",
      [id, tenantId, amount, status]
    );

    // Domain metric
    ordersCreatedTotal.inc({ tenant_id: tenantId });

    // Later: also publish to Kinesis here

    return res.status(201).json({
      id,
      tenant_id: tenantId,
      amount,
      status,
    });
  })
);

// metrics for Prometheus
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", getMetricsRegistry().contentType);
  res.end(await getMetricsRegistry().metrics());
});

const port = process.env.PORT || 4001;
app.listen(port, () => {
  console.log(`${SERVICE_NAME} listening on port ${port}`);
});
