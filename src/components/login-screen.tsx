"use client";

import { useState, useTransition } from "react";
import { createLogin, unlockBudget } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginScreen({ mode }: { mode: "create" | "sign-in" }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const creating = mode === "create";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-16">
      <div className="mb-8 flex justify-end">
        <ThemeToggle />
      </div>
      <p className="text-sm font-medium tracking-wide text-primary uppercase">Household budget</p>
      <h1 className="font-display mt-2 text-4xl text-balance">
        {creating ? "Create a login" : "Sign in"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {creating
          ? "The budget stays closed until this password is set. You will both use the same login."
          : "This copy is shared by the two of you. Enter the password to see the figures."}
      </p>
      <form
        className="mt-8 space-y-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = creating
              ? await createLogin(password, confirm)
              : await unlockBudget(password);
            if (!result.ok) setError(result.error);
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={creating ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={creating ? 8 : undefined}
            required
          />
        </div>
        {creating ? (
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              minLength={8}
              required
            />
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Checking…" : creating ? "Create login" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
