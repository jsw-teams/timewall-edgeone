export async function fetchJson<T>(url: string, timeoutMs = 4500): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const resp = await fetch(url, { signal: ac.signal, headers: { "accept": "application/json" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json() as T;
  } finally {
    clearTimeout(t);
  }
}
