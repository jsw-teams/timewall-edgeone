export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function badRequest(message, extra = {}) {
  return json({ ok: false, error: "bad_request", message, ...extra }, { status: 400 });
}

export function notFound(message = "not_found") {
  return json({ ok: false, error: "not_found", message }, { status: 404 });
}
