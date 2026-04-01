import { ECSClient, RunTaskCommand, type RunTaskCommandInput } from '@aws-sdk/client-ecs';

export interface RunTaskInput {
	videoId: string;
	bucket: string;
	key: string;
}

function requireEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

const ecs = new ECSClient({ region: process.env.AWS_REGION });
const cluster = requireEnv('ECS_CLUSTER');
const taskDefinition = requireEnv('TASK_DEF');
const subnets = requireEnv('SUBNETS').split(',').map((s) => s.trim());
const securityGroups = requireEnv('SECURITY_GROUPS').split(',').map((s) => s.trim());
const containerName = process.env.CONTAINER_NAME?.trim() ?? 'video-transcoder';

export async function runTask({ videoId, bucket, key }: RunTaskInput): Promise<void> {
	const input: RunTaskCommandInput = {
		cluster,
		taskDefinition, 
		launchType: 'FARGATE',
		networkConfiguration: {
			awsvpcConfiguration: {
				subnets,
				securityGroups,
				assignPublicIp: 'ENABLED',
			},
		},
		overrides: {
			containerOverrides: [
				{
					name: containerName,
					environment: [
						{ name: 'VIDEO_ID', value: videoId },
						{ name: 'S3_BUCKET', value: bucket },
						{ name: 'S3_KEY', value: key },
					],
				},
			],
		},
	};

	const res = await ecs.send(new RunTaskCommand(input));

	const failures = res.failures ?? [];
	if (failures.length > 0) {
		const detail = failures.map((f) => `${f.arn ?? 'unknown'}: ${f.reason ?? 'no reason'}`).join('; ');
		throw new Error(`ECS RunTask failures: ${detail}`);
	}
}
