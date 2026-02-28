// functions/api/profile.ts
// 目标：兼容 ESA Pages + Cloudflare Pages
// 统一返回：{ country, timezone }
// 前端只显示国家，不再显示地区/城市

type JsonObj = Record<string, unknown>;

function pickString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string") {
      const s = v.trim();
      if (s) return s;
    }
  }
  return "";
}

function normCountry(v: unknown): string {
  const s = pickString(v).toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : "";
}

function getHeader(req: Request, name: string): string {
  try {
    return req.headers.get(name) || "";
  } catch {
    return "";
  }
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

function readCloudflare(request: Request): { country: string; timezone: string } {
  const anyReq = request as any;
  const cf = (anyReq && anyReq.cf) || {};

  const country = normCountry(
    cf.country,
    getHeader(request, "cf-ipcountry")
  );

  const timezone = pickString(
    cf.timezone
  );

  return { country, timezone };
}

function readESA(request: Request): { country: string; timezone: string } {
  const anyReq = request as any;
  const info: JsonObj = (anyReq && anyReq.info) || {};

  const country = normCountry(
    info.ip_country_id,
    info.ipCountryId,
    info.country,
    info.countryCode,
    info.country_code,
    info.ip_country_code,
    info.ipCountry,
    getHeader(request, "x-country-code"),
    getHeader(request, "x-geo-country"),
    getHeader(request, "x-edge-country")
  );

  const timezone = pickString(
    info.timezone,
    info.timeZone,
    info.tz,
    getHeader(request, "x-timezone"),
    getHeader(request, "x-geo-timezone"),
    getHeader(request, "x-edge-timezone")
  );

  return { country, timezone };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
    },
  });
}

// Cloudflare Pages Functions / 兼容式写法
export async function onRequestGet(context: any): Promise<Response> {
  const request: Request = context.request;

  // 先读 CF，再读 ESA；谁有值用谁
  const fromCF = readCloudflare(request);
  const fromESA = readESA(request);

  let timezone = pickString(fromCF.timezone, fromESA.timezone);
  let country = normCountry(fromCF.country || fromESA.country);

  if (!timezone) {
    timezone = "UTC";
  }

  // 如果没有国家，最后用时区兜底
  if (!country) {
    country = guessCountryFromTZ(timezone) || "ZZ";
  }

  return json({
    country,   // ✅ 前端只需要这个
    timezone,  // ✅ 时钟/日历都可用
  });
}