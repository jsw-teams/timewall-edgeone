import { fetchJson } from "../shared/net";

export type HolidayCN = {
  year: number;
  papers?: string[];
  days: { name: string; date: string; isOffDay: boolean }[];
};

export type HolidayMarks = {
  year: number;
  source: "local" | "remote";
  paper?: string;
  map: Map<string, { kind: "off" | "work"; name: string }>; // YYYY-MM-DD -> mark
};

const REMOTE = (year: number) =>
  `https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`; // README 推荐可用 jsDelivr :contentReference[oaicite:1]{index=1}

export async function loadCnHoliday(year: number): Promise<HolidayMarks> {
  // 优先本地（仓库里由 GitHub Action 同步生成）
  const localUrl = `/data/holidays/CN/${year}.json`;

  try {
    const data = await fetchJson<HolidayCN>(localUrl, undefined, 5000);
    return toMarks(data, "local");
  } catch {
    // 本地没有就 fallback 到远程
    const data = await fetchJson<HolidayCN>(REMOTE(year), undefined, 8000);
    return toMarks(data, "remote");
  }
}

function toMarks(data: HolidayCN, source: "local" | "remote"): HolidayMarks {
  const map = new Map<string, { kind: "off" | "work"; name: string }>();
  for (const d of data.days || []) {
    map.set(d.date, { kind: d.isOffDay ? "off" : "work", name: d.name });
  }
  return { year: data.year, source, paper: data.papers?.[0], map };
}
