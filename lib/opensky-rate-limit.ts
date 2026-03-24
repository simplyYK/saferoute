const lastFetchByIp = new Map<string, number>();
const MIN_INTERVAL_MS = 15_000;

export function openskyCanRequest(ip: string): boolean {
  const now = Date.now();
  const last = lastFetchByIp.get(ip) ?? 0;
  return now - last >= MIN_INTERVAL_MS;
}

export function openskyMarkRequested(ip: string) {
  lastFetchByIp.set(ip, Date.now());
}
