import { drizzle } from "drizzle-orm/node-postgres";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import * as schema from "./schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.DATABASE_URL) {
	// Local dev: DATABASE_URL is kept in apps/api/.env
	loadEnv({ path: path.resolve(__dirname, "../../apps/api/.env") });
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
export { schema };
export * from "./schema";
export { eq } from "drizzle-orm";
