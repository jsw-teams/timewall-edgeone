export const meta = {
  country: "CN",
  year: 2026,
  source: "国办发明电〔2025〕7号（2025-11-04）"
};

// overrides：仅记录“与常规周末不同”的规则 + 方便前端标注节日名称
// type: "holiday"=法定假期；"workday"=调休补班（即便是周末也要上班）
export const overrides = {
  // 元旦：1/1-1/3 放假；1/4 上班
  "2026-01-01": { type: "holiday", name: "元旦" },
  "2026-01-02": { type: "holiday", name: "元旦" },
  "2026-01-03": { type: "holiday", name: "元旦" },
  "2026-01-04": { type: "workday", name: "元旦调休补班" },

  // 春节：2/15-2/23 放假；2/14、2/28 上班
  "2026-02-14": { type: "workday", name: "春节调休补班" },
  "2026-02-15": { type: "holiday", name: "春节" },
  "2026-02-16": { type: "holiday", name: "春节" },
  "2026-02-17": { type: "holiday", name: "春节" },
  "2026-02-18": { type: "holiday", name: "春节" },
  "2026-02-19": { type: "holiday", name: "春节" },
  "2026-02-20": { type: "holiday", name: "春节" },
  "2026-02-21": { type: "holiday", name: "春节" },
  "2026-02-22": { type: "holiday", name: "春节" },
  "2026-02-23": { type: "holiday", name: "春节" },
  "2026-02-28": { type: "workday", name: "春节调休补班" },

  // 清明：4/4-4/6 放假
  "2026-04-04": { type: "holiday", name: "清明节" },
  "2026-04-05": { type: "holiday", name: "清明节" },
  "2026-04-06": { type: "holiday", name: "清明节" },

  // 劳动节：5/1-5/5 放假；5/9 上班
  "2026-05-01": { type: "holiday", name: "劳动节" },
  "2026-05-02": { type: "holiday", name: "劳动节" },
  "2026-05-03": { type: "holiday", name: "劳动节" },
  "2026-05-04": { type: "holiday", name: "劳动节" },
  "2026-05-05": { type: "holiday", name: "劳动节" },
  "2026-05-09": { type: "workday", name: "劳动节调休补班" },

  // 端午：6/19-6/21 放假
  "2026-06-19": { type: "holiday", name: "端午节" },
  "2026-06-20": { type: "holiday", name: "端午节" },
  "2026-06-21": { type: "holiday", name: "端午节" },

  // 中秋：9/25-9/27 放假
  "2026-09-25": { type: "holiday", name: "中秋节" },
  "2026-09-26": { type: "holiday", name: "中秋节" },
  "2026-09-27": { type: "holiday", name: "中秋节" },

  // 国庆：10/1-10/7 放假；9/20、10/10 上班
  "2026-09-20": { type: "workday", name: "国庆节调休补班" },
  "2026-10-01": { type: "holiday", name: "国庆节" },
  "2026-10-02": { type: "holiday", name: "国庆节" },
  "2026-10-03": { type: "holiday", name: "国庆节" },
  "2026-10-04": { type: "holiday", name: "国庆节" },
  "2026-10-05": { type: "holiday", name: "国庆节" },
  "2026-10-06": { type: "holiday", name: "国庆节" },
  "2026-10-07": { type: "holiday", name: "国庆节" },
  "2026-10-10": { type: "workday", name: "国庆节调休补班" }
};

export default { meta, overrides };
