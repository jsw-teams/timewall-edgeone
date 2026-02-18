import "./clock.css";
import { fetchJson } from "../shared/net";
import { ClockModel, syncOnce } from "../shared/time-sync";
import { $id, setTextSafe } from "../shared/ui";

type Profile = {
  timezone?: string;
  ip_country_en?: string;
  ip_region_en?: string;
  ip_city_en?: string;
};

const model = new ClockModel();

function fmtTime(d: Date) {
  // 24h，精确到秒
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}


async function initProfile() {
  try {
    const p = await fetchJson<Profile>("/api/profile", undefined, 6000);
    if (p?.timezone) setTextSafe($id("tzText"), p.timezone);

    // 位置展示尽量轻：存在就显示，不存在就空
    const parts = [p.ip_country_en, p.ip_region_en, p.ip_city_en].filter(Boolean);
    if (parts.length) setTextSafe($id("locText"), parts.join(" / "));
  } catch {
    // profile 获取失败不影响时钟
  }
}

async function initSync() {
  try {
    const s = await syncOnce("/api/now", 3);
    model.applySync(s, true);
    // 可选：只在控制台给你看
    // console.info("[sync] ok rtt=", s.rttMs.toFixed(1), "ms");
  } catch (e) {
    // console.warn("[sync] failed:", e);
  }
}

function startClock() {
  const timeEl = $id("bigTime");
  const dateEl = $id("bigDate");

  let lastShown = "";

  const tick = () => {
    const nowMs = model.now();
    const d = new Date(nowMs);

    const t = fmtTime(d);
    if (t !== lastShown) {
      lastShown = t;
      setTextSafe(timeEl, t);
      setTextSafe(dateEl, fmtDate(d));
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

(async () => {
  // 先让时钟跑起来（避免页面“卡死感”）
  startClock();

  // 并行做 profile + sync，任何失败都不阻塞 UI
  await Promise.allSettled([initProfile(), initSync()]);
})();
