// Einfache In-Memory-Rate-Limit-Strategie (Sliding Window) pro Schlüssel (z. B. IP).
// Ausreichend für ein Kontaktformular. Für mehrere Server-Instanzen später
// gegen Redis/Upstash o. Ä. tauschen.
type Hit = { count: number; reset: number };
const store = new Map<string, Hit>();

export function rateLimit(key: string, limit = 5, windowMs = 60_000): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const cur = store.get(key);
  if (!cur || now > cur.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (cur.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((cur.reset - now) / 1000) };
  }
  cur.count += 1;
  return { ok: true, remaining: limit - cur.count, retryAfter: 0 };
}
