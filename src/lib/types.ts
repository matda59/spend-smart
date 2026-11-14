export const FREQUENCIES = [
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "annually",
] as const;

export type Frequency = (typeof FREQUENCIES)[number];

export const KINDS = [
  "income",
  "essential",
  "discretionary",
  "set_aside",
] as const;

export type Kind = (typeof KINDS)[number];

export const SECTIONS = [
  { id: "income", label: "Income" },
  { id: "housing", label: "Mortgage & rent" },
  { id: "home", label: "Home & utilities" },
  { id: "insurance", label: "Insurance & financial" },
  { id: "groceries", label: "Groceries" },
  { id: "personal", label: "Personal & medical" },
  { id: "entertainment", label: "Entertainment & eating out" },
  { id: "transport", label: "Transport & auto" },
  { id: "children", label: "Children" },
  { id: "added", label: "Added" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export type BudgetItem = {
  id: string;
  section: SectionId;
  name: string;
  amountCents: number | null;
  frequency: Frequency;
  kind: Kind;
  sort: number;
  hidden: boolean;
  custom: boolean;
  note: string;
  actualCents: number | null;
};

export type ItemPatch = {
  name?: string;
  amountCents?: number | null;
  frequency?: Frequency;
  kind?: Kind;
  hidden?: boolean;
  note?: string;
  actualCents?: number | null;
};
