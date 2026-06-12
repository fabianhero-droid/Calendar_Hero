import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const { title, body, icon } = await req.json();

  const { data: subs } = await supabase.from("push_subscriptions").select("subscription");
  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const results = await Promise.allSettled(
    subs.map((row) => {
      const sub = JSON.parse(row.subscription);
      return webpush.sendNotification(sub, JSON.stringify({ title, body, icon: icon ?? "/icon-192.png" }));
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent });
}
