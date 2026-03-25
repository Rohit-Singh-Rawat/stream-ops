import { db, eq, videoJobs, videos } from '@stream-ops/db';
import { outputKeyPrefixForTranscode } from '../paths';

export async function createVideoJob(videoId: string) {
	const existingJob = await db.query.videoJobs.findFirst({
		where: eq(videoJobs.videoId, videoId),
	});
	if (existingJob) return existingJob;

	const [video] = await db
		.select({
			sourceBucket: videos.sourceBucket,
			sourceKey: videos.sourceKey,
		})
		.from(videos)
		.where(eq(videos.id, videoId))
		.limit(1);

	if (!video) throw new Error(`Video not found: ${videoId}`);

	const inputKey = video.sourceKey?.trim();
	if (!inputKey) throw new Error(`Video ${videoId} has no source key`);

	const inputBucket = video.sourceBucket?.trim() ?? process.env.INPUT_BUCKET?.trim();
	if (!inputBucket) throw new Error('INPUT_BUCKET is not set');

	const [row] = await db
		.insert(videoJobs)
		.values({
			videoId,
			status: 'pending',
			inputBucket,
			inputKey,
			outputPrefix: outputKeyPrefixForTranscode(inputKey, videoId),
		})
		.returning();

	if (!row) throw new Error('Failed to create video job');
	return row;
}
