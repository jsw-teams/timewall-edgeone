// esa-functions/api.js
// 适用：ESA Functions and Pages
// 路由建议：time.jsw.ac.cn/api/*  -> 绑定到这个函数
// 说明：不要开启 bypass（这是直接返回 JSON 的 API）

function pickString(...vals) {
  for (const v of vals) {
    if (typeof v === "string") {
      const s = v.trim();
      if (s) return s;
    }
  }
  return "";
}

function normCountry(...vals) {
  const s = pickString(...vals).toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : "";
}

function getHeader(req, name) {
  try {
    return req.headers.get(name) || "";
  } catch {
    return "";
  }
}

function guessCountryFromTZ(tz) {
  const map = {
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

function readCloudflare(request) {
  const cf = request && request.cf ? request.cf : {};

  const country = normCountry(
    cf.country,
    getHeader(request, "cf-ipcountry")
  );

  const timezone = pickString(cf.timezone);

  return { country, timezone };
}

function readESA(request) {
  // ESA 可能把地理信息挂在 request.info
  const info = request && request.info ? request.info : {};

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

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function normalizePath(pathname) {
  if (!pathname) return "/";
  const p = pathname.replace(/\/+$/, "");
  return p || "/";
}

async function handleRequest(request) {
  const method = String(request.method || "GET").toUpperCase();

  if (method !== "GET" && method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: {
        "allow": "GET, HEAD",
        "cache-control": "no-store",
      },
    });
  }

  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  // /api/now
  if (path === "/api/now") {
    return json({
      server_epoch_ms: Date.now(),
    });
  }

  // /api/profile
  if (path === "/api/profile") {
    const fromCF = readCloudflare(request);
    const fromESA = readESA(request);

    let timezone = pickString(fromCF.timezone, fromESA.timezone);
    let country = normCountry(fromCF.country, fromESA.country);

    if (!timezone) timezone = "UTC";
    if (!country) country = guessCountryFromTZ(timezone) || "ZZ";

    return json({
      country,
      timezone,
    });
  }

  // /api
  if (path === "/api") {
    return json({
      ok: true,
      endpoints: ["/api/now", "/api/profile"],
    });
  }

  return json(
    {
      error: "not_found",
      endpoints: ["/api/now", "/api/profile"],
    },
    404
  );
}

export default {
  async fetch(request) {
    return handleRequest(request);
  },
};