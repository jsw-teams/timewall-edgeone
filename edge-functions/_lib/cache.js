// Edge Functions runtime 支持 Cache API（文档提到会注入 Cache 对象）
function getDefaultCache() {
  // 兼容类似 Cloudflare 的 caches.default
  if (typeof caches !== "undefined" && caches.default) return caches.default;
  return null;
}

export async function cacheGet(keyReq) {
  const c = getDefaultCache();
  if (!c) return null;
  return await c.match(keyReq);
}

export async function cachePut(keyReq, resp) {
  const c = getDefaultCache();
  if (!c) return;
  // 注意：必须 clone，否则 body 会被消费
  await c.put(keyReq, resp.clone());
}
