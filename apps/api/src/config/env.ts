import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().default(3000),

	DATABASE_URL: z.string().url(),

	JWT_SECRET: z.string().min(32),

	AWS_REGION: z.string(),
	AWS_ACCESS_KEY_ID: z.string(),
	AWS_SECRET_ACCESS_KEY: z.string(),
	S3_BUCKET: z.string(),
	S3_ENDPOINT: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
	throw new Error('Invalid environment variables');
}

export const env = parsed.data;
