import "./calendar.css";
import { $id, setTextSafe } from "../shared/ui";
import { getGeoCtx } from "../shared/profile";
import { daysInMonth, dowMonday0, getNowPartsInTZ, getTodayKeyInTZ, ymdStr } from "../shared/tz";

import { loadCnHoliday, HolidayMarks } from "./cn-holidays";
import { getLunarInfo } from "./lunar";
import { loadIntlHolidays, IntlHolidayMarks } from "./intl-holidays";

const weekCN = ["一", "二", "三", "四", "五", "六", "日"];

type AnyMarks =
  | ({ kind: "CN" } & HolidayMarks)
  | ({ kind: "INTL" } & IntlHolidayMarks);

type State = {
  tz: string;
  country: string;
  state?: string;
  mainlandCN: boolean;

  y: number;   // 当前显示年份
  m1: number;  // 当前显示月份 1..12

  todayKey: string; // tz 下的今天 YYYY-MM-DD
  marks?: AnyMarks;
};

const state: State = {
  tz: "UTC",
  country: "ZZ",
  y: 2000,
  m1: 1,
  todayKey: "2000-01-01",
  mainlandCN: false,
};

function sourceText(m: AnyMarks) {
  if (m.kind === "CN") {
    const src = m.source === "local" ? "CN（本地同步）" : "CN（远程 fallback）";
    const paper = (m as any).paper ? `｜国务院来源：${(m as any).paper}` : "";
    return `地区：${src}（含农历/节气/调休）${paper}`;
  }
  // 非 CN：本地计算节假日
  const area = m.state ? `${m.country}-${m.state}` : m.country;
  const note = m.note ? `｜${m.note}` : "";
  return `地区：${area}（时区：${state.tz}）｜节假日：date-holidays（本地计算）${note}`;
}

async function loadMarksForYear(y: number) {
  if (state.mainlandCN) {
    const cn = await loadCnHoliday(y);
    state.marks = { kind: "CN", ...cn } as AnyMarks;
  } else {
    const intl = await loadIntlHolidays(y, state.country, state.state);
    state.marks = { kind: "INTL", ...intl } as AnyMarks;
  }
  setTextSafe($id("sourceLine"), sourceText(state.marks!));
}

function markForDate(key: string) {
  if (!state.marks) return null;

  if (state.marks.kind === "CN") {
    const m = (state.marks as any).map.get(key);
    if (!m) return null;
    return m.kind === "work"
      ? { kind: "work" as const, name: m.name }
      : { kind: "off" as const, name: m.name };
  } else {
    const m = (state.marks as any).map.get(key);
    if (!m) return null;
    return { kind: "off" as const, name: m.name };
  }
}

function render() {
  const grid = $id("grid");
  grid.innerHTML = "";

  for (const w of weekCN) {
    const h = document.createElement("div");
    h.className = "headcell";
    h.textContent = w;
    grid.appendChild(h);
  }

  setTextSafe($id("monthTitle"), `${state.y}年${state.m1}月`);

  const firstOffset = dowMonday0(state.y, state.m1, 1); // Monday=0..6
  const dim = daysInMonth(state.y, state.m1);

  for (let i = 0; i < 42; i++) {
    const day = i - firstOffset + 1;

    const cell = document.createElement("div");
    cell.className = "cell";

    if (day < 1 || day > dim) {
      cell.style.opacity = "0.35";
      cell.style.cursor = "default";
      grid.appendChild(cell);
      continue;
    }

    const key = ymdStr(state.y, state.m1, day);

    if (key === state.todayKey) cell.classList.add("today");

    const top = document.createElement("div");
    top.className = "dayNum";
    top.textContent = String(day);

    const sub = document.createElement("div");
    sub.className = "subline";

    // CN 才显示农历/节气
    if (state.mainlandCN) {
      const li = getLunarInfo(state.y, state.m1, day);
      if (li?.jieqi) {
        const b = document.createElement("span");
        b.className = "badge";
        b.textContent = li.jieqi;
        sub.appendChild(b);
      } else if (li?.lunarText) {
        const t = document.createElement("span");
        t.textContent = li.lunarText;
        sub.appendChild(t);
      }
    }

    const mk = markForDate(key);
    if (mk) {
      const b = document.createElement("span");
      if (mk.kind === "work") {
        b.className = "badge work";
        b.textContent = `班 ${mk.name}`;
      } else {
        b.className = "badge off";
        b.textContent = `休 ${mk.name}`;
      }
      sub.appendChild(b);
    }

    cell.appendChild(top);
    cell.appendChild(sub);

    cell.addEventListener("click", () => showDay(key, mk));
    grid.appendChild(cell);
  }
}

function showDay(key: string, mk: { kind: "off" | "work"; name: string } | null) {
  setTextSafe($id("dayTitle"), key);

  const lines: string[] = [];
  if (mk) lines.push(mk.kind === "off" ? `节假日：${mk.name}` : `调休补班：${mk.name}`);
  if (!lines.length) lines.push("（无额外信息）");

  setTextSafe($id("dayBody"), lines.join("\n"));
}

async function goToday() {
  const { y, m1 } = getNowPartsInTZ(state.tz);
  state.y = y;
  state.m1 = m1;
  state.todayKey = getTodayKeyInTZ(state.tz);
  await loadMarksForYear(state.y);
  render();
}

async function navMonth(delta: number) {
  let y = state.y;
  let m1 = state.m1 + delta;
  if (m1 < 1) {
    m1 = 12;
    y -= 1;
  } else if (m1 > 12) {
    m1 = 1;
    y += 1;
  }
  state.y = y;
  state.m1 = m1;

  // 年变化时重新加载该年的节假日
  await loadMarksForYear(state.y);
  render();
}

function bindNav() {
  $id("prevBtn").addEventListener("click", () => navMonth(-1));
  $id("nextBtn").addEventListener("click", () => navMonth(+1));
  $id("todayBtn").addEventListener("click", () => goToday());
}

(async () => {
  bindNav();

  const geo = await getGeoCtx();
  state.tz = geo.tz;
  state.country = geo.country;
  state.state = geo.state;
  state.mainlandCN = geo.mainlandCN;

  // 关键：按“所在地时区”的今天决定默认月份
  const now = getNowPartsInTZ(state.tz);
  state.y = now.y;
  state.m1 = now.m1;
  state.todayKey = getTodayKeyInTZ(state.tz);

  await loadMarksForYear(state.y);
  render();
})();
