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

// 当前生效的时区：先用浏览器时区兜底，避免 profile 未返回时显示“本机 UTC/偏移”
let tz: string =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

// formatter 会随 tz 更新
let timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: tz,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

let dateFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: tz,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function applyTZ(newTZ?: string) {
  const next = (newTZ || "").trim();
  if (!next || next === tz) return;
  tz = next;

  timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  dateFmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

async function initProfile() {
  try {
    const p = await fetchJson<Profile>("/api/profile", undefined, 6000);

    if (p?.timezone) {
      applyTZ(p.timezone);
      setTextSafe($id("tzText"), p.timezone);
    }

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
  } catch {
    // sync 失败也不影响本地走时
  }
}

function startClock() {
  const timeEl = $id("bigTime");
  const dateEl = $id("bigDate");

  let lastShown = "";

  const tick = () => {
    const nowMs = model.now();
    const d = new Date(nowMs);

    // 用 Intl 按 tz 格式化
    const t = timeFmt.format(d);
    if (t !== lastShown) {
      lastShown = t;
      setTextSafe(timeEl, t);
      setTextSafe(dateEl, dateFmt.format(d)); // sv-SE 输出天然是 YYYY-MM-DD
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
