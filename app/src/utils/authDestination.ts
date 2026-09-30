const KEY = 'wc_auth_destination';
const safe = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/entrar');

export function authDestination(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  let stored: string | null = null;
  try { stored = sessionStorage.getItem(KEY); } catch { /* storage may be unavailable */ }
  return safe(from) ? from : safe(stored) ? stored : '/';
}

export function rememberDestination(value: string) {
  if (!safe(value) || value === '/') return;
  try { sessionStorage.setItem(KEY, value); } catch { /* router state is the fallback */ }
}

export function clearDestination() {
  try { sessionStorage.removeItem(KEY); } catch { /* optional storage */ }
}
