export function ymdStr(y: number, m1: number, d: number) {
  const mm = String(m1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

export function getNowPartsInTZ(tz: string) {
  // 用 formatToParts 获取 tz 下的年月日
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const y = Number(m.year);
  const mo = Number(m.month);
  const d = Number(m.day);
  return { y, m1: mo, d };
}

export function getTodayKeyInTZ(tz: string) {
  const { y, m1, d } = getNowPartsInTZ(tz);
  return ymdStr(y, m1, d);
}

/**
 * 纯算法算星期几（与时区无关），返回 Monday=0..Sunday=6
 * y: 4位年, m1: 1..12, d: 1..31
 */
export function dowMonday0(y: number, m1: number, d: number) {
  // Sakamoto algorithm: 0=Sunday..6=Saturday
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let yy = y;
  if (m1 < 3) yy -= 1;
  const dowSun0 =
    (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m1 - 1] + d) %
    7;
  return (dowSun0 + 6) % 7;
}

export function daysInMonth(y: number, m1: number) {
  // m1: 1..12
  return new Date(y, m1, 0).getDate();
}
