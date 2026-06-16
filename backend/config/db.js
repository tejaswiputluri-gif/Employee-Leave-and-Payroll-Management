import pg from "pg";
import { appConfig } from "./env.js";

const { Pool } = pg;

let poolInstance;

export function getPool() {
  if (!appConfig.databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: appConfig.databaseUrl,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    });
  }

  return poolInstance;
}
