// common/metrics.ts
import client from "prom-client";

// Collect default Node.js process metrics
client.collectDefaultMetrics();

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["service", "method", "route", "status"] as const,
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["service", "method", "route"] as const,
  buckets: [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5],
});

export const ordersCreatedTotal = new client.Counter({
  name: "orders_created_total",
  help: "Total number of orders created",
  labelNames: ["tenant_id"] as const,
});

export function getMetricsRegistry() {
  return client.register;
}
