import { fetchJson } from "./net";

export type Profile = {
  timezone?: string;
  ip_country_id?: string; // e.g. "US", "CN"
  ip_region_id?: string;  // e.g. "US-CA", "CN-CQ"
  ip_country_en?: string;
  ip_region_en?: string;
  ip_city_en?: string;
};

export type GeoCtx = {
  tz: string;         // IANA timezone, e.g. "America/Los_Angeles"
  country: string;    // ISO 3166-1 alpha-2, e.g. "US"
  state?: string;     // subdivision (when available), e.g. "CA"
  countryName?: string;
  regionName?: string;
  cityName?: string;
  mainlandCN: boolean;
};

export async function getGeoCtx(): Promise<GeoCtx> {
  let p: Profile | null = null;

  try {
    p = await fetchJson<Profile>("/api/profile", undefined, 6000);
  } catch {
    // ignore
  }

  const tz =
    (p?.timezone && String(p.timezone)) ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";

  const country =
    (p?.ip_country_id && String(p.ip_country_id).toUpperCase()) || "ZZ";

  // 从 "US-CA" 解析出州/省码 "CA"
  let state: string | undefined;
  const regionId = p?.ip_region_id ? String(p.ip_region_id) : "";
  if (regionId && regionId.includes("-")) {
    const [cc, sub] = regionId.split("-", 2);
    if (cc.toUpperCase() === country && sub) state = sub.toUpperCase();
  }

  const mainlandCN =
    country === "CN" &&
    !(state === "HK" || state === "MO" || state === "TW"); // 简单区分：港澳台按非内地处理

  return {
    tz,
    country,
    state,
    countryName: p?.ip_country_en,
    regionName: p?.ip_region_en,
    cityName: p?.ip_city_en,
    mainlandCN,
  };
}
