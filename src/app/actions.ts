"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  SESSION_COOKIE,
  checkPassphrase,
  clearPassword,
  clearSession,
  cookieOptions,
  envPassword,
  hasStoredPassword,
  isUnlocked,
  loginIsConfigured,
  savePassword,
  startSession,
} from "@/lib/auth";
import { addItem, arrangeItems, deleteItem, restoreItems, updateItem } from "@/lib/budget";
import { saveGoal, saveProfile as writeProfile } from "@/lib/profile";
import type { BudgetItem, Frequency, ItemPatch, Kind, SectionId } from "@/lib/types";

type Arrangement = { id: string; kind: Kind; section: SectionId; sort: number }[];

async function gate() {
  if (await isUnlocked()) return null;
  return "Sign in first.";
}

async function cookieSecure() {
  const proto = (await headers()).get("x-forwarded-proto");
  return proto === "https";
}

export async function createLogin(password: string, confirm: string) {
  if (loginIsConfigured()) {
    return { ok: false as const, error: "A login is already set." };
  }
  if (password !== confirm) {
    return { ok: false as const, error: "Those passwords do not match." };
  }
  if (password.trim().length < 8) {
    return { ok: false as const, error: "Use at least 8 characters." };
  }
  savePassword(password.trim());
  const token = startSession();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    ...cookieOptions,
    secure: await cookieSecure(),
  });
  revalidatePath("/");
  return { ok: true as const };
}

export async function unlockBudget(password: string) {
  const message = checkPassphrase(password);
  if (message) return { ok: false as const, error: message };
  const token = startSession();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    ...cookieOptions,
    secure: await cookieSecure(),
  });
  revalidatePath("/");
  return { ok: true as const };
}

export async function lockBudget() {
  clearSession();
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  revalidatePath("/");
  return { ok: true as const };
}

export async function setPassphrase(password: string, current: string) {
  if (envPassword()) {
    return {
      ok: false as const,
      error: "The password is set with BUDGET_PASSWORD on the server.",
    };
  }
  const denied = await gate();
  if (denied) return { ok: false as const, error: denied };
  if (password.trim().length < 8) {
    return { ok: false as const, error: "Use at least 8 characters." };
  }
  if (hasStoredPassword()) {
    const message = checkPassphrase(current);
    if (message) return { ok: false as const, error: message };
  }
  savePassword(password.trim());
  const token = startSession();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    ...cookieOptions,
    secure: await cookieSecure(),
  });
  revalidatePath("/");
  return { ok: true as const };
}

export async function removePassphrase(current: string) {
  if (envPassword()) {
    return {
      ok: false as const,
      error: "The password is set with BUDGET_PASSWORD on the server.",
    };
  }
  const denied = await gate();
  if (denied) return { ok: false as const, error: denied };
  const message = checkPassphrase(current);
  if (message) return { ok: false as const, error: message };
  clearPassword();
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  revalidatePath("/");
  return { ok: true as const };
}

export async function saveHouseholdProfile(householdName: string, advisorNote: string) {
  const denied = await gate();
  if (denied) return { ok: false as const, error: denied };
  const error = writeProfile({ householdName, advisorNote });
  if (error) return { ok: false as const, error };
  revalidatePath("/");
  revalidatePath("/export");
  return { ok: true as const };
}

export async function saveLeftoverGoal(cents: number | null, frequency: Frequency) {
  const denied = await gate();
  if (denied) return { ok: false as const, error: denied };
  const error = saveGoal(cents, frequency);
  if (error) return { ok: false as const, error };
  revalidatePath("/");
  return { ok: true as const };
}

export async function restoreBudget(items: BudgetItem[]) {
  const denied = await gate();
  if (denied) return { ok: false as const, error: denied };
  const error = restoreItems(items);
  if (error) return { ok: false as const, error };
  revalidatePath("/");
  revalidatePath("/export");
  return { ok: true as const };
}

export async function saveArrangement(entries: Arrangement) {
  const denied = await gate();
  if (denied) return { ok: false as const, error: denied };
  const error = arrangeItems(entries);
  if (error) return { ok: false as const, error };
  revalidatePath("/");
  revalidatePath("/export");
  return { ok: true as const };
}

export async function saveItem(id: string, patch: ItemPatch) {
  const denied = await gate();
  if (denied) return { ok: false as const, error: denied };
  const error = updateItem(id, patch);
  if (error) return { ok: false as const, error };
  revalidatePath("/");
  return { ok: true as const };
}

export async function createItem(input: {
  section: SectionId;
  name: string;
  kind: Kind;
  frequency: Frequency;
}): Promise<{ ok: true; item: BudgetItem } | { ok: false; error: string }> {
  const denied = await gate();
  if (denied) return { ok: false, error: denied };
  const result = addItem(input);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/");
  return { ok: true, item: result.item };
}

export async function removeItem(id: string) {
  const denied = await gate();
  if (denied) return { ok: false as const, error: denied };
  const error = deleteItem(id);
  if (error) return { ok: false as const, error };
  revalidatePath("/");
  return { ok: true as const };
}
