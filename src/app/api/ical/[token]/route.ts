import { NextRequest, NextResponse } from "next/server";
import ical, { ICalCalendarMethod, ICalEventRepeatingFreq, ICalWeekday } from "ical-generator";
import { createAdminClient } from "@/lib/cron";

export const dynamic = "force-dynamic";

/**
 * Public iCal feed. Token-protected — subscribe in Apple Calendar / Google
 * Calendar with the URL  https://<host>/api/ical/<your-token>
 * The token is generated per user in notification_prefs and shown in /settings.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16) return new NextResponse("not found", { status: 404 });

  try {
    const admin = createAdminClient();
    const { data: pref } = await admin
      .from("notification_prefs")
      .select("user_id")
      .eq("ical_token", token)
      .maybeSingle();
    if (!pref) return new NextResponse("not found", { status: 404 });

    const userId = pref.user_id as string;
    const { data: habits } = await admin
      .from("habits")
      .select("id, name, category, frequency, difficulty, reminder_time, goal_target, goal_unit")
      .eq("user_id", userId)
      .eq("status", "active");

    const cal = ical({
      name: "habit-tracker",
      description: "Your active habits",
      timezone: "UTC",
      method: ICalCalendarMethod.PUBLISH,
    });

    const weekdayMap: Record<string, ICalWeekday[]> = {
      daily:    [ICalWeekday.MO, ICalWeekday.TU, ICalWeekday.WE, ICalWeekday.TH, ICalWeekday.FR, ICalWeekday.SA, ICalWeekday.SU],
      weekdays: [ICalWeekday.MO, ICalWeekday.TU, ICalWeekday.WE, ICalWeekday.TH, ICalWeekday.FR],
      weekly:   [ICalWeekday.MO],
    };

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const h of habits ?? []) {
      const [hh, mm] = ((h.reminder_time as string | null) ?? "09:00:00").split(":").map(Number);
      const start = new Date(today);
      start.setUTCHours(hh ?? 9, mm ?? 0, 0, 0);
      const end = new Date(start);
      end.setUTCMinutes(end.getUTCMinutes() + 15);

      const goalSuffix = (h.goal_target as number) > 1
        ? ` (${h.goal_target}${h.goal_unit ? " " + h.goal_unit : ""})`
        : "";

      cal.createEvent({
        id: `habit-${h.id}@habit-tracker`,
        start,
        end,
        summary: `[${h.category}] ${h.name}${goalSuffix}`,
        description: `Difficulty: ${h.difficulty}. Check off in habit-tracker when done.`,
        url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/habits/${h.id}`,
        repeating: {
          freq: ICalEventRepeatingFreq.WEEKLY,
          byDay: weekdayMap[h.frequency as string] ?? weekdayMap.daily,
        },
      });
    }

    return new NextResponse(cal.toString(), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new NextResponse(`error: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
  }
}
