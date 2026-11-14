import assert from "node:assert/strict";
import test from "node:test";
import { placeLine } from "../src/lib/arrange";
import { barSeries } from "../src/lib/bars";
import type { BudgetItem } from "../src/lib/types";

function item(partial: Partial<BudgetItem> & Pick<BudgetItem, "id" | "name" | "kind" | "section">): BudgetItem {
  return {
    amountCents: 10_000,
    frequency: "monthly",
    sort: 0,
    hidden: false,
    custom: false,
    note: "",
    actualCents: null,
    ...partial,
  };
}

test("a line can move into another group and section", () => {
  const items = [
    item({ id: "rent", name: "Rent", kind: "essential", section: "home", sort: 0 }),
    item({ id: "tv", name: "Pay TV", kind: "discretionary", section: "entertainment", sort: 1 }),
  ];
  const next = placeLine(items, { id: "rent", kind: "discretionary", section: "entertainment", index: 0 });
  assert.ok(next);
  const rent = next.find((row) => row.id === "rent");
  assert.equal(rent?.kind, "discretionary");
  assert.equal(rent?.section, "entertainment");
  assert.ok((rent?.sort ?? 0) < (next.find((row) => row.id === "tv")?.sort ?? 0));
});

test("income lines land in the income group", () => {
  const items = [item({ id: "rent", name: "Rent", kind: "essential", section: "home" })];
  const next = placeLine(items, { id: "rent", kind: "income", section: "home", index: 0 });
  assert.equal(next?.[0].kind, "income");
  assert.equal(next?.[0].section, "income");
});

test("dropping a line on itself leaves the order alone", () => {
  const items = [
    item({ id: "a", name: "A", kind: "essential", section: "home", sort: 0 }),
    item({ id: "b", name: "B", kind: "essential", section: "home", sort: 1 }),
  ];
  const next = placeLine(items, { id: "a", kind: "essential", section: "home", index: 0 });
  assert.equal(next, items);
});

test("the bar gives each filled line its own colour", () => {
  const items = [
    item({ id: "pay", name: "Pay", kind: "income", section: "income", amountCents: 200_000 }),
    item({ id: "partner", name: "Partner", kind: "income", section: "income", amountCents: 100_000 }),
    item({ id: "rent", name: "Rent", kind: "essential", section: "home", amountCents: 80_000 }),
    item({ id: "blank", name: "Blank", kind: "essential", section: "home", amountCents: null }),
  ];
  const { income, uses } = barSeries(items, "monthly");
  assert.deepEqual(income.map((slice) => slice.name), ["Pay", "Partner"]);
  assert.notEqual(income[0].color, income[1].color);
  assert.equal(uses.some((slice) => slice.name === "Rent"), true);
  assert.equal(uses.some((slice) => slice.name === "Blank"), false);
  assert.equal(uses.at(-1)?.name, "Left over");
});
