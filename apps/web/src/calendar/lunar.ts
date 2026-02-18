// apps/web/src/calendar/lunar.ts
// 目标：浏览器端稳定拿到 Solar/Lunar（兼容 CJS/ESM），失败则返回 null

import * as LJ from "lunar-javascript";

export type LunarInfo = {
  lunarText: string;     // 农历显示（如：正月初三）
  jieqi?: string | null; // 节气（如：立春）
};

// 从模块里安全取导出（兼容：LJ.Solar / LJ.default.Solar）
function pickExport<T = any>(name: string): T | null {
  const anyLJ = LJ as any;
  return (anyLJ?.[name] ?? anyLJ?.default?.[name] ?? null) as T | null;
}

export function getLunarInfo(y: number, m: number, d: number): LunarInfo | null {
  try {
    const Solar = pickExport<any>("Solar");
    if (!Solar || typeof Solar.fromYmd !== "function") return null;

    const solar = Solar.fromYmd(y, m, d);
    const lunar = solar.getLunar?.();
    if (!lunar) return null;

    const monthCN = lunar.getMonthInChinese?.();
    const dayCN = lunar.getDayInChinese?.();
    if (!monthCN || !dayCN) return null;

    // 示例：正月初三（如果你更想显示“农历正月初三”，在 UI 层加前缀即可）
    const lunarText = `${monthCN}月${dayCN}`;

    // lunar-javascript：节气通常从 solar 上取
    const jq = typeof solar.getJieQi === "function" ? solar.getJieQi() : null;
    const jieqi = jq || null;

    return { lunarText, jieqi };
  } catch {
    return null;
  }
}
