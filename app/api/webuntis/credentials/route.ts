import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Save WebUntis credentials to Supabase so the cron job can use them
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getSupabase();

  const { error } = await supabase
    .from("untis_credentials")
    .upsert({ id: 1, ...body }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = getSupabase();
  await supabase.from("untis_credentials").delete().eq("id", 1);
  return NextResponse.json({ ok: true });
}
