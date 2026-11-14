import { KINDS, SECTIONS, type BudgetItem, type Kind, type SectionId } from "./types";

export type Placement = {
  id: string;
  kind: Kind;
  section: SectionId;
  index: number;
};

function bucketKey(item: Pick<BudgetItem, "kind" | "section">) {
  if (item.kind === "income") return "income";
  if (item.kind === "set_aside") return "set_aside";
  return `${item.kind}:${item.section}`;
}

function resolved(kind: Kind, section: SectionId): { kind: Kind; section: SectionId } {
  if (kind === "income" || section === "income") return { kind: "income", section: "income" };
  return { kind, section };
}

export function placeLine(items: BudgetItem[], placement: Placement): BudgetItem[] | null {
  const moving = items.find((item) => item.id === placement.id);
  if (!moving || moving.hidden) return null;
  if (!(KINDS as readonly string[]).includes(placement.kind)) return null;
  if (!SECTIONS.some((section) => section.id === placement.section)) return null;

  const next = resolved(placement.kind, placement.section);
  const destination = bucketKey(next);
  const visible = items.filter((item) => !item.hidden);
  const currentDest = visible.filter((item) => bucketKey(item) === destination);
  let index = placement.index;
  if (bucketKey(moving) === destination) {
    const from = currentDest.findIndex((item) => item.id === moving.id);
    if (from === index && moving.kind === next.kind && moving.section === next.section) return items;
    if (from > -1 && from < index) index -= 1;
  }
  const without = currentDest.filter((item) => item.id !== moving.id);
  index = Math.max(0, Math.min(index, without.length));
  const updated = { ...moving, kind: next.kind, section: next.section };
  without.splice(index, 0, updated);

  const groups = new Map<string, BudgetItem[]>();
  for (const item of visible) {
    if (item.id === moving.id) continue;
    const key = bucketKey(item);
    if (key === destination) continue;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  groups.set(destination, without);

  const ordered: BudgetItem[] = [...(groups.get("income") ?? [])];
  for (const section of SECTIONS) {
    if (section.id === "income") continue;
    ordered.push(...(groups.get(`essential:${section.id}`) ?? []));
  }
  for (const section of SECTIONS) {
    if (section.id === "income") continue;
    ordered.push(...(groups.get(`discretionary:${section.id}`) ?? []));
  }
  ordered.push(...(groups.get("set_aside") ?? []));
  ordered.push(...items.filter((item) => item.hidden));

  return ordered.map((item, sort) => ({ ...item, sort }));
}
