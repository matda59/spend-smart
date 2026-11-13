"use client";

import { useState, useTransition } from "react";
import { removePassphrase, setPassphrase } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PassphraseDialog({
  envLocked,
  storedPassword,
}: {
  envLocked: boolean;
  storedPassword: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState("");
  const [current, setCurrent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setNext("");
    setCurrent("");
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="no-print">
          {envLocked || storedPassword ? "Passphrase" : "Set a passphrase"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Passphrase</DialogTitle>
          <DialogDescription>
            {envLocked
              ? "The passphrase is set with BUDGET_PASSWORD on the server. Change it there, then restart the container."
              : storedPassword
                ? "Anyone who can open this address needs the passphrase. Removing it leaves the budget open on your network."
                : "Until you set one, anyone who can open this address can see and edit the budget."}
          </DialogDescription>
        </DialogHeader>
        {envLocked ? null : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await setPassphrase(next, current);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                reset();
              });
            }}
          >
            {storedPassword ? (
              <div className="space-y-2">
                <Label htmlFor="current-passphrase">Current passphrase</Label>
                <Input
                  id="current-passphrase"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="new-passphrase">New passphrase</Label>
              <Input
                id="new-passphrase"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
                minLength={8}
                required
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              {storedPassword ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const result = await removePassphrase(current);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setOpen(false);
                      reset();
                    });
                  }}
                >
                  Remove
                </Button>
              ) : null}
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save passphrase"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
