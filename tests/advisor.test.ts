import assert from "node:assert/strict";
import test from "node:test";
import { advisorCsv, packLines, packTotals } from "../src/lib/advisor";
import type { BudgetItem } from "../src/lib/types";

function line(partial: Partial<BudgetItem> & Pick<BudgetItem, "id" | "name" | "kind">): BudgetItem {
  return {
    section: partial.kind === "income" ? "income" : "home",
    amountCents: 10_000,
    frequency: "monthly",
    sort: 0,
    hidden: false,
    custom: false,
    note: "",
    ...partial,
  };
}

test("the advisor pack converts fortnightly, monthly, and annual figures", () => {
  const items = [
    line({ id: "pay", name: "Pay", kind: "income", amountCents: 120_000, frequency: "monthly" }),
    line({ id: "rent", name: "Rent", kind: "essential", amountCents: 26_000, frequency: "fortnightly" }),
  ];
  const [pay, rent] = packLines(items);
  assert.equal(Math.round(pay.monthly), 120_000);
  assert.equal(Math.round(pay.annually), 1_440_000);
  assert.equal(Math.round(pay.fortnightly), Math.round((120_000 * 12) / 26));
  assert.equal(Math.round(rent.monthly), Math.round((26_000 * 26) / 12));

  const totals = packTotals(items);
  const income = totals.find((row) => row.label === "Income");
  assert.equal(Math.round(income?.annually ?? 0), 1_440_000);
});

test("blank and hidden lines stay out of the advisor pack", () => {
  const items = [
    line({ id: "pay", name: "Pay", kind: "income", amountCents: null }),
    line({ id: "rent", name: "Rent", kind: "essential", hidden: true }),
    line({ id: "food", name: "Groceries", kind: "essential", section: "groceries" }),
  ];
  const lines = packLines(items);
  assert.deepEqual(lines.map((row) => row.name), ["Groceries"]);
});

test("the spreadsheet escapes commas and formula text", () => {
  const items = [
    line({ id: "odd", name: '=cmd,"now"', kind: "essential", amountCents: 100 }),
  ];
  const csv = advisorCsv(items, { householdName: "Ada, Bo", advisorNote: "Check this" }, "14 November 2026");
  assert.match(csv, /Ada, Bo/);
  assert.match(csv, /"'=cmd,""now"""/);
  assert.match(csv, /1\.00/);
  assert.match(csv, /Check this/);
});
