import { randomUUID } from "node:crypto";
import { CATALOG } from "./catalog";
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
const MAX_NOTE = 160;

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
  note?: string;
  actual_cents?: number | null;
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
    note: row.note ?? "",
    actualCents: row.actual_cents ?? null,
  };
}

export function listItems(): BudgetItem[] {
  const rows = getDb()
    .prepare("SELECT * FROM items ORDER BY sort ASC, name ASC")
    .all() as ItemRow[];
  return rows.map(mapItem);
}

function validAmount(cents: number | null) {
  if (cents == null) return true;
  return Number.isInteger(cents) && cents >= 0 && cents <= 100_000_000_00;
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
    note: patch.note === undefined ? (existing.note ?? "") : patch.note,
    actual_cents: patch.actualCents === undefined ? (existing.actual_cents ?? null) : patch.actualCents,
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
  if (!validAmount(next.amount_cents)) return "Enter a dollar amount, such as 49.95.";
  const note = next.note.trim();
  if (note.length > MAX_NOTE) return `Keep the note under ${MAX_NOTE} characters.`;
  if (!validAmount(next.actual_cents)) return "Enter a dollar amount, such as 49.95.";

  getDb()
    .prepare(
      `UPDATE items
       SET name = ?, amount_cents = ?, frequency = ?, kind = ?, hidden = ?, note = ?, actual_cents = ?
       WHERE id = ?`,
    )
    .run(name, next.amount_cents, next.frequency, next.kind, next.hidden, note, next.actual_cents, id);

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
    note: "",
    actualCents: null,
  };
  getDb()
    .prepare(
      `INSERT INTO items (id, section, name, amount_cents, frequency, kind, sort, hidden, custom)
       VALUES (?, ?, ?, NULL, ?, ?, ?, 0, 1)`,
    )
    .run(item.id, item.section, item.name, item.frequency, item.kind, item.sort);
  return { item };
}

export function restoreItems(next: BudgetItem[]): string | null {
  const db = getDb();
  const existing = db.prepare("SELECT id, custom FROM items").all() as { id: string; custom: number }[];
  const existingIds = new Map(existing.map((row) => [row.id, row.custom === 1]));
  const catalogIds = new Set(CATALOG.map((item) => item.id));
  if (new Set(next.map((item) => item.id)).size !== next.length) {
    return "The budget changed. Reload and try again.";
  }
  for (const row of existing) {
    if (row.custom !== 1 && !next.some((item) => item.id === row.id)) {
      return "The budget changed. Reload and try again.";
    }
  }
  for (const item of next) {
    const name = item.name.trim();
    if (name.length < 1 || name.length > MAX_NAME) return `Use a name between 1 and ${MAX_NAME} characters.`;
    if (!(FREQUENCIES as readonly string[]).includes(item.frequency)) return "Choose a frequency from the list.";
    if (!(KINDS as readonly string[]).includes(item.kind)) return "Choose where this line belongs.";
    if (!sectionIds().has(item.section)) return "Choose a section.";
    if (item.kind === "income" && item.section !== "income") return "Income lines sit in the income group.";
    if (item.kind !== "income" && item.section === "income") return "Choose a spending group for this line.";
    if (item.note.trim().length > MAX_NOTE) return `Keep the note under ${MAX_NOTE} characters.`;
    if (!Number.isInteger(item.sort)) return "The budget changed. Reload and try again.";
    if (!validAmount(item.amountCents) || !validAmount(item.actualCents ?? null)) {
      return "Enter a dollar amount, such as 49.95.";
    }
    if (!existingIds.has(item.id) && (!item.custom || catalogIds.has(item.id))) {
      return "The budget changed. Reload and try again.";
    }
  }

  const write = db.transaction(() => {
    const remove = db.prepare("DELETE FROM items WHERE id = ? AND custom = 1");
    for (const row of existing) {
      if (row.custom === 1 && !next.some((item) => item.id === row.id)) remove.run(row.id);
    }
    const update = db.prepare(
      `UPDATE items
       SET section = ?, name = ?, amount_cents = ?, frequency = ?, kind = ?, sort = ?, hidden = ?, note = ?, actual_cents = ?
       WHERE id = ?`,
    );
    const insert = db.prepare(
      `INSERT INTO items (id, section, name, amount_cents, frequency, kind, sort, hidden, custom, note, actual_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    );
    for (const item of next) {
      const hidden = item.hidden ? 1 : 0;
      const note = item.note.trim();
      const actual = item.actualCents ?? null;
      if (existingIds.has(item.id)) {
        update.run(item.section, item.name.trim(), item.amountCents, item.frequency, item.kind, item.sort, hidden, note, actual, item.id);
      } else {
        insert.run(item.id, item.section, item.name.trim(), item.amountCents, item.frequency, item.kind, item.sort, hidden, note, actual);
      }
    }
  });
  write();
  return null;
}

export function hideItems(ids: string[]): string | null {
  if (ids.length < 1 || ids.length > 80) return "Choose the lines to hide.";
  const unique = [...new Set(ids)];
  const found = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM items WHERE id IN (${unique.map(() => "?").join(",")})`)
    .get(...unique) as { n: number };
  if (found.n !== unique.length) return "That line is no longer on the budget.";
  const write = getDb().transaction(() => {
    const statement = getDb().prepare("UPDATE items SET hidden = 1 WHERE id = ?");
    for (const id of unique) statement.run(id);
  });
  write();
  return null;
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
