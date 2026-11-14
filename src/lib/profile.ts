import { getDb } from "./db";

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
