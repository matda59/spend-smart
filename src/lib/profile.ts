import { getDb } from "./db";
import { FREQUENCIES, type Frequency } from "./types";

const MAX_NAME = 60;
const MAX_NOTE = 600;

export type HouseholdProfile = {
  householdName: string;
  advisorNote: string;
};

export function getProfile(): HouseholdProfile {
  const row = getDb()
    .prepare("SELECT household_name, advisor_note FROM settings WHERE id = 1")
    .get() as { household_name: string; advisor_note: string };
  return {
    householdName: row.household_name ?? "",
    advisorNote: row.advisor_note ?? "",
  };
}

export function displayName(profile: HouseholdProfile) {
  const name = profile.householdName.trim();
  return name.length > 0 ? name : "Household";
}

export type LeftoverGoal = {
  cents: number | null;
  frequency: Frequency;
};

export function getGoal(): LeftoverGoal {
  const row = getDb()
    .prepare("SELECT goal_cents, goal_frequency FROM settings WHERE id = 1")
    .get() as { goal_cents: number | null; goal_frequency: string };
  const frequency = (FREQUENCIES as readonly string[]).includes(row.goal_frequency)
    ? (row.goal_frequency as Frequency)
    : "monthly";
  return { cents: row.goal_cents, frequency };
}

export function saveGoal(cents: number | null, frequency: Frequency): string | null {
  if (!(FREQUENCIES as readonly string[]).includes(frequency)) {
    return "Choose a frequency from the list.";
  }
  if (cents != null && (!Number.isInteger(cents) || cents < 0 || cents > 100_000_000_00)) {
    return "Enter a dollar amount, such as 500.";
  }
  getDb()
    .prepare("UPDATE settings SET goal_cents = ?, goal_frequency = ? WHERE id = 1")
    .run(cents, frequency);
  return null;
}

export function saveProfile(input: HouseholdProfile): string | null {
  const householdName = input.householdName.trim();
  const advisorNote = input.advisorNote.trim();
  if (householdName.length > MAX_NAME) {
    return `Use a household name of ${MAX_NAME} characters or fewer.`;
  }
  if (advisorNote.length > MAX_NOTE) {
    return `Keep the note under ${MAX_NOTE} characters.`;
  }
  getDb()
    .prepare("UPDATE settings SET household_name = ?, advisor_note = ? WHERE id = 1")
    .run(householdName, advisorNote);
  return null;
}
