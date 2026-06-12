import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const subscription = await req.json();
  const endpoint = subscription?.endpoint;
  if (!endpoint) return NextResponse.json({ error: "No endpoint" }, { status: 400 });

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint, subscription: JSON.stringify(subscription) }, { onConflict: "endpoint" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
