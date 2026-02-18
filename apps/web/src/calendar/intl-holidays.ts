import HolidaysPkg from "date-holidays";

export type IntlHolidayMarks = {
  year: number;
  source: "date-holidays";
  country: string;
  state?: string;
  map: Map<string, { kind: "off"; name: string }>; // YYYY-MM-DD -> holiday
  note?: string;
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

  try {
    const Holidays = getCtor();
    const hd = state ? new Holidays(country, state) : new Holidays(country);

    const list: any[] = hd.getHolidays(year) || [];
    for (const h of list) {
      // h.date 通常形如 "2026-07-04 00:00:00"
      const key = String(h.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;

      // 只标注公共/银行类假日（你要“节假日安排”）
      const type = String(h.type || "");
      if (type && !["public", "bank", "school"].includes(type)) continue;

      const name = String(h.name || "Holiday");
      // 同一天多个节日：拼接
      if (map.has(key)) map.set(key, { kind: "off", name: `${map.get(key)!.name} / ${name}` });
      else map.set(key, { kind: "off", name });
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
