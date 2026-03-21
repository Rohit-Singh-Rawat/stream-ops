export function logEvent(payload: Record<string, unknown> & { step: string }): void {
	console.log(JSON.stringify({ ...payload, timestamp: Date.now() }));
}
