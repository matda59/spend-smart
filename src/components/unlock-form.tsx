"use client";

import { useState, useTransition } from "react";
import { unlockBudget } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UnlockForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-16">
      <p className="text-sm font-medium tracking-wide text-[#1f4d38] uppercase">
        Household budget
      </p>
      <h1 className="font-display mt-2 text-4xl text-balance">Unlock the budget</h1>
      <p className="mt-3 text-muted-foreground">
        This copy is shared by the two of you. Enter the passphrase to see the figures.
      </p>
      <form
        className="mt-8 space-y-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await unlockBudget(password);
            if (!result.ok) setError(result.error);
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="passphrase">Passphrase</Label>
          <Input
            id="passphrase"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Checking…" : "Unlock"}
        </Button>
      </form>
    </main>
  );
}
