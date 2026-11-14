"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { createItem, lockBudget, removeItem, saveItem } from "@/app/actions";
import { MoneyRow } from "@/components/money-row";
import { PassphraseDialog } from "@/components/passphrase-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FREQUENCY_LABEL, PERIOD_NOUN, formatAud, summarise } from "@/lib/money";
import {
  SECTIONS,
  type BudgetItem,
  type Frequency,
  type Kind,
  type SectionId,
} from "@/lib/types";

const VIEWS: Frequency[] = ["weekly", "fortnightly", "monthly", "quarterly", "annually"];

export function BudgetApp({
  initialItems,
  envLocked,
  storedPassword,
  householdName,
}: {
  initialItems: BudgetItem[];
  envLocked: boolean;
  storedPassword: boolean;
  householdName: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<Frequency>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [showDiscretionary, setShowDiscretionary] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  const totals = useMemo(() => summarise(items, view), [items, view]);
  const yearly = useMemo(() => summarise(items, "annually").leftAfterEssentials, [items]);
  const fortnightly = useMemo(() => summarise(items, "fortnightly").leftAfterEssentials, [items]);
  const hidden = items.filter((item) => item.hidden);
  const discretionaryHasAmount = items.some(
    (item) => item.kind === "discretionary" && !item.hidden && item.amountCents != null,
  );
  const discretionaryOpen = showDiscretionary || discretionaryHasAmount;
  const short = totals.leftAfterEssentials < 0;

  function patchItem(id: string, patch: Parameters<typeof saveItem>[1]) {
    setError(null);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    startTransition(async () => {
      const result = await saveItem(id, patch);
      if (!result.ok) setError(result.error);
    });
  }

  function addLine(section: SectionId, kind: Kind, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await createItem({
        section,
        kind,
        name: trimmed,
        frequency: "monthly",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems((current) => [...current, result.item]);
    });
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">
            {householdName.trim() || "For the two of you"}
          </p>
          <h1 className="font-display mt-1 text-4xl sm:text-5xl">Household budget</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            MoneySmart categories for two people. Essentials are the non-discretionary lines.
            Amounts stay in this server’s database. Move a line if it belongs somewhere else.
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <Link href="/export">Advisor pack</Link>
          </Button>
          <PassphraseDialog envLocked={envLocked} storedPassword={storedPassword} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              startTransition(async () => {
                await lockBudget();
              });
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <section className="mt-8 rounded-3xl bg-card px-5 py-6 ring-1 ring-foreground/10 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">
              {short ? "Short after essentials" : "Left after essentials"}
            </h2>
            <p
              className={`font-display mt-1 text-5xl tracking-tight tabular-nums sm:text-6xl ${short ? "text-destructive" : "text-primary"}`}
            >
              {formatAud(totals.leftAfterEssentials)}
            </p>
            <p className="mt-2 text-muted-foreground">
              a {PERIOD_NOUN[view]}
              {view === "fortnightly" ? null : ` · ${formatAud(fortnightly)} a fortnight`}
              {view === "annually" ? null : ` · ${formatAud(yearly)} a year`}
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-1 rounded-xl bg-muted p-1" role="group" aria-label="View totals as">
            {VIEWS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={`rounded-lg px-2.5 py-1.5 text-sm ${view === option ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {FREQUENCY_LABEL[option]}
              </button>
            ))}
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Income" value={totals.income} />
          <Stat label="Essentials" value={totals.essential} />
          <Stat label="Discretionary" value={totals.discretionary} />
          <Stat label="Set aside" value={totals.setAside} />
          <Stat label="Left over" value={totals.leftOver} emphasize />
        </dl>
        <ShareBar
          income={totals.income}
          essential={totals.essential}
          discretionary={totals.discretionary}
          setAside={totals.setAside}
        />
      </section>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {pending ? <p className="no-print mt-3 text-sm text-muted-foreground">Saving…</p> : null}

      <Group
        title="Income"
        description="Take-home pay and anything else that comes in. Enter the amount you actually receive, in the frequency it arrives."
        total={totals.income}
        view={view}
      >
        <ColumnHead view={view} />
        {items
          .filter((item) => item.kind === "income" && !item.hidden)
          .map((item) => (
            <MoneyRow
              key={item.id}
              item={item}
              view={view}
              onPatch={(patch) => patchItem(item.id, patch)}
              onDelete={() => {
                startTransition(async () => {
                  const result = await removeItem(item.id);
                  if (!result.ok) setError(result.error);
                  else setItems((current) => current.filter((row) => row.id !== item.id));
                });
              }}
            />
          ))}
        <AddLine onAdd={(name) => addLine("income", "income", name)} />
      </Group>

      <Group
        title="Essentials"
        description="Non-discretionary spending: housing, bills, food, insurance, transport, and care. Blank lines are waiting to be filled in and are left out of the totals."
        total={totals.essential}
        view={view}
      >
        {SECTIONS.filter((section) => section.id !== "income").map((section) => {
          const rows = items.filter(
            (item) => item.kind === "essential" && item.section === section.id && !item.hidden,
          );
          if (rows.length === 0 && section.id === "added") return null;
          if (rows.length === 0) return null;
          const subtotal = rows.reduce((sum, item) => {
            if (item.amountCents == null) return sum;
            return sum + (summarise([item], view).essential);
          }, 0);
          return (
            <Subsection key={section.id} title={section.label} total={subtotal}>
              <ColumnHead view={view} />
              {rows.map((item) => (
                <MoneyRow
                  key={item.id}
                  item={item}
                  view={view}
                  onPatch={(patch) => patchItem(item.id, patch)}
                  onDelete={() => {
                    startTransition(async () => {
                      const result = await removeItem(item.id);
                      if (!result.ok) setError(result.error);
                      else setItems((current) => current.filter((row) => row.id !== item.id));
                    });
                  }}
                />
              ))}
              <AddLine onAdd={(name) => addLine(section.id, "essential", name)} />
            </Subsection>
          );
        })}
      </Group>

      <Group
        title="Set aside"
        description="Savings, extra super, and investments. This is money you keep, so it comes out of what is left over and is not treated as spending."
        total={totals.setAside}
        view={view}
      >
        <ColumnHead view={view} />
        {items
          .filter((item) => item.kind === "set_aside" && !item.hidden)
          .map((item) => (
            <MoneyRow
              key={item.id}
              item={item}
              view={view}
              onPatch={(patch) => patchItem(item.id, patch)}
              onDelete={() => {
                startTransition(async () => {
                  const result = await removeItem(item.id);
                  if (!result.ok) setError(result.error);
                  else setItems((current) => current.filter((row) => row.id !== item.id));
                });
              }}
            />
          ))}
        <AddLine onAdd={(name) => addLine("added", "set_aside", name)} />
      </Group>

      <section className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl">Discretionary</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Eating out, holidays, clothing, pay TV, and the other flexible lines.
              {discretionaryHasAmount ? "" : " Nothing is entered here yet."}
            </p>
          </div>
          <p className="text-sm font-medium tabular-nums">{formatAud(totals.discretionary)} a {PERIOD_NOUN[view]}</p>
        </div>
        {discretionaryOpen ? (
          <div className="mt-4">
            {SECTIONS.filter((section) => section.id !== "income").map((section) => {
              const rows = items.filter(
                (item) => item.kind === "discretionary" && item.section === section.id && !item.hidden,
              );
              if (rows.length === 0) return null;
              return (
                <Subsection key={section.id} title={section.label}>
                  {rows.map((item) => (
                    <MoneyRow
                      key={item.id}
                      item={item}
                      view={view}
                      onPatch={(patch) => patchItem(item.id, patch)}
                      onDelete={() => {
                        startTransition(async () => {
                          const result = await removeItem(item.id);
                          if (!result.ok) setError(result.error);
                          else setItems((current) => current.filter((row) => row.id !== item.id));
                        });
                      }}
                    />
                  ))}
                  <AddLine onAdd={(name) => addLine(section.id, "discretionary", name)} />
                </Subsection>
              );
            })}
            {!discretionaryHasAmount ? (
              <Button variant="ghost" className="no-print mt-2" onClick={() => setShowDiscretionary(false)}>
                Tuck these away
              </Button>
            ) : null}
          </div>
        ) : (
          <Button variant="outline" className="no-print mt-4" onClick={() => setShowDiscretionary(true)}>
            Show discretionary lines
          </Button>
        )}
      </section>

      {hidden.length > 0 ? (
        <section className="no-print mt-10">
          <Button variant="ghost" onClick={() => setShowHidden((value) => !value)}>
            {showHidden ? "Hide" : "Show"} hidden lines ({hidden.length})
          </Button>
          {showHidden ? (
            <ul className="mt-3 divide-y divide-border rounded-2xl bg-card px-4 ring-1 ring-foreground/10">
              {hidden.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <span>{item.name}</span>
                  <Button size="sm" variant="outline" onClick={() => patchItem(item.id, { hidden: false })}>
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <p className="mt-12 max-w-2xl text-sm text-muted-foreground">
        Totals use the same periods as the MoneySmart sheet: 52 weeks, 26 fortnights, 12 months, 4 quarters, and 1 year.
        Blank lines are left out until you enter an amount.
      </p>
    </main>
  );
}

function Stat({ label, value, emphasize = false }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={`mt-1 text-lg font-medium tabular-nums ${emphasize && value < 0 ? "text-destructive" : ""}`}>
        {formatAud(value)}
      </dd>
    </div>
  );
}

function ShareBar({
  income,
  essential,
  discretionary,
  setAside,
}: {
  income: number;
  essential: number;
  discretionary: number;
  setAside: number;
}) {
  if (income <= 0) return null;
  const scale = Math.max(income, essential + discretionary + setAside);
  const width = (value: number) => `${Math.max(0, (value / scale) * 100)}%`;
  return (
    <div className="mt-6">
      <div className="flex h-3 overflow-hidden rounded-full bg-[var(--track)]">
        <span className="bg-[var(--essential)]" style={{ width: width(essential) }} />
        <span className="bg-[var(--discretionary)]" style={{ width: width(discretionary) }} />
        <span className="bg-[var(--aside)]" style={{ width: width(setAside) }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Green is essentials, amber is discretionary, blue is set aside, against income.
      </p>
    </div>
  );
}

function Group({
  title,
  description,
  total,
  view,
  children,
}: {
  title: string;
  description: string;
  total: number;
  view: Frequency;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <p className="text-sm font-medium tabular-nums">
          {formatAud(total)} a {PERIOD_NOUN[view]}
        </p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Subsection({
  title,
  total,
  children,
}: {
  title: string;
  total?: number;
  children: ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-wide uppercase">{title}</h3>
        {total != null ? <p className="text-sm tabular-nums text-muted-foreground">{formatAud(total)}</p> : null}
      </div>
      {children}
    </div>
  );
}

function ColumnHead({ view }: { view: Frequency }) {
  return (
    <div className="mt-2 hidden grid-cols-[minmax(0,1.4fr)_8.75rem_10.25rem_7.5rem_2.25rem] gap-3 px-2 text-xs tracking-wide text-muted-foreground uppercase sm:grid">
      <span>Line</span>
      <span className="text-right">Amount</span>
      <span>Frequency</span>
      <span className="text-right">Each {PERIOD_NOUN[view]}</span>
      <span className="sr-only">Options</span>
    </div>
  );
}

function AddLine({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="no-print mt-2" onClick={() => setOpen(true)}>
        Add a line
      </Button>
    );
  }
  return (
    <form
      className="no-print mt-3 flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        onAdd(name);
        setName("");
        setOpen(false);
      }}
    >
      <Input
        aria-label="New line name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Line name"
        required
        autoFocus
      />
      <div className="flex gap-2">
        <Button type="submit">Add</Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setName("");
            setOpen(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
