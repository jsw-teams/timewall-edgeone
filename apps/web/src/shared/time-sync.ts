import { fetchJson } from "./net";

export type SyncResult = {
  ok: true;
  offsetMs: number; // server - clientMid
  rttMs: number;
  at: number;       // Date.now() at sync
};

export async function syncOnce(endpoint = "/api/now", rounds = 3): Promise<SyncResult> {
  let best: SyncResult | null = null;

  for (let i = 0; i < rounds; i++) {
    const t0 = performance.now();
    const d0 = Date.now();

    const data = await fetchJson<{ server_epoch_ms: number }>(endpoint, undefined, 6000);

    const t1 = performance.now();
    const d1 = Date.now();

    const rtt = t1 - t0;
    const clientMid = (d0 + d1) / 2;
    const offset = data.server_epoch_ms - clientMid;

    const cur: SyncResult = { ok: true, offsetMs: offset, rttMs: rtt, at: Date.now() };
    if (!best || cur.rttMs < best.rttMs) best = cur;
  }

  // best 一定存在（rounds>=1）
  return best!;
}

/**
 * 用 performance.now 作为“单调时钟”，避免 Date.now() 抖动导致的漂移；
 * 同步只调整基准，不用在 UI 上展示“偏移值”，体验更干净。
 */
export class ClockModel {
  private basePerf = performance.now();
  private baseEpoch = Date.now(); // 已含 offset 后的“服务器时间基准”

  now(): number {
    return this.baseEpoch + (performance.now() - this.basePerf);
  }

  applySync(sync: SyncResult, smooth: boolean) {
    const targetEpoch = Date.now() + sync.offsetMs;

    if (!smooth) {
      this.basePerf = performance.now();
      this.baseEpoch = targetEpoch;
      return;
    }

    // 平滑：避免一把把时间“跳一下”（虽然你只显示到秒，但平滑更自然）
    const current = this.now();
    const delta = targetEpoch - current;

    // 每次最多修正 250ms（你只显示秒，这个值已经非常保守）
    const clamped = Math.max(-250, Math.min(250, delta));

    this.basePerf = performance.now();
    this.baseEpoch = current + clamped;
  }
}
