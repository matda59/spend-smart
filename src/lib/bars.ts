import { viewCents } from "./money";
import { SECTIONS, type BudgetItem, type Frequency, type Kind } from "./types";

const FAMILY: Record<Kind, string[]> = {
  income: ["#1f6b45", "#3d8f62", "#67b088", "#145c3a", "#8fbfa4"],
  essential: ["#1b4332", "#2d6a4f", "#40916c", "#1b5e4a", "#74c69d"],
  discretionary: ["#c47b3a", "#a85d2a", "#e09f3e", "#8c4a22", "#f4a261"],
  set_aside: ["#3d6f8c", "#2c5270", "#5b8eab", "#1e3d56", "#7eabc4"],
};

const GROUP: Record<Kind, string> = {
  income: "Income",
  essential: "Essentials",
  discretionary: "Discretionary",
  set_aside: "Set aside",
};

export function groupColor(kind: Kind) {
  return FAMILY[kind][0];
}

export type BarSlice = {
  id: string;
  name: string;
  group: string;
  kind: Kind | "leftover";
  cents: number;
  color: string;
};

function shade(kind: Kind, index: number) {
  const family = FAMILY[kind];
  return family[index % family.length];
}

function filled(items: BudgetItem[], kind: Kind, view: Frequency): BarSlice[] {
  return items
    .filter((item) => !item.hidden && item.kind === kind && item.amountCents != null && item.amountCents > 0)
    .map((item, index) => ({
      id: item.id,
      name: item.name,
      group: item.kind === "income" || item.kind === "set_aside"
        ? GROUP[item.kind]
        : `${GROUP[item.kind]} · ${SECTIONS.find((section) => section.id === item.section)?.label ?? ""}`,
      kind: item.kind,
      cents: viewCents(item.amountCents ?? 0, item.frequency, view),
      color: shade(kind, index),
    }));
}

export function barSeries(items: BudgetItem[], view: Frequency) {
  const income = filled(items, "income", view);
  const uses = [
    ...filled(items, "essential", view),
    ...filled(items, "discretionary", view),
    ...filled(items, "set_aside", view),
  ];
  const incomeTotal = income.reduce((sum, slice) => sum + slice.cents, 0);
  const used = uses.reduce((sum, slice) => sum + slice.cents, 0);
  const leftover = incomeTotal - used;
  if (leftover > 0) {
    uses.push({
      id: "leftover",
      name: "Left over",
      group: "After essentials, discretionary, and set aside",
      kind: "leftover",
      cents: leftover,
      color: "var(--leftover)",
    });
  }
  const scale = Math.max(incomeTotal, uses.reduce((sum, slice) => sum + slice.cents, 0));
  return { income, uses, scale };
}
