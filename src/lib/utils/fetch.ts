const DEFAULT_FETCH_TIMEOUT_MS = 8000;

export function fetchTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.NEARHIRE_SOURCE_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FETCH_TIMEOUT_MS;
}

export function requestSignal(timeoutMs = fetchTimeoutMs()): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}
