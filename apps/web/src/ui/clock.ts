import { formatDate, formatTime } from "../lib/time/format";
import type { SyncResult } from "../lib/time/sync";

export type ClockState = {
  use24h: boolean;
  offsetMs: number;
  rttMs: number;
  lastSyncAt: number;
};

export function createClock(el: {
  time: HTMLElement; ms: HTMLElement; date: HTMLElement; tz: HTMLElement;
  offset: HTMLElement; rtt: HTMLElement; pill: HTMLElement;
}) {
  const state: ClockState = {
    use24h: true,
    offsetMs: 0,
    rttMs: 0,
    lastSyncAt: 0
  };

  function nowAdjusted() {
    return new Date(Date.now() + state.offsetMs);
  }

  function renderOnce() {
    const d = nowAdjusted();
    const { hms, ms } = formatTime(d, state.use24h);

    el.time.textContent = hms;
    el.ms.textContent = ms;
    el.date.textContent = formatDate(d);

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
    el.tz.textContent = tz;

    el.offset.textContent = `${Math.round(state.offsetMs)} ms`;
    el.rtt.textContent = state.rttMs ? `${Math.round(state.rttMs)} ms` : "--";

    // 简单健康度：RTT<250ms 视作 OK
    if (state.lastSyncAt) {
      el.pill.textContent = state.rttMs < 250 ? "sync: ok" : "sync: unstable";
    }
  }

  let raf = 0;
  function loop() {
    renderOnce();
    raf = requestAnimationFrame(loop);
  }

  function applySync(res: SyncResult) {
    state.offsetMs = res.offsetMs;
    state.rttMs = res.rttMs;
    state.lastSyncAt = Date.now();
  }

  function toggle24h() {
    state.use24h = !state.use24h;
  }

  function start() { loop(); }
  function stop() { cancelAnimationFrame(raf); }

  return { state, start, stop, applySync, toggle24h };
}
