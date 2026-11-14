"use client";

import { useState, useTransition } from "react";
import { saveHouseholdProfile } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PrintPackButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Print or save as PDF
    </Button>
  );
}

export function AdvisorProfileForm({
  householdName,
  advisorNote,
}: {
  householdName: string;
  advisorNote: string;
}) {
  const [name, setName] = useState(householdName);
  const [note, setNote] = useState(advisorNote);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="no-print space-y-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await saveHouseholdProfile(name, note);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSaved(true);
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="household-name">Household name</Label>
        <Input
          id="household-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          placeholder="The name your advisor should see"
          maxLength={60}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="advisor-note">Note for your advisor</Label>
        <textarea
          id="advisor-note"
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setSaved(false);
          }}
          maxLength={600}
          rows={4}
          placeholder="Anything they should know before reading the figures."
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save on the pack"}
        </Button>
        {saved ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
      </div>
    </form>
  );
}
