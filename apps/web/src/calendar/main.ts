// apps/web/src/calendar/main.ts
import "./calendar.css";

import { getGeoCtx } from "../shared/profile";
import { loadCnHoliday } from "./cn-holidays";
import { loadIntlHolidays } from "./intl-holidays";
import { getLunarInfo } from "./lunar";

function $id(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as HTMLElement;
}
function setTextSafe(el: HTMLElement, text: string) {
  el.textContent = text ?? "";
}

function ymdStr(y: number, m1: number, d: number) {
  const mm = String(m1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
function parseKey(key: string) {
  return {
    y: Number(key.slice(0, 4)),
    m1: Number(key.slice(5, 7)),
    d: Number(key.slice(8, 10)),
  };
}
function getNowPartsInTZ(tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { y: Number(m.year), m1: Number(m.month), d: Number(m.day) };
}
function getTodayKeyInTZ(tz: string) {
  const { y, m1, d } = getNowPartsInTZ(tz);
  return ymdStr(y, m1, d);
}
// Monday=0..Sunday=6
function dowMonday0(y: number, m1: number, d: number) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let yy = y;
  if (m1 < 3) yy -= 1;
  const dowSun0 =
    (yy +
      Math.floor(yy / 4) -
      Math.floor(yy / 100) +
      Math.floor(yy / 400) +
      t[m1 - 1] +
      d) %
    7;
  return (dowSun0 + 6) % 7;
}
function daysInMonth(y: number, m1: number) {
  return new Date(y, m1, 0).getDate();
}
// 键盘导航用 UTC 加减天，避免 DST 干扰
function addDaysUTC(y: number, m1: number, d: number, delta: number) {
  const dt = new Date(Date.UTC(y, m1 - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return { y: dt.getUTCFullYear(), m1: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

type CNMark = { kind: "work" | "off"; name: string };
type IntlMark = { kind: "off"; name: string };
type AnyMarks =
  | { kind: "CN"; map: Map<string, CNMark>; source?: string; paper?: string }
  | { kind: "INTL"; map: Map<string, IntlMark>; note?: string };

const weekCN = ["一", "二", "三", "四", "五", "六", "日"];

const state = {
  tz: "UTC",
  area: "ZZ",
  mainlandCN: false,

  y: 2000,
  m1: 1,
  todayKey: "2000-01-01",
  selectedKey: "2000-01-01",

  country: "ZZ",
  sub: undefined as string | undefined,

  marks: null as AnyMarks | null,
};

function setSourceLine() {
  setTextSafe($id("sourceLine"), `地区：${state.area}`);
}

async function loadMarksForYear(year: number) {
  if (state.mainlandCN) {
    const cn: any = await loadCnHoliday(year);
    state.marks = {
      kind: "CN",
      map: cn.map as Map<string, CNMark>,
      source: cn.source,
      paper: cn.paper,
    };
  } else {
    const intl = await loadIntlHolidays(year, state.country, state.sub);
    state.marks = { kind: "INTL", map: intl.map, note: intl.note };
  }
  setSourceLine();
}

function markForDate(key: string): { kind: "work" | "off"; name: string } | null {
  if (!state.marks) return null;
  const m = (state.marks as any).map.get(key);
  if (!m) return null;
  return { kind: m.kind, name: m.name };
}

function weekdayLabel(y: number, m1: number, d: number) {
  return weekCN[dowMonday0(y, m1, d)];
}

function getDayCells(): HTMLButtonElement[] {
  const grid = $id("grid");
  const btns = Array.from(grid.querySelectorAll("button.cell")) as HTMLButtonElement[];
  if (btns.length !== 42) throw new Error(`Expected 42 day cells, got ${btns.length}`);
  return btns;
}

function clearSubline(sub: HTMLElement) {
  sub.innerHTML = "";
}

function buildCellAriaLabel(key: string) {
  const { y, m1, d } = parseKey(key);
  const wk = weekdayLabel(y, m1, d);
  const mk = markForDate(key);
  const li = getLunarInfo(y, m1, d);

  const parts: string[] = [];
  parts.push(`${key} 星期${wk}`);
  if (li?.jieqi) parts.push(`节气 ${li.jieqi}`);
  if (li?.lunarText) parts.push(`农历 ${li.lunarText}`);
  if (mk) parts.push(mk.kind === "work" ? `补班 ${mk.name}` : `休假 ${mk.name}`);
  else parts.push("班休 无");
  return parts.join("，");
}

function setDetailsPlaceholder(key: string) {
  setTextSafe($id("dayTitle"), key);
  // ✅ 默认“班休：无”
  setTextSafe($id("dayBody"), "星期：—\n农历：—\n班休：无");
}

function updateSelectedCell(nextKey: string, focus = false) {
  const grid = $id("grid");
  const prev = grid.querySelector(`button.cell.selected`) as HTMLButtonElement | null;
  if (prev) {
    prev.classList.remove("selected");
    prev.setAttribute("aria-selected", "false");
  }
  const next = grid.querySelector(`button.cell[data-key="${nextKey}"]`) as HTMLButtonElement | null;
  if (next) {
    next.classList.add("selected");
    next.setAttribute("aria-selected", "true");
    if (focus) next.focus();
  }
}

async function ensureMonthVisibleAndSelect(nextKey: string, focus = true) {
  const { y, m1 } = parseKey(nextKey);
  const yearChanged = y !== state.y;

  if (y !== state.y || m1 !== state.m1) {
    state.y = y;
    state.m1 = m1;
    if (yearChanged) await loadMarksForYear(state.y);
    renderIntoSkeleton();
  }
  showDay(nextKey, focus);
}

function onCellKeyDown(e: KeyboardEvent, key: string) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    showDay(key, true);
    return;
  }

  let delta = 0;
  if (e.key === "ArrowLeft") delta = -1;
  else if (e.key === "ArrowRight") delta = 1;
  else if (e.key === "ArrowUp") delta = -7;
  else if (e.key === "ArrowDown") delta = 7;
  else return;

  e.preventDefault();

  const { y, m1, d } = parseKey(key);
  const next = addDaysUTC(y, m1, d, delta);
  const nextKey = ymdStr(next.y, next.m1, next.d);
  void ensureMonthVisibleAndSelect(nextKey, true);
}

function showDay(key: string, fromKeyboard = false) {
  state.selectedKey = key;
  updateSelectedCell(key, fromKeyboard);

  const { y, m1, d } = parseKey(key);
  const wk = weekdayLabel(y, m1, d);

  const mk = markForDate(key);
  const li = getLunarInfo(y, m1, d);

  setTextSafe($id("dayTitle"), key);

  const lunarLine = `农历：${li?.jieqi ? li.jieqi : (li?.lunarText ?? "—")}`;

  // ✅ 无班休 -> 班休：无
  const planLine = mk
    ? (mk.kind === "work" ? `班休：班（${mk.name}）` : `班休：休（${mk.name}）`)
    : "班休：无";

  setTextSafe($id("dayBody"), `星期：${wk}\n${lunarLine}\n${planLine}`);
}

function renderIntoSkeleton() {
  setTextSafe($id("monthTitle"), `${state.y}年${state.m1}月`);
  setSourceLine();

  const cells = getDayCells();
  const firstOffset = dowMonday0(state.y, state.m1, 1);
  const dim = daysInMonth(state.y, state.m1);

  // 若选中日期不在本月，落到 1 号
  {
    const sk = parseKey(state.selectedKey);
    const inMonth = sk.y === state.y && sk.m1 === state.m1 && sk.d >= 1 && sk.d <= dim;
    if (!inMonth) state.selectedKey = ymdStr(state.y, state.m1, 1);
  }

  for (let i = 0; i < 42; i++) {
    const btn = cells[i];

    btn.classList.remove("today", "selected", "skel");
    btn.removeAttribute("aria-current");
    btn.removeAttribute("data-key");
    btn.setAttribute("aria-selected", "false");
    btn.disabled = true;

    const day = i - firstOffset + 1;

    const dayNum = btn.querySelector(".dayNum") as HTMLElement | null;
    const sub = btn.querySelector(".subline") as HTMLElement | null;
    if (!dayNum || !sub) continue;

    clearSubline(sub);

    if (day < 1 || day > dim) {
      dayNum.innerHTML = "&nbsp;";
      // ✅ 空格子：只放透明 ghost 占位，不出现灰条
      const g = document.createElement("span");
      g.className = "ghost";
      sub.appendChild(g);
      continue;
    }

    const key = ymdStr(state.y, state.m1, day);
    btn.dataset.key = key;
    btn.disabled = false;

    dayNum.textContent = String(day);

    // 农历/节气（短文本）
    const li = getLunarInfo(state.y, state.m1, day);
    if (li?.jieqi || li?.lunarText) {
      const lunar = document.createElement("span");
      lunar.className = "lunar";
      lunar.textContent = li.jieqi ? li.jieqi : li.lunarText!;
      sub.appendChild(lunar);
    } else {
      const g = document.createElement("span");
      g.className = "ghost";
      sub.appendChild(g);
    }

    // ✅ 班/休：永远只显示“班/休”，不显示长名称
    const mk = markForDate(key);
    if (mk) {
      const b = document.createElement("span");
      b.className = `badge ${mk.kind === "work" ? "work" : "off"}`;
      b.title = mk.name; // 鼠标悬停可看

      const kSpan = document.createElement("span");
      kSpan.className = "k";
      kSpan.textContent = mk.kind === "work" ? "班" : "休";

      const nSpan = document.createElement("span");
      nSpan.className = "n";
      nSpan.textContent = ` ${mk.name}`; // 被 CSS 隐藏，但保留可读性/未来可开

      b.appendChild(kSpan);
      b.appendChild(nSpan);
      sub.appendChild(b);
    } else {
      // ✅ 没有班休：不显示 badge，只占位（透明）
      const g = document.createElement("span");
      g.className = "ghost";
      sub.appendChild(g);
    }

    btn.setAttribute("role", "gridcell");
    btn.setAttribute("aria-label", buildCellAriaLabel(key));
    btn.setAttribute("aria-selected", key === state.selectedKey ? "true" : "false");

    if (key === state.todayKey) {
      btn.classList.add("today");
      btn.setAttribute("aria-current", "date");
    }
    if (key === state.selectedKey) btn.classList.add("selected");

    btn.onclick = () => showDay(key, false);
    btn.onkeydown = (e) => onCellKeyDown(e as KeyboardEvent, key);
  }

  updateSelectedCell(state.selectedKey, false);
}

async function goToday() {
  const now = getNowPartsInTZ(state.tz);
  state.y = now.y;
  state.m1 = now.m1;
  state.todayKey = getTodayKeyInTZ(state.tz);
  state.selectedKey = state.todayKey;

  setDetailsPlaceholder(state.todayKey);
  await loadMarksForYear(state.y);
  renderIntoSkeleton();
  showDay(state.todayKey, false);
}

async function navMonth(delta: number) {
  let y = state.y;
  let m1 = state.m1 + delta;

  if (m1 < 1) { m1 = 12; y -= 1; }
  else if (m1 > 12) { m1 = 1; y += 1; }

  const yearChanged = y !== state.y;
  state.y = y;
  state.m1 = m1;

  state.selectedKey = ymdStr(state.y, state.m1, 1);
  setDetailsPlaceholder(state.selectedKey);

  if (yearChanged) await loadMarksForYear(state.y);
  renderIntoSkeleton();
  showDay(state.selectedKey, false);
}

function bindNav() {
  $id("prevBtn").addEventListener("click", () => void navMonth(-1));
  $id("nextBtn").addEventListener("click", () => void navMonth(+1));
  $id("todayBtn").addEventListener("click", () => void goToday());
}

(async () => {
  bindNav();

  // 先快速骨架：不空白、不偏移
  state.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  {
    const now = getNowPartsInTZ(state.tz);
    state.y = now.y;
    state.m1 = now.m1;
    state.todayKey = getTodayKeyInTZ(state.tz);
    state.selectedKey = state.todayKey;
    state.area = "--";
    setSourceLine();
    setDetailsPlaceholder(state.todayKey);
    renderIntoSkeleton();
  }

  // 再加载 geo + 假期数据
  const geo = await getGeoCtx();

  state.tz = geo.tz;
  state.area = geo.displayArea;
  state.mainlandCN = geo.mainlandCN;
  state.country = geo.country;
  state.sub = geo.state;

  const now = getNowPartsInTZ(state.tz);
  state.y = now.y;
  state.m1 = now.m1;
  state.todayKey = getTodayKeyInTZ(state.tz);
  state.selectedKey = state.todayKey;

  setDetailsPlaceholder(state.todayKey);
  await loadMarksForYear(state.y);
  renderIntoSkeleton();
  showDay(state.todayKey, false);
})();
