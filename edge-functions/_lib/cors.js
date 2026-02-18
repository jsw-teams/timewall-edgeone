export function withCors(resp, origin = "*") {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Vary", "Origin");
  return new Response(resp.body, { status: resp.status, headers });
}

export function handleOptions(request) {
  if (request.method !== "OPTIONS") return null;
  return withCors(new Response(null, { status: 204 }), "*");
}
