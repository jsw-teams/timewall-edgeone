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

// 使用 Intl.DateTimeFormat + timeZone 格式化（你要求的方式）
function fmtTimeHmsInTZ(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}
function fmtTimeHmInTZ(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
function fmtDateInTZ(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

let tzForClock = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

async function initProfile() {
  try {
    const p = await fetchJson<Profile>("/api/profile", undefined, 6000);

    if (p?.timezone) {
      tzForClock = p.timezone;
      setTextSafe($id("tzText"), p.timezone);
    }

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
  } catch {
    // ignore
  }
}

function startClock() {
  const timeEl = $id("bigTime");
  const dateEl = $id("bigDate");
  const srEl = document.getElementById("srTime");

  let lastHms = "";
  let lastDate = "";
  let lastSpokenHm = "";

  const tick = () => {
    const nowMs = model.now();
    const d = new Date(nowMs);

    // 视觉：每秒显示
    const hms = fmtTimeHmsInTZ(d, tzForClock);
    if (hms !== lastHms) {
      lastHms = hms;
      setTextSafe(timeEl, hms);
    }

    const dateStr = fmtDateInTZ(d, tzForClock);
    if (dateStr !== lastDate) {
      lastDate = dateStr;
      setTextSafe(dateEl, dateStr);
    }

    // 读屏：每分钟播报一次（避免每秒朗读）
    if (srEl) {
      const hm = fmtTimeHmInTZ(d, tzForClock);
      if (hm !== lastSpokenHm) {
        lastSpokenHm = hm;
        srEl.textContent = `当前时间：${hm}`;
      }
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

(async () => {
  // 先跑起来，避免页面“卡死感”
  startClock();

  // 并行：任何失败不阻塞 UI
  await Promise.allSettled([initProfile(), initSync()]);
})();
