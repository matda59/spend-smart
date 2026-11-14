import {
  FREQUENCIES,
  type BudgetItem,
  type Frequency,
  type Kind,
} from "./types";

export const PER_YEAR: Record<Frequency, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

export const PERIOD_NOUN: Record<Frequency, string> = {
  weekly: "week",
  fortnightly: "fortnight",
  monthly: "month",
  quarterly: "quarter",
  annually: "year",
};

export function isFrequency(value: string): value is Frequency {
  return (FREQUENCIES as readonly string[]).includes(value);
}

/** Same conversion as the MoneySmart sheet: 52 weeks, 26 fortnights, 12 months, 4 quarters. */
export function viewCents(
  amountCents: number,
  frequency: Frequency,
  view: Frequency,
): number {
  return (amountCents * PER_YEAR[frequency]) / PER_YEAR[view];
}

export type Totals = {
  income: number;
  essential: number;
  discretionary: number;
  setAside: number;
  leftAfterEssentials: number;
  leftOver: number;
};

export function summarise(items: BudgetItem[], view: Frequency): Totals {
  const sum = (kind: Kind) =>
    items.reduce((total, item) => {
      if (item.hidden || item.kind !== kind || item.amountCents == null) {
        return total;
      }
      return total + viewCents(item.amountCents, item.frequency, view);
    }, 0);

  const income = sum("income");
  const essential = sum("essential");
  const discretionary = sum("discretionary");
  const setAside = sum("set_aside");

  return {
    income,
    essential,
    discretionary,
    setAside,
    leftAfterEssentials: income - essential,
    leftOver: income - essential - discretionary - setAside,
  };
}

/** Share of a total, for example 37.5% of income. Null when there is no total to share. */
export function shareOf(part: number, whole: number): string | null {
  if (!(whole > 0) || !Number.isFinite(part)) return null;
  const sign = part < 0 ? "−" : "";
  const pct = (Math.abs(part) / whole) * 100;
  if (pct === 0) return "0%";
  if (pct < 0.5) return `${sign}<1%`;
  const tenths = Math.round(pct * 10) / 10;
  const text = Math.abs(tenths - Math.round(tenths)) < 0.05 ? String(Math.round(tenths)) : tenths.toFixed(1);
  return `${sign}${text}%`;
}

export function formatAud(cents: number): string {
  const dollars = cents / 100;
  const whole = Math.abs(dollars - Math.round(dollars)) < 0.005;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(dollars);
}

export function formatPlain(cents: number): string {
  const dollars = cents / 100;
  const whole = Math.abs(dollars - Math.round(dollars)) < 0.005;
  return new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
    useGrouping: false,
  }).format(dollars);
}

export function parseDollars(
  raw: string,
): { ok: true; cents: number | null } | { ok: false; error: string } {
  const trimmed = raw.trim().replace(/[$\s]/g, "");
  if (trimmed === "") return { ok: true, cents: null };
  const normalised = trimmed.replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(normalised)) {
    return { ok: false, error: "Enter a dollar amount, such as 49.95." };
  }
  const cents = Math.round(Number(normalised) * 100);
  if (!Number.isFinite(cents) || cents > 100_000_000_00) {
    return { ok: false, error: "That amount is too large." };
  }
  return { ok: true, cents };
}
