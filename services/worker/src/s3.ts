import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const s3 = new S3Client({
	region: process.env.AWS_REGION,
	forcePathStyle: true,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

export async function downloadFile(bucket: string, key: string) {
	const res = await s3.send(
		new GetObjectCommand({
			Bucket: bucket,
			Key: key,
		})
	);

	const filePath = path.join('/tmp', key.replace(/\//g, '_'));
	const fileStream = fs.createWriteStream(filePath);

	await new Promise((resolve, reject) => {
		(res.Body as any).pipe(fileStream).on('finish', resolve).on('error', reject);
	});

	return filePath;
}
