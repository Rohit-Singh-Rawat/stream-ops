import { defineConfig } from 'drizzle-kit';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.DATABASE_URL) {
	// Keep migration target aligned with runtime DB config in local dev.
	loadEnv({ path: path.resolve(__dirname, '../../apps/api/.env') });
}

export default defineConfig({
	out: './drizzle',
	schema: './schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
