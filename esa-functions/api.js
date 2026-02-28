// esa-functions/api.js
// 说明：
// 1) 将 ESA 路由绑定到 /api/*
// 2) 保持原前端接口不变：
//    - /api/now
//    - /api/profile
// 3) 同时导出 onRequest / onRequestGet，尽量兼容不同运行时的调用习惯

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
  const cf = (request && request.cf) || {};

  const country = normCountry(
    cf.country,
    getHeader(request, "cf-ipcountry")
  );

  const timezone = pickString(
    cf.timezone
  );

  return { country, timezone };
}

function readESA(request, context) {
  // 有些环境挂在 request.info，有些可能挂在 context.info
  const reqInfo = (request && request.info) || {};
  const ctxInfo = (context && context.info) || {};
  const info = Object.assign({}, ctxInfo, reqInfo);

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

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function normalizePath(pathname) {
  if (!pathname) return "/";
  const p = pathname.replace(/\/+$/, "");
  return p || "/";
}

async function handle(context) {
  const request = context && context.request ? context.request : context;

  if (!request || !request.url) {
    return json({ error: "bad_request" }, 400);
  }

  const method = String(request.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: {
        allow: "GET, HEAD",
        "cache-control": "no-store",
      },
    });
  }

  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  // /api/now
  if (path === "/api/now" || path.endsWith("/api/now")) {
    return json({
      server_epoch_ms: Date.now(),
    });
  }

  // /api/profile
  if (path === "/api/profile" || path.endsWith("/api/profile")) {
    const fromCF = readCloudflare(request);
    const fromESA = readESA(request, context);

    let timezone = pickString(fromCF.timezone, fromESA.timezone);
    let country =
      normCountry(fromCF.country) ||
      normCountry(fromESA.country);

    if (!timezone) {
      timezone = "UTC";
    }

    if (!country) {
      country = guessCountryFromTZ(timezone) || "ZZ";
    }

    return json({
      country,
      timezone,
    });
  }

  // 访问 /api 时，给一个简单索引，方便排查
  if (path === "/api" || path.endsWith("/api")) {
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

export async function onRequest(context) {
  return handle(context);
}

export async function onRequestGet(context) {
  return handle(context);
}