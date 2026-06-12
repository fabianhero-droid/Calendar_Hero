import { NextRequest, NextResponse } from "next/server";
import { WebUntis } from "webuntis";
import { getSupabase } from "@/lib/supabase";
import webpush from "web-push";
import { startOfWeek, endOfWeek, addWeeks } from "date-fns";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Called by Vercel Cron daily — checks for substitutions/cancellations
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: subs } = await supabase.from("push_subscriptions").select("subscription");
  if (!subs?.length) return NextResponse.json({ skipped: true });

  // Get stored WebUntis credentials from Supabase
  const { data: credsRow } = await supabase
    .from("untis_credentials")
    .select("*")
    .limit(1)
    .single();

  if (!credsRow) return NextResponse.json({ skipped: "no credentials" });

  try {
    const untis = new WebUntis(credsRow.school, credsRow.username, credsRow.password, credsRow.server);
    await untis.login();

    const now = new Date();
    const weekStart = startOfWeek(addWeeks(now, 0), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

    const timetable = await untis.getOwnTimetableForRange(weekStart, weekEnd);
    await untis.logout();

    const cancelled = timetable.filter((l) => l.code === "cancelled");
    const irregular = timetable.filter((l) => l.code === "irregular");

    const notifications: string[] = [];

    for (const lesson of cancelled) {
      const dateStr = lesson.date.toString();
      const subject = lesson.su?.[0]?.longname ?? lesson.su?.[0]?.name ?? "Unterricht";
      const day = new Date(
        `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
      ).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
      notifications.push(`❌ ${subject} am ${day} entfällt`);
    }

    for (const lesson of irregular) {
      const dateStr = lesson.date.toString();
      const subject = lesson.su?.[0]?.longname ?? lesson.su?.[0]?.name ?? "Unterricht";
      const day = new Date(
        `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
      ).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
      notifications.push(`⚠️ ${subject} am ${day} geändert`);
    }

    if (notifications.length === 0) return NextResponse.json({ changes: 0 });

    const payload = JSON.stringify({
      title: `📚 ${notifications.length} Stundenplanänderung${notifications.length > 1 ? "en" : ""}`,
      body: notifications.slice(0, 5).join("\n"),
      icon: "/icon-192.png",
      badge: "/icon-72.png",
    });

    await Promise.allSettled(
      subs.map((row) => webpush.sendNotification(JSON.parse(row.subscription), payload))
    );

    return NextResponse.json({ changes: notifications.length, notifications });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
