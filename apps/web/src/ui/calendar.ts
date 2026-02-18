import type { BuiltinCnYear, HolidaysResp, NagerHoliday } from "../lib/calendar/types";
import { buildCnMarks, buildNagerMarks, monthMatrix } from "../lib/calendar/render";
import { getCnLunarInfo } from "../lib/calendar/lunar-cn";

export type CalendarMode = "CN" | "NAGER";

export function createCalendar(el: {
  container: HTMLElement;
  meta: HTMLElement;
  dayPanel: HTMLElement;
  dayTitle: HTMLElement;
  dayBody: HTMLElement;
}) {
  const state = {
    year: new Date().getFullYear(),
    month0: new Date().getMonth(),
    mode: "NAGER" as CalendarMode,
    cnYear: null as BuiltinCnYear | null,
    nager: [] as NagerHoliday[],
    country: "US"
  };

  function setData(resp: HolidaysResp, country: string, year: number) {
    state.country = country;
    state.year = year;

    if (resp.ok && resp.mode === "builtin") {
      state.mode = "CN";
      state.cnYear = resp.data;
      state.nager = [];
      el.meta.textContent = `地区：CN（含农历/节气/调休）｜${resp.data.meta.source}`;
      return;
    }
    if (resp.ok && resp.mode === "nager") {
      state.mode = "NAGER";
      state.cnYear = null;
      state.nager = resp.data.holidays;
      el.meta.textContent = `地区：${country}（公共节假日）`;
      return;
    }
    el.meta.textContent = `节假日数据不可用`;
  }

  function render() {
    el.container.innerHTML = "";

    const title = document.createElement("div");
    title.className = "muted";
    const monthName = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long" }).format(
      new Date(state.year, state.month0, 1)
    );
    title.textContent = monthName;
    el.container.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "cal-grid";

    const week = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    for (const w of week) {
      const h = document.createElement("div");
      h.className = "muted";
      h.style.padding = "2px 6px";
      h.textContent = w;
      grid.appendChild(h);
    }

    const cells = monthMatrix(state.year, state.month0);
    const marks =
      state.mode === "CN" && state.cnYear
        ? buildCnMarks(state.cnYear, state.year, state.month0)
        : buildNagerMarks(state.nager, state.year, state.month0);

    const curMonth = state.month0;

    for (let i = 0; i < 42; i++) {
      const d = cells[i];
      const m = marks[i];
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-cell";
      cell.setAttribute("data-date", m.date);

      const inMonth = d.getMonth() === curMonth;
      if (!inMonth) cell.setAttribute("aria-disabled", "true");

      const dd = document.createElement("div");
      dd.className = "cal-d";
      dd.textContent = String(d.getDate());

      const sub = document.createElement("div");
      sub.className = "cal-sub";
      sub.textContent = m.sub || "";

      cell.appendChild(dd);
      cell.appendChild(sub);

      if (m.tag) {
        const tag = document.createElement("div");
        tag.className = `tag ${m.tag.kind}`;
        tag.textContent = m.tag.text;
        cell.appendChild(tag);
      }

      cell.addEventListener("click", () => {
        if (!inMonth) return;
        showDay(m.date);
      });

      grid.appendChild(cell);
    }

    el.container.appendChild(grid);
  }

  function showDay(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const parts: string[] = [];

    if (state.mode === "CN" && state.cnYear) {
      const ov = state.cnYear.overrides[dateStr];
      const li = getCnLunarInfo(d);

      parts.push(`公历：${dateStr}`);
      parts.push(`农历：${li.lunarText}`);
      if (li.jieqi) parts.push(`节气：${li.jieqi}`);
      if (li.solarFestivals.length) parts.push(`公历节日：${li.solarFestivals.join("、")}`);
      if (li.lunarFestivals.length) parts.push(`农历节日：${li.lunarFestivals.join("、")}`);
      if (ov) parts.push(`放假/补班：${ov.type === "holiday" ? "假期" : "补班"}｜${ov.name}`);
      else parts.push(`放假/补班：无特别标注`);

      el.dayTitle.textContent = `CN 日历详情`;
    } else {
      parts.push(`Date: ${dateStr}`);
      const hs = state.nager.filter((h) => h.date === dateStr);
      if (hs.length) {
        parts.push(`Holidays:`);
        for (const h of hs) parts.push(`- ${h.localName} / ${h.name}`);
      } else {
        parts.push(`Holidays: none`);
      }
      el.dayTitle.textContent = `Holiday details`;
    }

    el.dayBody.textContent = parts.join("\n");
    el.dayPanel.hidden = false;
  }

  function prevMonth() {
    state.month0--;
    if (state.month0 < 0) { state.month0 = 11; state.year--; }
    render();
  }
  function nextMonth() {
    state.month0++;
    if (state.month0 > 11) { state.month0 = 0; state.year++; }
    render();
  }
  function goToday() {
    const now = new Date();
    state.year = now.getFullYear();
    state.month0 = now.getMonth();
    render();
  }

  return { state, setData, render, prevMonth, nextMonth, goToday };
}
