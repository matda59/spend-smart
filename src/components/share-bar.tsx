"use client";

import { useState } from "react";
import { barSeries, type BarSlice } from "@/lib/bars";
import { PERIOD_NOUN, formatAud, shareOf, summarise } from "@/lib/money";
import type { BudgetItem, Frequency } from "@/lib/types";

export function ShareBar({ items, view }: { items: BudgetItem[]; view: Frequency }) {
  const { income, uses, scale } = barSeries(items, view);
  const totals = summarise(items, view);
  const [active, setActive] = useState<string | null>(null);
  if (scale <= 0) return null;

  const incomeTotal = income.reduce((sum, slice) => sum + slice.cents, 0);
  const base = incomeTotal > 0 ? incomeTotal : scale;
  const of = incomeTotal > 0 ? "of income" : "of this total";
  const slices = [...income, ...uses];
  const current = slices.find((slice) => slice.id === active) ?? null;
  const currentShare = current ? shareOf(current.cents, base) : null;
  const where = [
    { name: "Essentials", cents: totals.essential, color: "var(--essential)" },
    { name: "Discretionary", cents: totals.discretionary, color: "var(--discretionary)" },
    { name: "Set aside", cents: totals.setAside, color: "var(--aside)" },
    { name: "Left over", cents: totals.leftOver, color: "var(--leftover)" },
  ];

  return (
    <div className="mt-6">
      <BarRow label="Income" slices={income} scale={scale} base={base} of={of} active={active} onActive={setActive} />
      <Shares slices={income} base={base} active={active} onActive={setActive} />
      <BarRow label="Where it goes" slices={uses} scale={scale} base={base} of={of} active={active} onActive={setActive} />
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {where.map((part) => (
          <li key={part.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: part.color }} aria-hidden />
            <span>{part.name}</span>
            <span className={`tabular-nums ${part.cents < 0 ? "text-destructive" : "text-foreground"}`}>
              {shareOf(part.cents, base) ?? "—"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 min-h-5 text-sm" aria-live="polite">
        {current && currentShare ? (
          <>
            <span className="font-medium">{current.name}</span>
            <span className="text-muted-foreground">
              {" "}
              · {current.group} · {formatAud(current.cents)} a {PERIOD_NOUN[view]} · {currentShare} {of}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Hover a colour to see that line’s share {of}.</span>
        )}
      </p>
    </div>
  );
}

function Shares({
  slices,
  base,
  active,
  onActive,
}: {
  slices: BarSlice[];
  base: number;
  active: string | null;
  onActive: (id: string | null) => void;
}) {
  if (slices.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {slices.map((slice) => (
        <li key={slice.id}>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 text-xs ${active === slice.id ? "font-medium text-foreground" : "text-muted-foreground"}`}
            onPointerEnter={() => onActive(slice.id)}
            onFocus={() => onActive(slice.id)}
            onClick={() => onActive(slice.id)}
          >
            <span className="size-2 rounded-full" style={{ background: slice.color }} aria-hidden />
            <span>{slice.name}</span>
            <span className="tabular-nums text-foreground">{shareOf(slice.cents, base)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function BarRow({
  label,
  slices,
  scale,
  base,
  of,
  active,
  onActive,
}: {
  label: string;
  slices: BarSlice[];
  scale: number;
  base: number;
  of: string;
  active: string | null;
  onActive: (id: string | null) => void;
}) {
  if (slices.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-1 text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex h-8 overflow-hidden rounded-full bg-[var(--track)]">
        {slices.map((slice) => {
          const share = shareOf(slice.cents, base);
          return (
            <button
              key={slice.id}
              type="button"
              className={`h-full min-w-1.5 ${active === slice.id ? "brightness-125" : ""}`}
              style={{
                width: `${Math.max(0, (slice.cents / scale) * 100)}%`,
                background: slice.color,
              }}
              aria-label={`${slice.name}, ${slice.group}, ${formatAud(slice.cents)}, ${share ?? ""} ${of}`}
              onPointerEnter={() => onActive(slice.id)}
              onFocus={() => onActive(slice.id)}
              onClick={() => onActive(slice.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
