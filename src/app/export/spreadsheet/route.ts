import { advisorCsv, preparedOn } from "@/lib/advisor";
import { isUnlocked } from "@/lib/auth";
import { listItems } from "@/lib/budget";
import { getProfile } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isUnlocked())) {
    return new Response("Sign in first.", { status: 401 });
  }

  const csv = advisorCsv(listItems(), getProfile(), preparedOn());
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="household-budget.csv"',
      "Cache-Control": "no-store",
    },
  });
}
