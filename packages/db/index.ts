import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// In production ECS, Secrets Manager injects DB_USER/DB_PASS as individual env vars
// (the secret is a JSON object, not a connection string). DATABASE_URL is the local-dev path.
function resolveConnectionString(): string {
	if (process.env.DATABASE_URL) {
		return process.env.DATABASE_URL;
	}

	const host = process.env.DB_HOST;
	const user = process.env.DB_USER;
	const pass = process.env.DB_PASS;

	if (host && user && pass) {
		const port = process.env.DB_PORT ?? "5432";
		const name = process.env.DB_NAME ?? "stream_ops";
		return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${name}`;
	}

	throw new Error(
		"Database not configured. Set DATABASE_URL or the DB_HOST + DB_USER + DB_PASS triple.",
	);
}

const pool = new Pool({ connectionString: resolveConnectionString() });

export const db = drizzle(pool, { schema });
export { schema };
export * from "./schema";
export { eq } from "drizzle-orm";
