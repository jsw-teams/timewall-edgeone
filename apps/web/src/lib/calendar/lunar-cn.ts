import { Lunar, Solar } from "lunar-javascript";

export function getCnLunarInfo(date: Date) {
  const solar = Solar.fromDate(date);
  const lunar = Lunar.fromDate(date);

  const lunarText =
    `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`; // 如：正月初一

  const jieqi = solar.getJieQi(); // 可能为空字符串
  const fest = lunar.getFestivals(); // 农历节日（数组）
  const solarFest = solar.getFestivals(); // 公历节日（数组）

  return {
    lunarText,
    jieqi: jieqi || null,
    lunarFestivals: fest || [],
    solarFestivals: solarFest || []
  };
}
