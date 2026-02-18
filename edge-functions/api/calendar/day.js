import { handleOptions, withCors } from "../../_lib/cors.js";
import { badRequest, json } from "../../_lib/http.js";
import { isISODate } from "../../_lib/date.js";

import cn2026 from "../../../data/holidays/CN/2026.js";

export function onRequest(context) {
  const opt = handleOptions(context.request);
  if (opt) return opt;

  const url = new URL(context.request.url);
  const date = url.searchParams.get("date");
  const country = String(url.searchParams.get("country") || "").toUpperCase() || null;

  if (!date || !isISODate(date)) {
    return withCors(badRequest("date required in YYYY-MM-DD"), "*");
  }

  // 仅示例：CN 2026 覆盖
  let override = null;
  if (country === "CN" && date.startsWith("2026-")) {
    override = cn2026.overrides[date] || null;
  }

  const resp = json({ ok: true, date, country, override }, { headers: { "Cache-Control": "no-store" } });
  return withCors(resp, "*");
}
