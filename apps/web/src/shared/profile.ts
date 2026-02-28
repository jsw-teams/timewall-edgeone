// apps/web/src/shared/profile.ts
// 目标：前端统一只显示国家，不显示省/州/城市。
// 兼容 ESA / CF / 旧字段名。

export type Profile = {
  timezone?: string;
  country?: string;

  // 兼容旧字段
  ip_country_id?: string;
  countryCode?: string;
  country_code?: string;
};

export type GeoCtx = {
  tz: string;          // IANA timezone
  country: string;     // ISO2 or "ZZ"
  mainlandCN: boolean; // 仅中国大陆
  displayArea: string; // 只显示国家，如 "CN" / "TW"
};

function normCountry(v?: string): string {
  const s = String(v || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : "";
}

function guessCountryFromTZ(tz: string): string {
  const map: Record<string, string> = {
    "Asia/Shanghai": "CN",
    "Asia/Beijing": "CN",
    "Asia/Chongqing": "CN",
    "Asia/Urumqi": "CN",

    "Asia/Taipei": "TW",
    "Asia/Hong_Kong": "HK",
    "Asia/Macau": "MO",

    "Asia/Tokyo": "JP",
    "Asia/Seoul": "KR",
    "Asia/Singapore": "SG",

    "America/Los_Angeles": "US",
    "America/New_York": "US",
    "America/Chicago": "US",

    "Europe/London": "GB",
    "Europe/Paris": "FR",
    "Europe/Berlin": "DE",
  };
  return map[tz] || "";
}

function fetchJson<T>(url: string, timeoutMs = 6000): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);

  return fetch(url, {
    method: "GET",
    credentials: "same-origin",
    signal: ac.signal,
    headers: {
      accept: "application/json",
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
    (p?.timezone && String(p.timezone).trim()) ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";

  let country =
    normCountry(p?.country) ||
    normCountry(p?.ip_country_id) ||
    normCountry(p?.countryCode) ||
    normCountry(p?.country_code);

  if (!country) {
    country = guessCountryFromTZ(tz);
  }
  if (!country) {
    country = "ZZ";
  }

  return {
    tz,
    country,
    mainlandCN: country === "CN",
    displayArea: country, // ✅ 只显示国家
  };
}