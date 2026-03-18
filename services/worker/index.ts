import { pollQueue } from './src/queue';
import { downloadFile } from './src/s3';

console.log('Worker started...');

pollQueue(async (job) => {
	console.log('Received job:', job);

	const { bucket, key } = job;

	const filePath = await downloadFile(bucket, key);

	console.log('Downloaded file to:', filePath);

	// next step → transcoding
});
