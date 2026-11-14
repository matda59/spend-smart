import { connection } from "next/server";
import { BudgetApp } from "@/components/budget-app";
import { LoginScreen } from "@/components/login-screen";
import { envPassword, hasStoredPassword, isUnlocked, loginIsConfigured } from "@/lib/auth";
import { listItems } from "@/lib/budget";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  await connection();

  try {
    if (!loginIsConfigured()) {
      return <LoginScreen mode="create" />;
    }

    if (!(await isUnlocked())) {
      return <LoginScreen mode="sign-in" />;
    }

    return (
      <BudgetApp
        initialItems={listItems()}
        envLocked={envPassword() != null}
        storedPassword={hasStoredPassword()}
        householdName={getProfile().householdName}
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
