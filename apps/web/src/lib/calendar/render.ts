import type { BuiltinCnYear, NagerHoliday, CnOverride } from "./types";
import { getCnLunarInfo } from "./lunar-cn";

export type DayMark = {
  date: string; // YYYY-MM-DD
  sub: string;  // 农历/本地说明
  tag?: { kind: "holiday" | "workday"; text: string };
};

export function monthMatrix(year: number, monthIndex0: number) {
  const first = new Date(year, monthIndex0, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday=0
  const start = new Date(year, monthIndex0, 1 - startDow);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildCnMarks(cn: BuiltinCnYear, year: number, monthIndex0: number): DayMark[] {
  const cells = monthMatrix(year, monthIndex0);
  return cells.map((d) => {
    const date = ymd(d);
    const li = getCnLunarInfo(d);

    const ov: CnOverride | undefined = cn.overrides[date];
    let tag: DayMark["tag"] = undefined;
    if (ov) tag = { kind: ov.type, text: ov.name };

    // 优先展示节气，其次农历日
    const sub =
      li.jieqi ? li.jieqi : li.lunarText;

    return { date, sub, tag };
  });
}

export function buildNagerMarks(holidays: NagerHoliday[], year: number, monthIndex0: number): DayMark[] {
  const cells = monthMatrix(year, monthIndex0);
  const map = new Map<string, NagerHoliday[]>();
  for (const h of holidays) {
    const arr = map.get(h.date) || [];
    arr.push(h);
    map.set(h.date, arr);
  }

  return cells.map((d) => {
    const date = ymd(d);
    const hs = map.get(date) || [];

    const sub = hs.length ? hs[0].localName : "";
    const tag = hs.length ? { kind: "holiday" as const, text: hs[0].name } : undefined;

    return { date, sub, tag };
  });
}
