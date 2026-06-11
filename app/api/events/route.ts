import { NextRequest, NextResponse } from "next/server";
import { CalendarEvent } from "@/lib/types";

// In-memory store for server-side (client uses localStorage; this is a fallback API)
let serverEvents: CalendarEvent[] = [];

export async function GET() {
  return NextResponse.json(serverEvents);
}

export async function POST(req: NextRequest) {
  const event: CalendarEvent = await req.json();
  serverEvents = serverEvents.filter((e) => e.id !== event.id);
  serverEvents.push(event);
  return NextResponse.json(event, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  serverEvents = serverEvents.filter((e) => e.id !== id);
  return NextResponse.json({ ok: true });
}
