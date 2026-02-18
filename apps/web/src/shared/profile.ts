// apps/web/src/shared/profile.ts
// 目标：可靠拿到 tz / country / region，并提供一个用于 UI 的 displayArea。
// 规则：
// - 优先使用 /api/profile 返回的 ip_country_id / ip_region_id（最准确）
// - 如果缺 country，但有 timezone，则做少量高命中兜底映射（解决 Asia/Taipei -> TW）
// - mainlandCN：CN 且非港澳台（HK/MO/TW）

export type Profile = {
  timezone?: string;

  // ✅ 强烈建议 /api/profile 返回这两个字段（ESA request.info 里本来就有）
  ip_country_id?: string; // "CN" | "US" | "TW" ...
  ip_region_id?: string;  // "CN-CQ" | "US-CA" ...

  // 可选展示字段
  ip_country_en?: string;
  ip_region_en?: string;
  ip_city_en?: string;
};

export type GeoCtx = {
  tz: string;          // IANA timezone, e.g. "Asia/Shanghai"
  country: string;     // ISO2 or "ZZ"
  state?: string;      // subdivision code (if available), e.g. "CA" / "CQ"
  mainlandCN: boolean; // CN 内地
  displayArea: string; // 顶部展示用：CN / CN-CQ / US-CA / TW
};

function guessCountryFromTZ(tz: string): string | null {
  // 只做少量映射，避免误判；可按需要扩展
  const map: Record<string, string> = {
    // Greater China
    "Asia/Shanghai": "CN",
    "Asia/Beijing": "CN",
    "Asia/Chongqing": "CN",
    "Asia/Harbin": "CN",
    "Asia/Urumqi": "CN",

    "Asia/Taipei": "TW",
    "Asia/Hong_Kong": "HK",
    "Asia/Macau": "MO",

    // Common
    "Asia/Tokyo": "JP",
    "Asia/Seoul": "KR",
    "Asia/Singapore": "SG",

    "America/Los_Angeles": "US",
    "America/New_York": "US",

    "Europe/London": "GB",
    "Europe/Paris": "FR",
  };
  return map[tz] || null;
}

function fetchJson<T>(url: string, timeoutMs = 6000): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  return fetch(url, {
    method: "GET",
    credentials: "same-origin",
    signal: ac.signal,
    headers: {
      "accept": "application/json",
    },
  })
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as T;
    })
    .finally(() => clearTimeout(t));
}

export async function getGeoCtx(): Promise<GeoCtx> {
  let p: Profile | null = null;

  try {
    p = await fetchJson<Profile>("/api/profile", 6000);
  } catch {
    // ignore
  }

  const tz =
    (p?.timezone && String(p.timezone)) ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";

  let country =
    (p?.ip_country_id && String(p.ip_country_id).toUpperCase()) || "";

  if (!country) {
    const guessed = guessCountryFromTZ(tz);
    if (guessed) country = guessed;
  }
  if (!country) country = "ZZ";

  // 解析 subdivision：从 "US-CA" / "CN-CQ" 拿到 "CA"/"CQ"
  let state: string | undefined;
  const regionId = p?.ip_region_id ? String(p.ip_region_id) : "";
  if (regionId && regionId.includes("-")) {
    const [cc, sub] = regionId.split("-", 2);
    if (cc.toUpperCase() === country && sub) state = sub.toUpperCase();
  }

  const mainlandCN =
    country === "CN" && !(state === "HK" || state === "MO" || state === "TW");

  const displayArea = state ? `${country}-${state}` : country;

  return { tz, country, state, mainlandCN, displayArea };
}
