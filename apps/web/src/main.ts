import "./style.css";
import { detectLang, t } from "./i18n";
import { fetchJson } from "./lib/fetch";
import { syncNow } from "./lib/time/sync";
import type { HolidaysResp } from "./lib/calendar/types";
import { createClock } from "./ui/clock";
import { createCalendar } from "./ui/calendar";

type Profile = {
  ok: boolean;
  client_ip: string | null;
  geo: null | {
    countryCodeAlpha2?: string;
    countryName?: string;
    regionName?: string;
    cityName?: string;
    latitude?: number;
    longitude?: number;
    asn?: number;
  };
};

const lang = detectLang();

const $ = (id: string) => document.getElementById(id)!;

$("brandSub").textContent = t(lang, "loading");

const clock = createClock({
  time: $("clockTime"),
  ms: $("clockMs"),
  date: $("clockDate"),
  tz: $("clockTz"),
  offset: $("clockOffset"),
  rtt: $("clockRtt"),
  pill: $("pillNet")
});

const calendar = createCalendar({
  container: $("calendar"),
  meta: $("calMeta"),
  dayPanel: $("dayPanel"),
  dayTitle: $("dayTitle"),
  dayBody: $("dayBody")
});

function pickCountry(profile: Profile): string {
  const cc = profile.geo?.countryCodeAlpha2;
  if (cc) return String(cc).toUpperCase();
  return "US";
}

async function loadHolidayData(country: string, year: number) {
  const url = `/api/holidays?country=${encodeURIComponent(country)}&year=${encodeURIComponent(String(year))}`;
  return await fetchJson<HolidaysResp>(url, 6500);
}

async function init() {
  // 1) profile：用于地区识别（CN/非CN）
  let profile: Profile | null = null;
  try {
    profile = await fetchJson<Profile>("/api/profile", 4500);
  } catch {
    profile = null;
  }

  const country = profile?.ok ? pickCountry(profile) : "US";
  const where =
    profile?.geo?.countryName
      ? `${profile.geo.countryName}${profile.geo.cityName ? " · " + profile.geo.cityName : ""}`
      : country;

  $("brandSub").textContent = `地区：${where}`;

  // 2) 对时
  try {
    const res = await syncNow("/api/now", 6);
    clock.applySync(res);
  } catch {
    // 不影响本地时钟运行
  }

  // 3) 日历数据：CN 2026 内置 / 其他走 Nager
  const now = new Date();
  const year = now.getFullYear();

  try {
    const data = await loadHolidayData(country, year);
    calendar.setData(data, country, year);
  } catch {
    calendar.setData({ ok: false, error: "load_failed" } as any, country, year);
  }

  calendar.render();
  clock.start();

  // 交互按钮
  $("btnResync").addEventListener("click", async () => {
    $("pillNet").textContent = "sync: ...";
    try {
      const res = await syncNow("/api/now", 6);
      clock.applySync(res);
    } catch {
      $("pillNet").textContent = "sync: failed";
    }
  });

  $("btnToggle24h").addEventListener("click", () => clock.toggle24h());

  $("btnPrev").addEventListener("click", () => calendar.prevMonth());
  $("btnNext").addEventListener("click", () => calendar.nextMonth());
  $("btnToday").addEventListener("click", () => calendar.goToday());
}

init().catch(() => {
  $("brandSub").textContent = "Init failed";
});
