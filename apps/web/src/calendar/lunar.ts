import { Lunar, Solar } from "lunar-javascript";

export type LunarInfo = {
  lunarText: string;     // 农历显示
  jieqi?: string | null; // 节气
};

export function getLunarInfo(y: number, m: number, d: number): LunarInfo | null {
  try {
    const solar = Solar.fromYmd(y, m, d);
    const lunar: Lunar = solar.getLunar();

    const lunarText = `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
    const jieqi = solar.getJieQi() || null;

    return { lunarText, jieqi };
  } catch {
    return null;
  }
}
