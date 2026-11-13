import { connection } from "next/server";
import { BudgetApp } from "@/components/budget-app";
import { UnlockForm } from "@/components/unlock-form";
import { envPassword, hasStoredPassword, isUnlocked } from "@/lib/auth";
import { listItems } from "@/lib/budget";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  await connection();

  try {
    if (!(await isUnlocked())) {
      return <UnlockForm />;
    }

    return (
      <BudgetApp
        initialItems={listItems()}
        envLocked={envPassword() != null}
        storedPassword={hasStoredPassword()}
      />
    );
  } catch (error) {
    console.error(error);
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5">
        <h1 className="font-display text-4xl">The budget file could not be opened</h1>
        <p className="mt-3 text-muted-foreground">
          The data folder needs to be writable. Check the volume mount, then reload this page.
        </p>
      </main>
    );
  }
}
