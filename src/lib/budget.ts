import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import {
  FREQUENCIES,
  KINDS,
  SECTIONS,
  type BudgetItem,
  type Frequency,
  type ItemPatch,
  type Kind,
  type SectionId,
} from "./types";

const MAX_CUSTOM = 40;
const MAX_NAME = 80;

type ItemRow = {
  id: string;
  section: string;
  name: string;
  amount_cents: number | null;
  frequency: string;
  kind: string;
  sort: number;
  hidden: number;
  custom: number;
};

function mapItem(row: ItemRow): BudgetItem {
  return {
    id: row.id,
    section: row.section as SectionId,
    name: row.name,
    amountCents: row.amount_cents,
    frequency: row.frequency as Frequency,
    kind: row.kind as Kind,
    sort: row.sort,
    hidden: row.hidden === 1,
    custom: row.custom === 1,
  };
}

export function listItems(): BudgetItem[] {
  const rows = getDb()
    .prepare("SELECT * FROM items ORDER BY sort ASC, name ASC")
    .all() as ItemRow[];
  return rows.map(mapItem);
}

function sectionIds() {
  return new Set<string>(SECTIONS.map((section) => section.id));
}

export function updateItem(id: string, patch: ItemPatch): string | null {
  const existing = getDb().prepare("SELECT * FROM items WHERE id = ?").get(id) as ItemRow | undefined;
  if (!existing) return "That line is no longer on the budget.";

  const next = {
    name: patch.name ?? existing.name,
    amount_cents: patch.amountCents === undefined ? existing.amount_cents : patch.amountCents,
    frequency: patch.frequency ?? existing.frequency,
    kind: patch.kind ?? existing.kind,
    hidden: patch.hidden === undefined ? existing.hidden : patch.hidden ? 1 : 0,
  };

  const name = next.name.trim();
  if (name.length < 1 || name.length > MAX_NAME) {
    return `Use a name between 1 and ${MAX_NAME} characters.`;
  }
  if (!(FREQUENCIES as readonly string[]).includes(next.frequency)) {
    return "Choose a frequency from the list.";
  }
  if (!(KINDS as readonly string[]).includes(next.kind)) {
    return "Choose where this line belongs.";
  }
  if (next.kind === "income" && existing.section !== "income") {
    return "Move income lines from the row menu or by dragging them.";
  }
  if (existing.section === "income" && next.kind !== "income") {
    return "Move this line from the row menu or by dragging it.";
  }
  if (next.amount_cents != null) {
    if (!Number.isInteger(next.amount_cents) || next.amount_cents < 0 || next.amount_cents > 100_000_000_00) {
      return "Enter a dollar amount, such as 49.95.";
    }
  }

  getDb()
    .prepare(
      `UPDATE items
       SET name = ?, amount_cents = ?, frequency = ?, kind = ?, hidden = ?
       WHERE id = ?`,
    )
    .run(name, next.amount_cents, next.frequency, next.kind, next.hidden, id);

  return null;
}

export function addItem(input: {
  section: SectionId;
  name: string;
  kind: Kind;
  frequency: Frequency;
}): { item: BudgetItem } | { error: string } {
  if (!sectionIds().has(input.section)) return { error: "Choose a section." };
  if (!(KINDS as readonly string[]).includes(input.kind)) {
    return { error: "Choose where this line belongs." };
  }
  if (!(FREQUENCIES as readonly string[]).includes(input.frequency)) {
    return { error: "Choose a frequency from the list." };
  }
  const name = input.name.trim();
  if (name.length < 1 || name.length > MAX_NAME) {
    return { error: `Use a name between 1 and ${MAX_NAME} characters.` };
  }
  const customCount = getDb()
    .prepare("SELECT COUNT(*) AS n FROM items WHERE custom = 1")
    .get() as { n: number };
  if (customCount.n >= MAX_CUSTOM) {
    return { error: `The budget already has ${MAX_CUSTOM} added lines.` };
  }
  const sortRow = getDb().prepare("SELECT COALESCE(MAX(sort), 0) AS sort FROM items").get() as {
    sort: number;
  };
  const item: BudgetItem = {
    id: randomUUID(),
    section: input.section,
    name,
    amountCents: null,
    frequency: input.frequency,
    kind: input.kind,
    sort: sortRow.sort + 1,
    hidden: false,
    custom: true,
  };
  getDb()
    .prepare(
      `INSERT INTO items (id, section, name, amount_cents, frequency, kind, sort, hidden, custom)
       VALUES (?, ?, ?, NULL, ?, ?, ?, 0, 1)`,
    )
    .run(item.id, item.section, item.name, item.frequency, item.kind, item.sort);
  return { item };
}

export function arrangeItems(
  entries: { id: string; kind: Kind; section: SectionId; sort: number }[],
): string | null {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM items").all() as { id: string }[];
  if (entries.length !== existing.length) return "The budget changed. Reload and try again.";
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) return "The budget changed. Reload and try again.";
  for (const row of existing) {
    if (!ids.has(row.id)) return "The budget changed. Reload and try again.";
  }
  for (const entry of entries) {
    if (!(KINDS as readonly string[]).includes(entry.kind)) return "Choose where this line belongs.";
    if (!sectionIds().has(entry.section)) return "Choose a section.";
    if (entry.kind === "income" && entry.section !== "income") {
      return "Income lines sit in the income group.";
    }
    if (entry.kind !== "income" && entry.section === "income") {
      return "Choose a spending group for this line.";
    }
    if (!Number.isInteger(entry.sort)) return "The budget changed. Reload and try again.";
  }

  const write = db.transaction(() => {
    const statement = db.prepare("UPDATE items SET kind = ?, section = ?, sort = ? WHERE id = ?");
    for (const entry of entries) {
      statement.run(entry.kind, entry.section, entry.sort, entry.id);
    }
  });
  write();
  return null;
}

export function deleteItem(id: string): string | null {
  const existing = getDb().prepare("SELECT custom FROM items WHERE id = ?").get(id) as
    | { custom: number }
    | undefined;
  if (!existing) return "That line is no longer on the budget.";
  if (existing.custom !== 1) return "Built-in lines can be hidden, not removed.";
  getDb().prepare("DELETE FROM items WHERE id = ?").run(id);
  return null;
}
