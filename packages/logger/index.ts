export type LogFields = {
	stage: string;
} & Record<string, unknown>;

export function log(fields: LogFields): void {
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			...fields,
		}),
	);
}
