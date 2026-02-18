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

function isMobileView() {
  // 你也可以按自己 CSS 断点调整
  return window.matchMedia("(max-width: 520px)").matches;
}

const state = {
  tz: "UTC",
  area: "ZZ", // 顶部显示：地区：$area
  mainlandCN: false,

  y: 2000,
  m1: 1,
  todayKey: "2000-01-01",

  // 用于 intl 分支
  country: "ZZ",
  sub: undefined as string | undefined,

  marks: null as AnyMarks | null,

  // ✅ 新增：移动端模式（网格只显示“班/休”）
  mobile: false,
};

function setSourceLine() {
  // ✅ 你要求：只显示“地区：$地区”
  setTextSafe($id("sourceLine"), `地区：${state.area}`);
}

async function loadMarksForYear(year: number) {
  if (state.mainlandCN) {
    // ✅ CN 内地：本地同步的 CN 数据（含调休）
    const cn: any = await loadCnHoliday(year);

    // 兼容 cn-holidays.ts 返回结构：只要 cn.map 是 Map<YYYY-MM-DD, {kind,name}>
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

function showDay(key: string) {
  const mk = markForDate(key);

  setTextSafe($id("dayTitle"), key);

  const lines: string[] = [];

  // 农历/节气（所有地区都显示在详情里）
  const y = Number(key.slice(0, 4));
  const m1 = Number(key.slice(5, 7));
  const d = Number(key.slice(8, 10));
  const li = getLunarInfo(y, m1, d);

  if (li?.lunarText) lines.push(`农历：${li.lunarText}`);
  if (li?.jieqi) lines.push(`节气：${li.jieqi}`);

  // 班休详情（完整名称，解决“文字多显示不全”）
  if (mk) {
    if (mk.kind === "work") {
      lines.push(`班休：班（调休补班）`);
      lines.push(`名称：${mk.name}`);
    } else {
      lines.push(`班休：休（节假日）`);
      lines.push(`名称：${mk.name}`);
    }
  } else {
    lines.push(`班休：无`);
  }

  if (!lines.length) lines.push("（无额外信息）");
  setTextSafe($id("dayBody"), lines.join("\n"));
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
      cell.setAttribute("aria-hidden", "true");
      grid.appendChild(cell);
      continue;
    }

    const key = ymdStr(state.y, state.m1, day);
    if (key === state.todayKey) cell.classList.add("today");

    // 顶部日期数字
    const top = document.createElement("div");
    top.className = "dayNum";
    top.textContent = String(day);

    const sub = document.createElement("div");
    sub.className = "subline";

    // ✅ 移动端：网格不显示农历/节气（只在详情里显示）
    if (!state.mobile) {
      const li = getLunarInfo(state.y, state.m1, day);
      if (li?.jieqi) {
        const b = document.createElement("span");
        b.className = "badge meta";
        b.textContent = li.jieqi;
        sub.appendChild(b);
      } else if (li?.lunarText) {
        const t = document.createElement("span");
        t.className = "metaText";
        t.textContent = li.lunarText;
        sub.appendChild(t);
      }
    }

    // 节假日 / 调休（移动端只显示“班/休”，详情里显示完整名称）
    const mk = markForDate(key);
    if (mk) {
      const b = document.createElement("span");
      if (mk.kind === "work") {
        b.className = "badge work mark";
        b.textContent = state.mobile ? "班" : `班 ${mk.name}`;
      } else {
        b.className = "badge off mark";
        b.textContent = state.mobile ? "休" : `休 ${mk.name}`;
      }
      // 桌面 hover 可看全称；移动端也不影响
      b.title = mk.name;
      sub.appendChild(b);

      // 让可访问性更稳
      cell.setAttribute(
        "aria-label",
        `${key}，${mk.kind === "work" ? "补班" : "休假"}：${mk.name}`
      );
    } else {
      cell.setAttribute("aria-label", key);
    }

    cell.appendChild(top);
    cell.appendChild(sub);

    cell.addEventListener("click", () => showDay(key));
    grid.appendChild(cell);
  }
}

async function goToday() {
  const now = getNowPartsInTZ(state.tz);
  state.y = now.y;
  state.m1 = now.m1;
  state.todayKey = getTodayKeyInTZ(state.tz);

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

  render();
}

function bindNav() {
  $id("prevBtn").addEventListener("click", () => navMonth(-1));
  $id("nextBtn").addEventListener("click", () => navMonth(+1));
  $id("todayBtn").addEventListener("click", () => goToday());
}

function bindResponsive() {
  // ✅ 当从横屏/竖屏切换导致断点跨越时，重渲染
  const mq = window.matchMedia("(max-width: 520px)");
  const onChange = () => {
    const m = mq.matches;
    if (m !== state.mobile) {
      state.mobile = m;
      render();
      // 不打断用户：保持当前 dayPanel 内容；若为空则补一次 today
      const title = ($id("dayTitle").textContent || "").trim();
      if (!title || title === "选择一个日期") showDay(state.todayKey);
    }
  };

  // 兼容不同浏览器实现
  if ("addEventListener" in mq) {
    mq.addEventListener("change", onChange);
  } else {
    (mq as any).addListener?.(onChange);
  }

  // 兜底：某些环境不触发 change，就用 resize 兜底
  window.addEventListener("resize", onChange, { passive: true });
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

  state.mobile = isMobileView();
  bindResponsive();

  const now = getNowPartsInTZ(state.tz);
  state.y = now.y;
  state.m1 = now.m1;
  state.todayKey = getTodayKeyInTZ(state.tz);

  await loadMarksForYear(state.y);
  render();

  // 默认展示今天详情（移动端也能立刻看到农历/班休明细）
  showDay(state.todayKey);
})();
