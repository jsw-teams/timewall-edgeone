import { handleOptions, withCors } from "../_lib/cors.js";
import { json } from "../_lib/http.js";

export function onRequest(context) {
  const opt = handleOptions(context.request);
  if (opt) return opt;

  const eo = context.request.eo || {};
  const resp = json(
    {
      ok: true,
      client_ip: eo.clientIp || null,
      uuid: eo.uuid || null,
      geo: eo.geo || null
    },
    { headers: { "Cache-Control": "no-store" } }
  );

  return withCors(resp, "*");
}
