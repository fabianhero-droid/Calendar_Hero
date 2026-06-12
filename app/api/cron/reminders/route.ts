import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getSupabase } from "@/lib/supabase";
import { parseISO, isToday, format } from "date-fns";
import { de } from "date-fns/locale";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Runs once daily at 07:00 UTC — sends a morning digest of today's events
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: events } = await supabase.from("events").select("*");
  const { data: subs } = await supabase.from("push_subscriptions").select("subscription");

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const todayEvents = (events ?? [])
    .filter((e) => isToday(parseISO(e.start)))
    .sort((a, b) => a.start.localeCompare(b.start));

  if (!todayEvents.length) return NextResponse.json({ sent: 0, reason: "no events today" });

  const list = todayEvents
    .map((e) => {
      const time = e.all_day ? "Ganztägig" : format(parseISO(e.start), "HH:mm", { locale: de });
      return `• ${time} – ${e.title}`;
    })
    .join("\n");

  const payload = JSON.stringify({
    title: `📅 Heute: ${todayEvents.length} Termin${todayEvents.length > 1 ? "e" : ""}`,
    body: list,
    icon: "/icon-192.png",
    badge: "/icon-72.png",
  });

  await Promise.allSettled(
    subs.map((row) => webpush.sendNotification(JSON.parse(row.subscription), payload))
  );

  return NextResponse.json({ sent: subs.length, events: todayEvents.length });
}
