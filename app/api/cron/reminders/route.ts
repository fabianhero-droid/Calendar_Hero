import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";
import { addMinutes, parseISO, isWithinInterval, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Called by Vercel Cron every 5 minutes
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const window = { start: now, end: addMinutes(now, 6) };

  // Get events with reminders due in the next 5 min window
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .not("remind_minutes", "is", null);

  const { data: subs } = await supabase.from("push_subscriptions").select("subscription");

  if (!events?.length || !subs?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const event of events) {
    const eventStart = parseISO(event.start);
    const notifyAt = addMinutes(eventStart, -(event.remind_minutes ?? 15));

    if (!isWithinInterval(notifyAt, window)) continue;

    const distance = formatDistanceToNow(eventStart, { locale: de, addSuffix: true });
    const payload = JSON.stringify({
      title: `🗓 ${event.title}`,
      body: `Beginnt ${distance}`,
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      data: { eventId: event.id },
    });

    await Promise.allSettled(
      subs.map((row) => webpush.sendNotification(JSON.parse(row.subscription), payload))
    );
    sent++;
  }

  return NextResponse.json({ sent });
}
