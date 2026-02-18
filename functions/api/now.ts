export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({ server_epoch_ms: Date.now() }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};
