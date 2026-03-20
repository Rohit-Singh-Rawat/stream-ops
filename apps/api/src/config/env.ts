import { z } from 'zod';

const envSchema = z.object({
	AWS_REGION: z.string(),
	AWS_ACCESS_KEY_ID: z.string(),
	AWS_SECRET_ACCESS_KEY: z.string(),
	INPUT_BUCKET: z.string().min(1),
	OUTPUT_BUCKET: z.string().min(1),
	QUEUE_URL: z.string().url(),
	PORT: z.coerce.number().default(4000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
	throw new Error('Invalid environment variables');
}

export const env = parsed.data;
