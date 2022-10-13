export type SnoozeFunc = typeof snooze;

export function snooze(ms: number): Promise<void> {
  console.debug(`Waiting ${ms}ms...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
