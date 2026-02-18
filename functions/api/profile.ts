type Profile = {
  timezone?: string;
  ip_country_en?: string;
  ip_region_en?: string;
  ip_city_en?: string;
  ip_country_id?: string;
  remote_addr?: string;
};

export const onRequestGet: PagesFunction = async ({ request }) => {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    undefined;

  // Cloudflare 的地理信息在 request.cf（字段会因地区/套餐略有差异）
  const cf: any = (request as any).cf || {};

  const body: Profile = {
    remote_addr: ip,
    ip_country_id: cf.country,
    ip_country_en: cf.country, // 若你想英文名可后续做映射表，这里先保持简洁
    ip_region_en: cf.region,
    ip_city_en: cf.city,
    timezone: cf.timezone,
  };

  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};
