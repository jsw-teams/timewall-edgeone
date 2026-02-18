import { handleOptions, withCors } from "../_lib/cors.js";
import { json } from "../_lib/http.js";

export function onRequest(context) {
  const opt = handleOptions(context.request);
  if (opt) return opt;

  const now = Date.now();

  // 尽量带一些可观测信息：uuid、ip、geo（若有）
  const eo = context.request.eo || {};
  const geo = eo.geo || null;

  const resp = json(
    {
      ok: true,
      server_epoch_ms: now,
      uuid: eo.uuid || null,
      geo
    },
    {
      headers: {
        // 对时接口建议不要被长缓存；也可以允许短缓存（例如 1s）
        "Cache-Control": "no-store"
      }
    }
  );

  return withCors(resp, "*");
}
