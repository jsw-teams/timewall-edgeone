import { fetchJson } from "../fetch";

export type SyncSample = {
  t0: number; // client send
  t1: number; // client recv
  rtt: number;
  serverEpochMs: number;
  offsetMs: number; // server - client(mid)
};

export type SyncResult = {
  ok: boolean;
  offsetMs: number;
  rttMs: number;
  samples: SyncSample[];
};

type NowResp = { ok: boolean; server_epoch_ms: number };

export async function syncNow(endpoint = "/api/now", rounds = 6): Promise<SyncResult> {
  const samples: SyncSample[] = [];

  for (let i = 0; i < rounds; i++) {
    const t0 = Date.now();
    const data = await fetchJson<NowResp>(endpoint, 4500);
    const t1 = Date.now();

    const rtt = t1 - t0;
    const mid = (t0 + t1) / 2;
    const serverEpochMs = data.server_epoch_ms;
    const offsetMs = serverEpochMs - mid;

    samples.push({ t0, t1, rtt, serverEpochMs, offsetMs });

    // 小间隔，避免同一 TCP/队列抖动
    await new Promise((r) => setTimeout(r, 120));
  }

  // 取 RTT 最小的前 2 个，做平均（经验上更稳定）
  const sorted = [...samples].sort((a, b) => a.rtt - b.rtt);
  const pick = sorted.slice(0, Math.min(2, sorted.length));
  const offset = pick.reduce((s, x) => s + x.offsetMs, 0) / pick.length;
  const rttMs = pick.reduce((s, x) => s + x.rtt, 0) / pick.length;

  return { ok: true, offsetMs: offset, rttMs, samples };
}
