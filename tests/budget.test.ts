import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { CATALOG } from "../src/lib/catalog";
import { formatAud, largestCosts, parseDollars, plainLeft, shareOf, spentAgainst, summarise, viewCents } from "../src/lib/money";
import type { BudgetItem } from "../src/lib/types";

function asItems(): BudgetItem[] {
  return CATALOG.map((item, sort) => ({
    ...item,
    sort,
    hidden: false,
    custom: false,
    note: "",
    actualCents: null,
  }));
}

function sample(): BudgetItem[] {
  return [
    {
      id: "pay",
      section: "income",
      name: "Pay",
      amountCents: 120_000,
      frequency: "monthly",
      kind: "income",
      sort: 0,
      hidden: false,
      custom: false,
      note: "",
      actualCents: null,
    },
    {
      id: "rent",
      section: "home",
      name: "Rent",
      amountCents: 20_000,
      frequency: "monthly",
      kind: "essential",
      sort: 1,
      hidden: false,
      custom: false,
      note: "",
      actualCents: null,
    },
  ];
}

test("a fresh budget has no amounts", () => {
  assert.equal(CATALOG.every((item) => item.amountCents == null), true);
  const totals = summarise(asItems(), "monthly");
  assert.equal(totals.income, 0);
  assert.equal(totals.essential, 0);
  assert.equal(totals.leftAfterEssentials, 0);
  assert.equal(totals.leftOver, 0);
});

test("monthly and annual totals follow the MoneySmart periods", () => {
  const monthly = summarise(sample(), "monthly");
  assert.equal(Math.round(monthly.income), 120_000);
  assert.equal(Math.round(monthly.essential), 20_000);
  assert.equal(Math.round(monthly.leftAfterEssentials), 100_000);
  assert.equal(formatAud(monthly.leftAfterEssentials), "$1,000");

  const annual = summarise(sample(), "annually");
  assert.equal(Math.round(annual.leftAfterEssentials), 1_200_000);
});

test("fortnightly conversion uses 26 periods", () => {
  assert.equal(viewCents(120_000, "monthly", "fortnightly"), (120_000 * 12) / 26);
});

test("blank amounts are left out of the totals", () => {
  const items = sample().map((item) =>
    item.id === "pay" ? { ...item, amountCents: null } : item,
  );
  const totals = summarise(items, "monthly");
  assert.equal(Math.round(totals.income), 0);
  assert.equal(Math.round(totals.leftAfterEssentials), -20_000);
});

test("hidden lines are left out of the totals", () => {
  const items = sample().map((item) =>
    item.id === "rent" ? { ...item, hidden: true } : item,
  );
  assert.equal(Math.round(summarise(items, "monthly").essential), 0);
  assert.equal(Math.round(summarise(items, "monthly").leftAfterEssentials), 120_000);
});

test("dollar entry accepts blanks, commas, and cents", () => {
  assert.deepEqual(parseDollars(""), { ok: true, cents: null });
  assert.deepEqual(parseDollars("  $1,200.50 "), { ok: true, cents: 120_050 });
  assert.equal(parseDollars("-5").ok, false);
  assert.equal(parseDollars("12.345").ok, false);
});

test("the largest costs ignore income and blank lines", () => {
  const costs = largestCosts(
    [
      ...sample(),
      {
        id: "power",
        section: "home",
        name: "Power",
        amountCents: 40_000,
        frequency: "monthly",
        kind: "essential",
        sort: 2,
        hidden: false,
        custom: false,
        note: "",
        actualCents: 30_000,
      },
    ],
    "monthly",
  );
  assert.deepEqual(
    costs.map((line) => line.name),
    ["Power", "Rent"],
  );
  const checked = spentAgainst(
    [
      {
        id: "power",
        section: "home",
        name: "Power",
        amountCents: 40_000,
        frequency: "monthly",
        kind: "essential",
        sort: 2,
        hidden: false,
        custom: false,
        note: "",
        actualCents: 30_000,
      },
    ],
    "monthly",
  );
  assert.equal(checked.count, 1);
  assert.equal(checked.planned, 40_000);
  assert.equal(checked.spent, 30_000);
  const withActual = sample().map((item) => (item.id === "rent" ? { ...item, actualCents: 99_000 } : item));
  assert.equal(summarise(withActual, "monthly").essential, summarise(sample(), "monthly").essential);
});

test("the summary sentence says what is left", () => {
  const totals = summarise(sample(), "monthly");
  assert.match(plainLeft(totals, "monthly"), /After essentials, \$1,000 is left this month/);
  assert.match(plainLeft(summarise([], "monthly"), "fortnightly"), /Enter your pay/);
});

