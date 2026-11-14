"use client";

import { useState } from "react";
import { barSeries, type BarSlice } from "@/lib/bars";
import { PERIOD_NOUN, formatAud } from "@/lib/money";
import type { BudgetItem, Frequency } from "@/lib/types";

export function ShareBar({ items, view }: { items: BudgetItem[]; view: Frequency }) {
  const { income, uses, scale } = barSeries(items, view);
  const [active, setActive] = useState<string | null>(null);
  if (scale <= 0) return null;

  const slices = [...income, ...uses];
  const current = slices.find((slice) => slice.id === active) ?? null;

  return (
    <div className="mt-6">
      <BarRow label="Income" slices={income} scale={scale} active={active} onActive={setActive} />
      <BarRow label="Where it goes" slices={uses} scale={scale} active={active} onActive={setActive} />
      <p className="mt-2 min-h-5 text-sm" aria-live="polite">
        {current ? (
          <>
            <span className="font-medium">{current.name}</span>
            <span className="text-muted-foreground">
              {" "}
              · {current.group} · {formatAud(current.cents)} a {PERIOD_NOUN[view]}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Hover a colour to see that line.</span>
        )}
      </p>
    </div>
  );
}

function BarRow({
  label,
  slices,
  scale,
  active,
  onActive,
}: {
  label: string;
  slices: BarSlice[];
  scale: number;
  active: string | null;
  onActive: (id: string | null) => void;
}) {
  if (slices.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex h-8 overflow-hidden rounded-full bg-[var(--track)]">
        {slices.map((slice) => (
          <button
            key={slice.id}
            type="button"
            className={`h-full min-w-1.5 ${active === slice.id ? "brightness-125" : ""}`}
            style={{
              width: `${Math.max(0, (slice.cents / scale) * 100)}%`,
              background: slice.color,
            }}
            aria-label={`${slice.name}, ${slice.group}, ${formatAud(slice.cents)}`}
            onPointerEnter={() => onActive(slice.id)}
            onFocus={() => onActive(slice.id)}
            onClick={() => onActive(slice.id)}
          />
        ))}
      </div>
    </div>
  );
}
