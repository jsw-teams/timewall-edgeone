export function pad2(n: number) { return String(n).padStart(2, "0"); }
export function pad3(n: number) { return String(n).padStart(3, "0"); }

export function formatTime(d: Date, use24h: boolean) {
  let hh = d.getHours();
  let ap = "";
  if (!use24h) {
    ap = hh >= 12 ? " PM" : " AM";
    hh = hh % 12;
    if (hh === 0) hh = 12;
  }
  const mm = d.getMinutes();
  const ss = d.getSeconds();
  const ms = d.getMilliseconds();
  return {
    hms: `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}${ap}`,
    ms: `.${pad3(ms)}`
  };
}

export function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}
