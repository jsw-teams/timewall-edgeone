export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 8000
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        accept: "application/json",
        ...(init?.headers || {}),
      },
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    try {
      return JSON.parse(text) as T;
    } catch (e) {
      // 关键：把返回头部片段带上，方便你排查边缘节点返回了什么
      const head = text.slice(0, 160).replace(/\s+/g, " ");
      throw new Error(`Invalid JSON from ${url}: ${String(e)}; head=${head}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
