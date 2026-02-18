export type Lang = "zh" | "en";

export function detectLang(): Lang {
  const l = (navigator.language || "en").toLowerCase();
  if (l.startsWith("zh")) return "zh";
  return "en";
}

export function t(lang: Lang, key: string): string {
  const dict: Record<Lang, Record<string, string>> = {
    zh: {
      loading: "加载中…",
      sync_ok: "对时：正常",
      sync_bad: "对时：不稳定",
      holiday: "假期",
      workday: "补班",
      lunar: "农历",
      solarTerm: "节气"
    },
    en: {
      loading: "Loading…",
      sync_ok: "Sync: OK",
      sync_bad: "Sync: Unstable",
      holiday: "Holiday",
      workday: "Workday",
      lunar: "Lunar",
      solarTerm: "Solar term"
    }
  };
  return dict[lang][key] || key;
}
