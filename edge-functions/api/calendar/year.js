import { handleOptions, withCors } from "../../_lib/cors.js";
import { badRequest, json } from "../../_lib/http.js";
import { cacheGet, cachePut } from "../../_lib/cache.js";

import cn2026 from "../../../data/holidays/CN/2026.js";

export async function onRequest(context) {
  const opt = handleOptions(context.request);
  if (opt) return opt;

  const url = new URL(context.request.url);
  const year = Number(url.searchParams.get("year") || "");
  const country = String(url.searchParams.get("country") || "").toUpperCase();

  if (!country || !year) return withCors(badRequest("country/year required"), "*");

  if (country === "CN" && year === 2026) {
    const resp = json({ ok: true, mode: "builtin", data: cn2026 }, { headers: { "Cache-Control": "public, max-age=86400" } });
    return withCors(resp, "*");
  }

  // 其他国家：调用 /api/holidays（复用缓存逻辑）
  const selfUrl = new URL(context.request.url);
  selfUrl.pathname = "/api/holidays";
  selfUrl.searchParams.set("country", country);
  selfUrl.searchParams.set("year", String(year));

  const cacheKey = new Request(selfUrl.toString(), { method: "GET" });
  const hit = await cacheGet(cacheKey);
  if (hit) return withCors(hit, "*");

  const upstream = await fetch(selfUrl.toString());
  const text = await upstream.text();

  const resp = new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=86400"
    }
  });

  await cachePut(cacheKey, resp);
  return withCors(resp, "*");
}
