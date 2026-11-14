"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { createItem, lockBudget, removeItem, restoreBudget, saveArrangement, saveItem, saveLeftoverGoal } from "@/app/actions";
import { MoneyRow } from "@/components/money-row";
import { PassphraseDialog } from "@/components/passphrase-dialog";
import { ShareBar } from "@/components/share-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { placeLine } from "@/lib/arrange";
import { groupColor } from "@/lib/bars";
import { FREQUENCY_LABEL, PERIOD_NOUN, formatAud, formatPlain, isFrequency, parseDollars, plainLeft, shareOf, summarise, viewCents } from "@/lib/money";
import type { LeftoverGoal } from "@/lib/profile";
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
  goal,
}: {
  initialItems: BudgetItem[];
  envLocked: boolean;
  storedPassword: boolean;
  householdName: string;
  goal: LeftoverGoal;
}) {
  const hasAmounts = initialItems.some((item) => !item.hidden && item.amountCents != null);
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<Frequency>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [showDiscretionary, setShowDiscretionary] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showEmpty, setShowEmpty] = useState(!hasAmounts);
  const [history, setHistory] = useState<BudgetItem[][]>([]);
  const [closed, setClosed] = useState<string[]>([]);
  const [keptVisible, setKeptVisible] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totals = useMemo(() => summarise(items, view), [items, view]);
  const yearly = useMemo(() => summarise(items, "annually").leftAfterEssentials, [items]);
  const fortnightly = useMemo(() => summarise(items, "fortnightly").leftAfterEssentials, [items]);
  const hidden = items.filter((item) => item.hidden);
  const discretionaryHasAmount = items.some(
    (item) => item.kind === "discretionary" && !item.hidden && item.amountCents != null,
  );
  const discretionaryOpen = showDiscretionary || discretionaryHasAmount || dragId != null;
  const short = totals.leftAfterEssentials < 0;
  const essentialShare = shareOf(totals.essential, totals.income);
  const discretionaryShare = shareOf(totals.discretionary, totals.income);
  const setAsideShare = shareOf(totals.setAside, totals.income);
  const leftOverShare = shareOf(totals.leftOver, totals.income);
  const goalInView = goal.cents == null ? null : viewCents(goal.cents, goal.frequency, view);
  const underGoal = goalInView != null && totals.leftOver < goalInView;

  useEffect(() => {
    const storedView = localStorage.getItem("spend-smart-view");
    if (storedView && isFrequency(storedView)) setView(storedView);
    const storedEmpty = localStorage.getItem("spend-smart-show-empty");
    if (storedEmpty === "1" || storedEmpty === "0") setShowEmpty(storedEmpty === "1");
    const storedClosed = localStorage.getItem("spend-smart-closed");
    if (!storedClosed) return;
    try {
      const parsed = JSON.parse(storedClosed) as unknown;
      if (Array.isArray(parsed)) setClosed(parsed.filter((value) => typeof value === "string"));
    } catch {
      localStorage.removeItem("spend-smart-closed");
    }
  }, []);

  function remember() {
    setHistory((stack) => [...stack, items].slice(-8));
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((stack) => stack.slice(0, -1));
    setError(null);
    setItems(previous);
    startTransition(async () => {
      const result = await restoreBudget(previous);
      if (!result.ok) setError(result.error);
    });
  }

  function chooseView(next: Frequency) {
    setView(next);
    localStorage.setItem("spend-smart-view", next);
  }

  function toggleEmpty() {
    setShowEmpty((current) => {
      const next = !current;
      localStorage.setItem("spend-smart-show-empty", next ? "1" : "0");
      return next;
    });
  }

  function sectionOpen(kind: Kind, section: SectionId) {
    if (dragId) return true;
    return !closed.includes(`${kind}:${section}`);
  }

  function toggleSection(kind: Kind, section: SectionId) {
    const key = `${kind}:${section}`;
    setClosed((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      localStorage.setItem("spend-smart-closed", JSON.stringify(next));
      return next;
    });
  }

  function shownRows(rows: BudgetItem[], kind: Kind) {
    if (kind === "income" || showEmpty || dragId) return rows;
    if (kind === "discretionary" && showDiscretionary && !discretionaryHasAmount) return rows;
    return rows.filter((row) => row.amountCents != null || keptVisible.includes(row.id));
  }

  function patchItem(id: string, patch: Parameters<typeof saveItem>[1]) {
    remember();
    setError(null);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    startTransition(async () => {
      const result = await saveItem(id, patch);
      if (!result.ok) setError(result.error);
    });
  }

  function moveLine(id: string, dest: { kind: Kind; section: SectionId; index: number }) {
    const next = placeLine(items, { id, ...dest });
    if (!next || next === items) return;
    remember();
    setError(null);
    setItems(next);
    startTransition(async () => {
      const result = await saveArrangement(
        next.map((item) => ({ id: item.id, kind: item.kind, section: item.section, sort: item.sort })),
      );
      if (!result.ok) setError(result.error);
    });
  }

  function addLine(section: SectionId, kind: Kind, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    remember();
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
      setKeptVisible((current) => [...current, result.item.id]);
      setItems((current) => [...current, result.item]);
    });
  }

  function deleteRow(id: string) {
    remember();
    startTransition(async () => {
      const result = await removeItem(id);
      if (!result.ok) setError(result.error);
      else setItems((current) => current.filter((row) => row.id !== id));
    });
  }

  function renderLines(rows: BudgetItem[], kind: Kind, section: SectionId) {
    function destination(id: string) {
      if (kind === "income") return { kind: "income" as const, section: "income" as const };
      if (kind === "set_aside") {
        const dragged = items.find((item) => item.id === id);
        return {
          kind: "set_aside" as const,
          section: dragged && dragged.section !== "income" ? dragged.section : ("added" as const),
        };
      }
      return { kind, section };
    }

    return (
      <div
        onDragOver={(event) => {
          if (!dragIdRef.current) return;
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          const id = event.dataTransfer.getData("text/plain") || dragIdRef.current;
          if (!id) return;
          moveLine(id, { ...destination(id), index: rows.length });
          dragIdRef.current = null;
          setDragId(null);
        }}
      >
        {rows.map((item, index) => (
          <div
            key={item.id}
            onDragOver={(event) => {
              if (!dragIdRef.current || dragIdRef.current === item.id) return;
              event.preventDefault();
              event.stopPropagation();
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const id = event.dataTransfer.getData("text/plain") || dragIdRef.current;
              if (!id || id === item.id) return;
              moveLine(id, { ...destination(id), index });
              dragIdRef.current = null;
              setDragId(null);
            }}
            className={dragId && dragId !== item.id ? "rounded-lg hover:bg-primary/10" : undefined}
          >
            <MoneyRow
              item={item}
              view={view}
              incomeCents={totals.income}
              swatch={groupColor(item.kind)}
              onPatch={(patch) => patchItem(item.id, patch)}
              onDelete={() => deleteRow(item.id)}
              onPlace={(dest) => moveLine(item.id, { ...dest, index: 9999 })}
              onDragStart={() => {
                dragIdRef.current = item.id;
                setDragId(item.id);
              }}
              onDragEnd={() => {
                dragIdRef.current = null;
                setDragId(null);
              }}
            />
          </div>
        ))}
        {dragId && rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary/40 px-3 py-4 text-sm text-muted-foreground">
            Drop a line here
          </p>
        ) : null}
      </div>
    );
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
            Drag a line by its handle to move it, or use the row menu. Amounts stay on this server.
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <Link href="/export">Export</Link>
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
            <p className="mt-3 max-w-xl text-sm">{plainLeft(totals, view)}</p>
            {underGoal && goalInView != null ? (
              <p className="mt-1 max-w-xl text-sm text-destructive">
                Left over is under the {formatAud(goalInView)} you want to keep this {PERIOD_NOUN[view]}.
              </p>
            ) : null}
          </div>
          <div className="no-print flex flex-wrap gap-1 rounded-xl bg-muted p-1" role="group" aria-label="View totals as">
            {VIEWS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => chooseView(option)}
                className={`rounded-lg px-2.5 py-1.5 text-sm ${view === option ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {FREQUENCY_LABEL[option]}
              </button>
            ))}
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Income" value={totals.income} />
          <Stat label="Essentials" value={totals.essential} share={essentialShare} />
          <Stat label="Discretionary" value={totals.discretionary} share={discretionaryShare} />
          <Stat label="Set aside" value={totals.setAside} share={setAsideShare} />
          <Stat label="Left over" value={totals.leftOver} share={leftOverShare} emphasize />
        </dl>
        <ShareBar items={items} view={view} />
        <KeepAtLeast cents={goal.cents} frequency={goal.frequency} />
      </section>

      <div className="no-print mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={toggleEmpty}>
          {showEmpty ? "Hide empty lines" : "Show empty lines"}
        </Button>
        {history.length > 0 ? (
          <Button variant="outline" size="sm" onClick={undo}>
            Undo
          </Button>
        ) : null}
      </div>

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
        {renderLines(
          shownRows(
            items.filter((item) => item.kind === "income" && !item.hidden),
            "income",
          ),
          "income",
          "income",
        )}
        <AddLine onAdd={(name) => addLine("income", "income", name)} />
      </Group>

      <Group
        title="Essentials"
        description="Non-discretionary spending: housing, bills, food, insurance, transport, and care. Blank lines are waiting to be filled in and are left out of the totals."
        total={totals.essential}
        share={essentialShare}
        view={view}
      >
        {SECTIONS.filter((section) => section.id !== "income").map((section) => {
          const rows = shownRows(
            items.filter((item) => item.kind === "essential" && item.section === section.id && !item.hidden),
            "essential",
          );
          if (rows.length === 0 && !dragId) return null;
          const subtotal = rows.reduce((sum, item) => {
            if (item.amountCents == null) return sum;
            return sum + (summarise([item], view).essential);
          }, 0);
          return (
            <Subsection
              key={section.id}
              title={section.label}
              total={rows.length === 0 ? undefined : subtotal}
              open={sectionOpen("essential", section.id)}
              onToggle={() => toggleSection("essential", section.id)}
            >
              <ColumnHead view={view} />
              {renderLines(rows, "essential", section.id)}
              <AddLine onAdd={(name) => addLine(section.id, "essential", name)} />
            </Subsection>
          );
        })}
      </Group>

      <Group
        title="Set aside"
        description="Savings, extra super, and investments. This is money you keep, so it comes out of what is left over and is not treated as spending."
        total={totals.setAside}
        share={setAsideShare}
        view={view}
      >
        <ColumnHead view={view} />
        {renderLines(
          shownRows(
            items.filter((item) => item.kind === "set_aside" && !item.hidden),
            "set_aside",
          ),
          "set_aside",
          "added",
        )}
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
          <p className="text-sm font-medium tabular-nums">
            {formatAud(totals.discretionary)} a {PERIOD_NOUN[view]}
            {discretionaryShare ? ` · ${discretionaryShare} of income` : ""}
          </p>
        </div>
        {discretionaryOpen ? (
          <div className="mt-4">
            {SECTIONS.filter((section) => section.id !== "income").map((section) => {
              const rows = shownRows(
                items.filter((item) => item.kind === "discretionary" && item.section === section.id && !item.hidden),
                "discretionary",
              );
              if (rows.length === 0 && !dragId) return null;
              return (
                <Subsection
                  key={section.id}
                  title={section.label}
                  open={sectionOpen("discretionary", section.id)}
                  onToggle={() => toggleSection("discretionary", section.id)}
                >
                  {renderLines(rows, "discretionary", section.id)}
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

function Stat({
  label,
  value,
  share = null,
  emphasize = false,
}: {
  label: string;
  value: number;
  share?: string | null;
  emphasize?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={`mt-1 text-lg font-medium tabular-nums ${emphasize && value < 0 ? "text-destructive" : ""}`}>
        {formatAud(value)}
      </dd>
      {share ? <p className={`text-xs tabular-nums ${value < 0 ? "text-destructive" : "text-muted-foreground"}`}>{share} of income</p> : null}
    </div>
  );
}

function Group({
  title,
  description,
  total,
  share = null,
  view,
  children,
}: {
  title: string;
  description: string;
  total: number;
  share?: string | null;
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
          {share ? ` · ${share} of income` : ""}
        </p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Subsection({
  title,
  total,
  open = true,
  onToggle,
  children,
}: {
  title: string;
  total?: number;
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mt-6">
      <button
        type="button"
        className="flex w-full items-baseline justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <h3 className="text-sm font-semibold tracking-wide uppercase">{title}</h3>
        <span className="flex items-center gap-2">
          {total != null ? <span className="text-sm tabular-nums text-muted-foreground">{formatAud(total)}</span> : null}
          <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
        </span>
      </button>
      {open ? children : null}
    </div>
  );
}

function KeepAtLeast({ cents, frequency }: { cents: number | null; frequency: Frequency }) {
  const [amount, setAmount] = useState(cents == null ? "" : formatPlain(cents));
  const [period, setPeriod] = useState(frequency);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(nextAmount: string, nextPeriod: Frequency) {
    const parsed = parseDollars(nextAmount);
    if (!parsed.ok) {
      setMessage(parsed.error);
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await saveLeftoverGoal(parsed.cents, nextPeriod);
      if (!result.ok) setMessage(result.error);
    });
  }

  return (
    <form
      className="no-print mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      onSubmit={(event) => {
        event.preventDefault();
        save(amount, period);
      }}
    >
      <label htmlFor="keep-at-least" className="text-sm text-muted-foreground">
        Keep at least
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id="keep-at-least"
          inputMode="decimal"
          value={amount}
          placeholder="Amount"
          onChange={(event) => {
            setAmount(event.target.value);
            setMessage(null);
          }}
          onBlur={() => save(amount, period)}
          className="w-32 pl-6"
        />
      </div>
      <span className="text-sm text-muted-foreground">left each</span>
      <select
        aria-label="How often to keep that amount"
        value={period}
        onChange={(event) => {
          const next = event.target.value as Frequency;
          setPeriod(next);
          save(amount, next);
        }}
        className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {VIEWS.map((option) => (
          <option key={option} value={option}>
            {PERIOD_NOUN[option]}
          </option>
        ))}
      </select>
      {pending ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
      {message ? (
        <span role="alert" className="text-xs text-destructive">
          {message}
        </span>
      ) : null}
    </form>
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
