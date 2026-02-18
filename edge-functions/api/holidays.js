import { handleOptions, withCors } from "../_lib/cors.js";
import { badRequest, json } from "../_lib/http.js";
import { cacheGet, cachePut } from "../_lib/cache.js";

import cn2026 from "../../data/holidays/CN/2026.js";

function normalizeCountry(code) {
  return String(code || "").trim().toUpperCase();
}

export async function onRequest(context) {
  const opt = handleOptions(context.request);
  if (opt) return opt;

  const url = new URL(context.request.url);
  const year = Number(url.searchParams.get("year") || "");
  const country = normalizeCountry(url.searchParams.get("country") || url.searchParams.get("cc"));

  if (!country || !year) return withCors(badRequest("country/year required. e.g. ?country=CN&year=2026"), "*");

  // CN：优先内置（演示先放 2026；你可以后续继续加 2027/2028）
  if (country === "CN" && year === 2026) {
    const resp = json({ ok: true, mode: "builtin", data: cn2026 }, { headers: { "Cache-Control": "public, max-age=86400" } });
    return withCors(resp, "*");
  }

  // 其他国家：走 Nager.Date
  // Nager.Date endpoint 说明：/api/v3/PublicHolidays/{Year}/{CountryCode} :contentReference[oaicite:14]{index=14}
  const api = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`;
  const cacheKey = new Request(api, { method: "GET" });

  const hit = await cacheGet(cacheKey);
  if (hit) return withCors(hit, "*");

  const upstream = await fetch(api, {
    headers: { "user-agent": "timewall-edgeone/1.0 (+edgeone pages)" }
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    const resp = json(
      { ok: false, error: "upstream_failed", status: upstream.status, message: "Nager.Date request failed", body: errText.slice(0, 400) },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
    return withCors(resp, "*");
  }

  const arr = await upstream.json();

  // 统一成你自己前端更好用的结构
  const normalized = arr.map((h) => ({
    date: h.date,          // YYYY-MM-DD
    localName: h.localName,
    name: h.name,
    countryCode: h.countryCode,
    global: h.global,
    counties: h.counties || null,
    types: h.types || []
  }));

  const resp = json(
    { ok: true, mode: "nager", data: { country, year, holidays: normalized } },
    { headers: { "Cache-Control": "public, max-age=86400" } }
  );

  await cachePut(cacheKey, resp);
  return withCors(resp, "*");
}
