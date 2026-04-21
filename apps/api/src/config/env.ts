import { z } from 'zod';

const envSchema = z.object({
	AWS_REGION: z.string(),
	// Optional in production — ECS task IAM role is used instead of explicit credentials.
	AWS_ACCESS_KEY_ID: z.string().optional(),
	AWS_SECRET_ACCESS_KEY: z.string().optional(),
	AWS_ENDPOINT_URL: z.url().optional(),
	// Separate from AWS_ENDPOINT_URL because presigned URLs are resolved by the browser —
	// in local dev the browser can't reach the internal Docker hostname used for server-side ops.
	AWS_PRESIGN_ENDPOINT_URL: z.url().optional(),
	INPUT_BUCKET: z.string().min(1),
	OUTPUT_BUCKET: z.string().min(1),
	// Not set in production — S3 event notifications trigger the Lambda directly.
	// Set locally to point at ElasticMQ so the worker poll loop receives jobs.
	QUEUE_URL: z.url().optional(),
	PORT: z.coerce.number().default(4000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error('❌ Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
	throw new Error('Invalid environment variables');
}

export const env = parsed.data;