test("shares of income stay readable", () => {
  assert.equal(shareOf(150_000, 400_000), "37.5%");
  assert.equal(shareOf(400_000, 400_000), "100%");
  assert.equal(shareOf(0, 400_000), "0%");
  assert.equal(shareOf(100, 400_000), "<1%");
  assert.equal(shareOf(-50_000, 400_000), "−12.5%");
  assert.equal(shareOf(100, 0), null);
});

test("catalog ids are unique", () => {
  const ids = CATALOG.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("a new database is seeded with blank lines", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "household-budget-"));
  const { openDatabase } = await import("../src/lib/db");
  const db = openDatabase(path.join(dir, "budget.sqlite"));
  const pay = db.prepare("SELECT amount_cents, frequency FROM items WHERE id = ?").get("income-yours") as {
    amount_cents: number | null;
    frequency: string;
  };
  const mortgage = db.prepare("SELECT amount_cents, frequency FROM items WHERE id = ?").get("home-mortgage") as {
    amount_cents: number | null;
    frequency: string;
  };
  const filled = db.prepare("SELECT COUNT(*) AS n FROM items WHERE amount_cents IS NOT NULL").get() as {
    n: number;
  };
  const count = db.prepare("SELECT COUNT(*) AS n FROM items").get() as { n: number };
  assert.equal(pay.amount_cents, null);
  assert.equal(pay.frequency, "monthly");
  assert.equal(mortgage.amount_cents, null);
  assert.equal(mortgage.frequency, "monthly");
  const mortgageSection = db.prepare("SELECT section FROM items WHERE id = ?").get("home-mortgage") as {
    section: string;
  };
  assert.equal(mortgageSection.section, "housing");
  assert.equal(filled.n, 0);
  assert.equal(count.n, CATALOG.length);
  const columns = db.prepare("PRAGMA table_info(settings)").all() as { name: string }[];
  assert.equal(columns.some((column) => column.name === "household_name"), true);
  assert.equal(columns.some((column) => column.name === "advisor_note"), true);
  assert.equal(columns.some((column) => column.name === "goal_cents"), true);
  const itemColumns = db.prepare("PRAGMA table_info(items)").all() as { name: string }[];
  assert.equal(itemColumns.some((column) => column.name === "note"), true);
  assert.equal(itemColumns.some((column) => column.name === "actual_cents"), true);
  const rent = db.prepare("SELECT name, section FROM items WHERE id = 'housing-rent'").get() as {
    name: string;
    section: string;
  };
  assert.equal(rent.name, "Rent");
  assert.equal(rent.section, "housing");
  db.prepare("UPDATE items SET section = 'home', amount_cents = 180000 WHERE id = 'home-mortgage'").run();
  db.close();
  const reopened = openDatabase(path.join(dir, "budget.sqlite"));
  const moved = reopened.prepare("SELECT section, amount_cents FROM items WHERE id = ?").get("home-mortgage") as {
    section: string;
    amount_cents: number;
  };
  assert.equal(moved.section, "housing");
  assert.equal(moved.amount_cents, 180000);
  reopened.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a note, a leftover goal, and undo survive in the database", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "household-budget-"));
  const { openDatabase } = await import("../src/lib/db");
  const { updateItem, listItems, addItem, restoreItems } = await import("../src/lib/budget");
  const { saveGoal, getGoal } = await import("../src/lib/profile");
  openDatabase(path.join(dir, "budget.sqlite"));
  process.env.DATABASE_PATH = path.join(dir, "budget.sqlite");
  const noted = updateItem("home-mortgage", { note: "Fixed until 2028", amountCents: 180000 });
  assert.equal(noted, null);
  assert.equal(listItems().find((item) => item.id === "home-mortgage")?.note, "Fixed until 2028");
  assert.equal(saveGoal(50_000, "fortnightly"), null);
  assert.deepEqual(getGoal(), { cents: 50_000, frequency: "fortnightly" });
  const before = listItems();
  const added = addItem({ section: "added", name: "Streaming", kind: "discretionary", frequency: "monthly" });
  assert.ok(!("error" in added));
  assert.equal(restoreItems(before), null);
  const after = listItems();
  assert.equal(after.some((item) => item.name === "Streaming"), false);
  assert.equal(after.find((item) => item.id === "home-mortgage")?.amountCents, 180000);
  assert.equal(after.find((item) => item.id === "home-mortgage")?.note, "Fixed until 2028");
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});
