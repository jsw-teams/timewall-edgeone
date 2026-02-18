export type CnOverride = { type: "holiday" | "workday"; name: string };

export type BuiltinCnYear = {
  meta: { country: string; year: number; source: string };
  overrides: Record<string, CnOverride>;
};

export type NagerHoliday = {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  global: boolean;
  counties: string[] | null;
  types: string[];
};

export type HolidaysResp =
  | { ok: true; mode: "builtin"; data: BuiltinCnYear }
  | { ok: true; mode: "nager"; data: { country: string; year: number; holidays: NagerHoliday[] } }
  | { ok: false; error: string; message?: string };
