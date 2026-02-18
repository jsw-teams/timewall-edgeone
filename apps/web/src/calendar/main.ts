import "./calendar.css";
import { $id, setTextSafe } from "../shared/ui";
import { loadCnHoliday, HolidayMarks } from "./cn-holidays";
import { getLunarInfo } from "./lunar";

const weekCN = ["一", "二", "三", "四", "五", "六", "日"];

type State = { y: number; m0: number; marks?: HolidayMarks };

const state: State = (() => {
  const d = new Date();
  return { y: d.getFullYear(), m0: d.getMonth() };
})();

function setPill(text: string) {
  setTextSafe($id("dataPill"), text);
}

function ymd(y:number,m0:number,d:number){
  const mm = String(m0+1).padStart(2,"0");
  const dd = String(d).padStart(2,"0");
  return `${y}-${mm}-${dd}`;
}

function daysInMonth(y:number,m0:number){
  return new Date(y, m0+1, 0).getDate();
}

function firstDowMonday0(y:number,m0:number){
  // JS getDay(): Sun=0..Sat=6
  // 转成 Mon=0..Sun=6
  const dow = new Date(y, m0, 1).getDay();
  return (dow + 6) % 7;
}

function monthLabel(y:number,m0:number){
  return `${y}年${m0+1}月`;
}

function render() {
  const grid = $id("grid");
  grid.innerHTML = "";

  // header row
  for (const w of weekCN) {
    const h = document.createElement("div");
    h.className = "headcell";
    h.textContent = w;
    grid.appendChild(h);
  }

  const y = state.y, m0 = state.m0;
  setTextSafe($id("monthTitle"), monthLabel(y, m0));

  const offset = firstDowMonday0(y, m0);
  const dim = daysInMonth(y, m0);

  // 填充 6 周 * 7 列（42格）
  for (let i = 0; i < 42; i++) {
    const day = i - offset + 1;
    const cell = document.createElement("div");
    cell.className = "cell";

    if (day < 1 || day > dim) {
      cell.style.opacity = "0.35";
      cell.style.cursor = "default";
      grid.appendChild(cell);
      continue;
    }

    const dateKey = ymd(y, m0, day);
    const top = document.createElement("div");
    top.className = "dayNum";
    top.textContent = String(day);

    const sub = document.createElement("div");
    sub.className = "subline";

    // 农历/节气
    const li = getLunarInfo(y, m0+1, day);
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

    // 调休/放假
    const mark = state.marks?.map.get(dateKey);
    if (mark) {
      const b = document.createElement("span");
      b.className = `badge ${mark.kind === "off" ? "off" : "work"}`;
      b.textContent = mark.kind === "off" ? `休 ${mark.name}` : `班 ${mark.name}`;
      sub.appendChild(b);
    }

    cell.appendChild(top);
    cell.appendChild(sub);

    cell.addEventListener("click", () => showDay(y, m0, day, dateKey, mark, li));
    grid.appendChild(cell);
  }
}

function showDay(
  y:number, m0:number, day:number,
  dateKey:string,
  mark: { kind:"off"|"work"; name:string } | undefined,
  li: ReturnType<typeof getLunarInfo>
){
  const d = new Date(y, m0, day);
  const week = weekCN[(d.getDay()+6)%7];

  setTextSafe($id("dayTitle"), `${dateKey}（周${week}）`);

  const lines: string[] = [];
  if (li?.lunarText) lines.push(`农历：${li.lunarText}`);
  if (li?.jieqi) lines.push(`节气：${li.jieqi}`);
  if (mark) lines.push(mark.kind === "off" ? `状态：放假（${mark.name}）` : `状态：调休补班（${mark.name}）`);

  if (!lines.length) lines.push("（无额外信息）");
  setTextSafe($id("dayBody"), lines.join("\n"));
}

async function loadMarksIfNeeded(year:number){
  setPill("loading…");
  try {
    const marks = await loadCnHoliday(year);
    state.marks = marks;

    // 展示数据源说明（CN 含调休；农历/节气由前端库生成）
    const src = marks.source === "local" ? "CN（本地自动同步）" : "CN（远程 fallback）";
    const paper = marks.paper ? `｜国务院来源：${marks.paper}` : "";
    setTextSafe($id("sourceLine"), `地区：${src}（含农历/节气/调休）${paper}`);

    setPill("ok");
  } catch (e) {
    setPill("error");
    setTextSafe($id("sourceLine"), `CN 数据加载失败：${String(e)}`);
  }
}

function bindNav(){
  $id("prevBtn").addEventListener("click", async () => {
    state.m0--;
    if (state.m0 < 0) { state.m0 = 11; state.y--; }
    await loadMarksIfNeeded(state.y);
    render();
  });
  $id("nextBtn").addEventListener("click", async () => {
    state.m0++;
    if (state.m0 > 11) { state.m0 = 0; state.y++; }
    await loadMarksIfNeeded(state.y);
    render();
  });
  $id("todayBtn").addEventListener("click", async () => {
    const d = new Date();
    state.y = d.getFullYear();
    state.m0 = d.getMonth();
    await loadMarksIfNeeded(state.y);
    render();
  });
}

(async () => {
  bindNav();
  await loadMarksIfNeeded(state.y);
  render();
})();
