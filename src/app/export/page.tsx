import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AdvisorProfileForm, PrintPackButton } from "@/components/advisor-profile-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { linesByKind, packLines, packTotals, preparedOn } from "@/lib/advisor";
import { isUnlocked } from "@/lib/auth";
import { listItems } from "@/lib/budget";
import { formatAud } from "@/lib/money";
import { displayName, getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ExportPage() {
  await connection();
  if (!(await isUnlocked())) redirect("/");

  const items = listItems();
  const profile = getProfile();
  const name = displayName(profile);
  const prepared = preparedOn();
  const lines = packLines(items);
  const groups = linesByKind(lines);
  const totals = packTotals(items);
  const filename = "household-budget.csv";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="no-print flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Back to the budget</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <a href={`/export/spreadsheet`} download={filename}>
                Download spreadsheet
              </a>
            </Button>
            <PrintPackButton />
          </div>
        </div>
        <AdvisorProfileForm householdName={profile.householdName} advisorNote={profile.advisorNote} />
      </div>

      <article className="advisor-sheet mt-8 rounded-3xl bg-card px-5 py-8 ring-1 ring-foreground/10 sm:px-8">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Advisor pack</p>
        <h1 className="font-display mt-1 text-4xl sm:text-5xl">{name}</h1>
        <p className="mt-2 text-muted-foreground">Household budget, prepared {prepared}.</p>
        {profile.advisorNote.trim() ? (
          <p className="mt-4 max-w-3xl whitespace-pre-wrap">{profile.advisorNote.trim()}</p>
        ) : null}

        <table className="mt-8 w-full text-left text-sm">
          <caption className="sr-only">Budget totals</caption>
          <thead>
            <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
              <th className="py-2 pr-3 font-medium">Summary</th>
              <th className="py-2 pr-3 text-right font-medium">Fortnight</th>
              <th className="py-2 pr-3 text-right font-medium">Month</th>
              <th className="py-2 text-right font-medium">Year</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((total) => (
              <tr key={total.label} className="border-b border-border/70">
                <th className="py-2 pr-3 text-left font-medium">{total.label}</th>
                <td className="py-2 pr-3 text-right tabular-nums">{formatAud(total.fortnightly)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatAud(total.monthly)}</td>
                <td className="py-2 text-right tabular-nums">{formatAud(total.annually)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {groups.length === 0 ? (
          <p className="mt-8 text-muted-foreground">No amounts have been entered yet.</p>
        ) : (
          groups.map((group) => (
            <section key={group.kind} className="mt-10">
              <h2 className="font-display text-3xl">{group.label}</h2>
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="py-2 pr-3 font-medium">Line</th>
                    <th className="hidden py-2 pr-3 font-medium sm:table-cell">Entered as</th>
                    <th className="py-2 pr-3 text-right font-medium">Fortnight</th>
                    <th className="py-2 pr-3 text-right font-medium">Month</th>
                    <th className="py-2 text-right font-medium">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {group.lines.map((line) => (
                    <tr key={`${line.kind}-${line.section}-${line.name}`} className="border-b border-border/70">
                      <th className="py-2 pr-3 text-left font-medium">
                        {line.name}
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{line.section}</span>
                      </th>
                      <td className="hidden py-2 pr-3 sm:table-cell">
                        {line.entered}
                        <span className="text-muted-foreground"> {line.frequency.toLowerCase()}</span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatAud(line.fortnightly)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatAud(line.monthly)}</td>
                      <td className="py-2 text-right tabular-nums">{formatAud(line.annually)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )}

        <p className="mt-10 text-sm text-muted-foreground">
          Figures are a plan, converted the MoneySmart way: 52 weeks, 26 fortnights, 12 months, 4 quarters, 1 year.
          Blank and hidden lines are left out. This is not a record of what was spent.
        </p>
      </article>
    </main>
  );
}
