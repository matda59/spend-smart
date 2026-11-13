"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { FREQUENCY_LABEL, formatAud, formatPlain, parseDollars, viewCents } from "@/lib/money";
import {
  FREQUENCIES,
  SECTIONS,
  type BudgetItem,
  type Frequency,
  type Kind,
} from "@/lib/types";

const KIND_LABEL: Record<Exclude<Kind, "income">, string> = {
  essential: "Essential",
  discretionary: "Discretionary",
  set_aside: "Set aside",
};

export function MoneyRow({
  item,
  view,
  onPatch,
  onDelete,
}: {
  item: BudgetItem;
  view: Frequency;
  onPatch: (patch: {
    name?: string;
    amountCents?: number | null;
    frequency?: Frequency;
    kind?: Kind;
    hidden?: boolean;
  }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amountCents == null ? "" : formatPlain(item.amountCents));
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    setName(item.name);
  }, [item.name]);

  useEffect(() => {
    setAmount(item.amountCents == null ? "" : formatPlain(item.amountCents));
    setAmountError(null);
  }, [item.amountCents]);

  const converted =
    item.amountCents == null ? null : viewCents(item.amountCents, item.frequency, view);
  const sectionLabel = SECTIONS.find((section) => section.id === item.section)?.label;

  return (
    <div className="grid grid-cols-1 gap-2 border-b border-border/70 py-3 sm:grid-cols-[minmax(0,1.4fr)_8.75rem_10.25rem_7.5rem_2.25rem] sm:items-center sm:gap-3">
      <div className="min-w-0">
        <Input
          aria-label={`Name for ${item.name}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            const trimmed = name.trim();
            if (trimmed && trimmed !== item.name) onPatch({ name: trimmed });
            else setName(item.name);
          }}
          className="border-transparent bg-transparent px-2 shadow-none hover:border-input focus-visible:bg-card"
        />
        {sectionLabel && item.kind !== "income" ? (
          <p className="px-2 text-xs text-muted-foreground sm:hidden">{sectionLabel}</p>
        ) : null}
      </div>
      <div>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            inputMode="decimal"
            aria-label={`Amount for ${item.name}`}
            aria-invalid={amountError ? true : undefined}
            value={amount}
            placeholder="Amount"
            onChange={(event) => {
              setAmount(event.target.value);
              setAmountError(null);
            }}
            onBlur={() => {
              const parsed = parseDollars(amount);
              if (!parsed.ok) {
                setAmountError(parsed.error);
                return;
              }
              if (parsed.cents !== item.amountCents) onPatch({ amountCents: parsed.cents });
            }}
            className="pl-6 text-right tabular-nums"
          />
        </div>
        {amountError ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {amountError}
          </p>
        ) : null}
      </div>
      <select
        aria-label={`Frequency for ${item.name}`}
        value={item.frequency}
        onChange={(event) => onPatch({ frequency: event.target.value as Frequency })}
        className="h-8 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {FREQUENCIES.map((frequency) => (
          <option key={frequency} value={frequency}>
            {FREQUENCY_LABEL[frequency]}
          </option>
        ))}
      </select>
      <p className="text-right text-sm font-medium tabular-nums sm:text-base">
        {converted == null ? <span className="text-muted-foreground">—</span> : formatAud(converted)}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="no-print justify-self-end" aria-label={`Options for ${item.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {item.kind === "income" ? (
            <DropdownMenuLabel>Income line</DropdownMenuLabel>
          ) : (
            <>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {(Object.keys(KIND_LABEL) as Array<Exclude<Kind, "income">>).map((kind) => (
                <DropdownMenuItem
                  key={kind}
                  disabled={item.kind === kind}
                  onSelect={() => onPatch({ kind })}
                >
                  {KIND_LABEL[kind]}
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onPatch({ hidden: true })}>Hide</DropdownMenuItem>
          {item.custom ? (
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              Remove
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
