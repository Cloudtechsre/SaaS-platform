import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DB_URL || "postgres://app:pass@localhost:5432/orders_db",
});

export async function query(
  text: string,
  params?: any[]
) {
  return pool.query(text, params);
}
