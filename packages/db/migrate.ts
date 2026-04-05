import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: path.join(__dirname, 'drizzle') });
await pool.end();

console.log('Migrations complete');
