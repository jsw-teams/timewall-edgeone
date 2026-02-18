// apps/web/src/calendar/main.ts
import "./calendar.css";

import { getGeoCtx } from "../shared/profile";
import { loadCnHoliday } from "./cn-holidays";
import { loadIntlHolidays } from "./intl-holidays";
import { getLunarInfo } from "./lunar";

// --- 超轻 UI 工具：避免依赖兼容问题 ---
function $id(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as HTMLElement;
}
function setTextSafe(el: HTMLElement, text: string) {
  el.textContent = text ?? "";
}

// --- 时区工具：不依赖其它文件，避免兼容问题 ---
function ymdStr(y: number, m1: number, d: number) {
  const mm = String(m1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function getNowPartsInTZ(tz: string) {
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

// --- 数据结构（尽量宽松，避免和你现有 cn-holidays.ts 不匹配） ---
type CNMark = { kind: "work" | "off"; name: string };
type IntlMark = { kind: "off"; name: string };

type AnyMarks =
  | { kind: "CN"; map: Map<string, CNMark>; source?: string; paper?: string }
  | { kind: "INTL"; map: Map<string, IntlMark>; note?: string };

const weekCN = ["一", "二", "三", "四", "五", "六", "日"];

const state = {
  tz: "UTC",
  area: "ZZ", // 顶部显示：地区：$area
  mainlandCN: false,

  y: 2000,
  m1: 1,
  todayKey: "2000-01-01",
  selectedKey: "2000-01-01",

  // 用于 intl 分支
  country: "ZZ",
  sub: undefined as string | undefined,

  marks: null as AnyMarks | null,
};

function setSourceLine() {
  // ✅ 你要求：只显示“地区：$地区”
  setTextSafe($id("sourceLine"), `地区：${state.area}`);
}

async function loadMarksForYear(year: number) {
  if (state.mainlandCN) {
    // ✅ CN 内地：本地同步的 CN 数据（含调休）
    const cn: any = await loadCnHoliday(year);

    state.marks = {
      kind: "CN",
      map: cn.map as Map<string, CNMark>,
      source: cn.source,
      paper: cn.paper,
    };
  } else {
    // 非内地：date-holidays 本地计算
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

function isMobile() {
  return window.matchMedia("(max-width: 560px)").matches;
}

function updateSelectedCell(key: string) {
  const grid = $id("grid");
  const prev = grid.querySelector(".cell.selected") as HTMLElement | null;
  if (prev) prev.classList.remove("selected");

  const next = grid.querySelector(`.cell[data-key="${key}"]`) as HTMLElement | null;
  if (next) next.classList.add("selected");
}

function showDay(key: string) {
  state.selectedKey = key;
  updateSelectedCell(key);

  const mk = markForDate(key);

  setTextSafe($id("dayTitle"), key);

  const lines: string[] = [];

  // 农历/节气（所有地区）
  const y = Number(key.slice(0, 4));
  const m1 = Number(key.slice(5, 7));
  const d = Number(key.slice(8, 10));
  const li = getLunarInfo(y, m1, d);

  if (li?.jieqi) lines.push(`节气：${li.jieqi}`);
  if (li?.lunarText) lines.push(`农历：${li.lunarText}`);

  // 班/休（含名称）
  if (mk) {
    if (mk.kind === "work") lines.push(`补班：${mk.name}`);
    else lines.push(`休假：${mk.name}`);
  } else {
    lines.push("班休：无");
  }

  setTextSafe($id("dayBody"), lines.join("\n"));

  // 移动端：点完日期把详情面板滚到可见位置（体验更直观）
  if (isMobile()) {
    const panel = document.querySelector(".dayPanel") as HTMLElement | null;
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function render() {
  const grid = $id("grid");
  grid.innerHTML = "";

  // week header
  for (const w of weekCN) {
    const h = document.createElement("div");
    h.className = "headcell";
    h.textContent = w;
    grid.appendChild(h);
  }

  setTextSafe($id("monthTitle"), `${state.y}年${state.m1}月`);

  const firstOffset = dowMonday0(state.y, state.m1, 1);
  const dim = daysInMonth(state.y, state.m1);

  for (let i = 0; i < 42; i++) {
    const day = i - firstOffset + 1;

    const cell = document.createElement("div");
    cell.className = "cell";

    if (day < 1 || day > dim) {
      cell.classList.add("empty");
      grid.appendChild(cell);
      continue;
    }

    const key = ymdStr(state.y, state.m1, day);
    cell.dataset.key = key;

    if (key === state.todayKey) cell.classList.add("today");
    if (key === state.selectedKey) cell.classList.add("selected");

    const top = document.createElement("div");
    top.className = "dayNum";
    top.textContent = String(day);

    const sub = document.createElement("div");
    sub.className = "subline";

    // ✅ 格子里的信息策略：
    // - 桌面：可显示农历/节气 + 班休
    // - 移动：只显示“班/休”标记（名称放到下方详情）
    const mk = markForDate(key);
    const li = getLunarInfo(state.y, state.m1, day);

    // 农历/节气（用 CSS 在移动端隐藏）
    if (li?.jieqi || li?.lunarText) {
      const lunar = document.createElement("span");
      lunar.className = "lunar";
      lunar.textContent = li.jieqi ? li.jieqi : li.lunarText!;
      sub.appendChild(lunar);
    }

    // 班/休 badge（移动端只显示“班/休”，桌面显示“班/休 + 名称”）
    if (mk) {
      const b = document.createElement("span");
      b.className = `badge ${mk.kind === "work" ? "work" : "off"}`;
      b.title = mk.name;

      const kSpan = document.createElement("span");
      kSpan.className = "k";
      kSpan.textContent = mk.kind === "work" ? "班" : "休";

      const nSpan = document.createElement("span");
      nSpan.className = "n";
      nSpan.textContent = ` ${mk.name}`;

      b.appendChild(kSpan);
      b.appendChild(nSpan);
      sub.appendChild(b);
    }

    cell.appendChild(top);
    cell.appendChild(sub);

    cell.addEventListener("click", () => showDay(key));
    grid.appendChild(cell);
  }

  // 渲染完，确保选中态正确
  updateSelectedCell(state.selectedKey);
}

async function goToday() {
  const now = getNowPartsInTZ(state.tz);
  state.y = now.y;
  state.m1 = now.m1;
  state.todayKey = getTodayKeyInTZ(state.tz);
  state.selectedKey = state.todayKey;

  await loadMarksForYear(state.y);
  render();
  showDay(state.todayKey);
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

  const yearChanged = y !== state.y;

  state.y = y;
  state.m1 = m1;

  // 年变化时加载新年的节假日
  if (yearChanged) await loadMarksForYear(state.y);

  // 切换月份后：默认选中“当月今天”（如果今天不在此月，则选中 1 号）
  const today = getNowPartsInTZ(state.tz);
  const inThisMonth = today.y === state.y && today.m1 === state.m1;
  state.selectedKey = inThisMonth ? getTodayKeyInTZ(state.tz) : ymdStr(state.y, state.m1, 1);

  render();
  showDay(state.selectedKey);
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
  state.area = geo.displayArea; // ✅ 顶部“地区：XX”
  state.mainlandCN = geo.mainlandCN;

  // intl 分支需要 country/sub；CN 内地也存一份不影响
  state.country = geo.country;
  state.sub = geo.state;

  const now = getNowPartsInTZ(state.tz);
  state.y = now.y;
  state.m1 = now.m1;
  state.todayKey = getTodayKeyInTZ(state.tz);
  state.selectedKey = state.todayKey;

  await loadMarksForYear(state.y);
  render();

  // 默认展示今天详情
  showDay(state.todayKey);
})();
