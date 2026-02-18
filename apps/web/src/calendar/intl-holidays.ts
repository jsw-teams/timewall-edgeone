// apps/web/src/calendar/intl-holidays.ts
// 非中国内地的节假日：使用 date-holidays 本地计算（无需远程 API）
// 注意：date-holidays 并非覆盖所有国家/地区；不支持时会返回空 map + note。

import HolidaysPkg from "date-holidays";

export type IntlHolidayMarks = {
  year: number;
  source: "date-holidays";
  country: string;
  state?: string;
  map: Map<string, { kind: "off"; name: string }>; // YYYY-MM-DD -> holiday
  note?: string; // 失败/不支持信息
};

function getCtor(): any {
  // 兼容 CJS/ESM
  return (HolidaysPkg as any).default ?? (HolidaysPkg as any);
}

export async function loadIntlHolidays(
  year: number,
  country: string,
  state?: string
): Promise<IntlHolidayMarks> {
  const map = new Map<string, { kind: "off"; name: string }>();

  // country 不可用时直接返回空
  if (!country || country === "ZZ") {
    return {
      year,
      source: "date-holidays",
      country: country || "ZZ",
      state,
      map,
      note: "未知地区（country=ZZ），跳过节假日计算",
    };
  }

  try {
    const Holidays = getCtor();
    const hd = state ? new Holidays(country, state) : new Holidays(country);

    const list: any[] = hd.getHolidays(year) || [];

    for (const h of list) {
      // h.date 常见格式："2026-07-04 00:00:00"
      const key = String(h.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;

      // 只保留更“像假日”的类型
      const type = String(h.type || "");
      if (type && !["public", "bank", "school"].includes(type)) continue;

      const name = String(h.name || "Holiday");

      // 同一天多条：合并
      if (map.has(key)) {
        map.set(key, { kind: "off", name: `${map.get(key)!.name} / ${name}` });
      } else {
        map.set(key, { kind: "off", name });
      }
    }

    return { year, source: "date-holidays", country, state, map };
  } catch (e) {
    return {
      year,
      source: "date-holidays",
      country,
      state,
      map,
      note: `date-holidays 不支持或初始化失败：${String(e)}`,
    };
  }
}
