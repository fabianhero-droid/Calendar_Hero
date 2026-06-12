import { supabase } from "./supabase";
import { CalendarEvent } from "./types";

export async function fetchEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToEvent);
}

export async function upsertEvent(event: CalendarEvent): Promise<void> {
  const { error } = await supabase
    .from("events")
    .upsert(eventToDb(event), { onConflict: "id" });
  if (error) throw error;
}

export async function removeEvent(id: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

function eventToDb(e: CalendarEvent) {
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? null,
    start: e.start,
    end: e.end,
    color: e.color ?? "blue",
    all_day: e.allDay ?? false,
    remind_minutes: e.remindMinutes ?? null,
  };
}

function dbToEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    start: row.start as string,
    end: row.end as string,
    color: (row.color as string) ?? "blue",
    allDay: (row.all_day as boolean) ?? false,
    remindMinutes: (row.remind_minutes as number) ?? undefined,
  };
}
