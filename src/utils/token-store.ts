type TokenRecord = { value: string; expiresAt: number; data?: Record<string, unknown> };

const store = new Map<string, TokenRecord>();

export function putToken(key: string, value: string, ttlMs: number, data?: Record<string, unknown>) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs, data });
}

export function getToken(key: string): TokenRecord | null {
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() > rec.expiresAt) { store.delete(key); return null; }
  return rec;
}

export function deleteToken(key: string) {
  store.delete(key);
}






