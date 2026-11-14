import { FREQUENCY_LABEL, formatAud, summarise, viewCents } from "./money";
import { displayName, type HouseholdProfile } from "./profile";
import { SECTIONS, type BudgetItem, type Frequency, type Kind } from "./types";

export const PACK_VIEWS = ["fortnightly", "monthly", "annually"] as const;
export type PackView = (typeof PACK_VIEWS)[number];

const KIND_LABEL: Record<Kind, string> = {
  income: "Income",
  essential: "Essential",
  discretionary: "Discretionary",
  set_aside: "Set aside",
};

const KIND_ORDER: Kind[] = ["income", "essential", "discretionary", "set_aside"];

export type PackLine = {
  section: string;
  name: string;
  kind: Kind;
  kindLabel: string;
  entered: string;
  frequency: string;
  fortnightly: number;
  monthly: number;
  annually: number;
};

export type PackTotals = {
  label: string;
  fortnightly: number;
  monthly: number;
  annually: number;
};

function dollars(cents: number) {
  return (Math.round(cents) / 100).toFixed(2);
}

function across(amountCents: number, frequency: Frequency) {
  return {
    fortnightly: viewCents(amountCents, frequency, "fortnightly"),
    monthly: viewCents(amountCents, frequency, "monthly"),
    annually: viewCents(amountCents, frequency, "annually"),
  };
}

export function packLines(items: BudgetItem[]): PackLine[] {
  return items
    .filter((item) => !item.hidden && item.amountCents != null)
    .map((item) => {
      const values = across(item.amountCents ?? 0, item.frequency);
      return {
        section: SECTIONS.find((section) => section.id === item.section)?.label ?? item.section,
        name: item.name,
        kind: item.kind,
        kindLabel: KIND_LABEL[item.kind],
        entered: formatAud(item.amountCents ?? 0),
        frequency: FREQUENCY_LABEL[item.frequency],
        ...values,
      };
    });
}

export function packTotals(items: BudgetItem[]): PackTotals[] {
  const byView = {
    fortnightly: summarise(items, "fortnightly"),
    monthly: summarise(items, "monthly"),
    annually: summarise(items, "annually"),
  };
  const row = (
    label: string,
    pick: (view: PackView) => number,
  ): PackTotals => ({
    label,
    fortnightly: pick("fortnightly"),
    monthly: pick("monthly"),
    annually: pick("annually"),
  });
  return [
    row("Income", (view) => byView[view].income),
    row("Essentials", (view) => byView[view].essential),
    row("Left after essentials", (view) => byView[view].leftAfterEssentials),
    row("Discretionary", (view) => byView[view].discretionary),
    row("Set aside", (view) => byView[view].setAside),
    row("Left over", (view) => byView[view].leftOver),
  ];
}

export function linesByKind(lines: PackLine[]) {
  return KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    lines: lines.filter((line) => line.kind === kind),
  })).filter((group) => group.lines.length > 0);
}

function csvCell(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`;
  return safe;
}

export function advisorCsv(items: BudgetItem[], profile: HouseholdProfile, prepared: string) {
  const lines = packLines(items);
  const totals = packTotals(items);
  const header = [
    "Section",
    "Line",
    "Kind",
    "Entered amount",
    "Frequency",
    "Fortnightly",
    "Monthly",
    "Annually",
  ];
  const rows = [
    [displayName(profile), "", "", "", "", "", "", ""],
    ["Prepared", prepared, "", "", "", "", "", ""],
    profile.advisorNote.trim() ? ["Note", profile.advisorNote.trim(), "", "", "", "", "", ""] : null,
    header,
    ...lines.map((line) => [
      line.section,
      line.name,
      line.kindLabel,
      line.entered,
      line.frequency,
      dollars(line.fortnightly),
      dollars(line.monthly),
      dollars(line.annually),
    ]),
    [],
    ...totals.map((total) => [
      total.label,
      "",
      "",
      "",
      "",
      dollars(total.fortnightly),
      dollars(total.monthly),
      dollars(total.annually),
    ]),
  ].filter((row): row is string[] => row != null);

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function preparedOn(now = new Date()) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "long",
    timeZone: "Australia/Sydney",
  }).format(now);
}
