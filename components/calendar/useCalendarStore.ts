"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarEvent, CalendarView } from "@/lib/types";
import { loadEvents, saveEvents, generateId } from "@/lib/storage";
import { fetchEvents, upsertEvent, removeEvent } from "@/lib/supabaseEvents";
import { addMonths, addWeeks, addDays } from "date-fns";

const useSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "YOUR_SUPABASE_URL"
);

export function useCalendarStore() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<CalendarView>(() => {
    if (typeof window === "undefined") return "month";
    return (localStorage.getItem("calendar_view") as CalendarView) ?? "week";
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function load() {
      if (useSupabase) {
        try {
          const remote = await fetchEvents();
          setEvents(remote);
        } catch {
          setEvents(loadEvents());
        }
      } else {
        setEvents(loadEvents());
      }
      setHydrated(true);
    }
    load();
  }, []);

  // Sync to localStorage as offline cache
  useEffect(() => {
    if (hydrated && !useSupabase) saveEvents(events);
  }, [events, hydrated]);

  const addEvent = useCallback(async (event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = { ...event, id: generateId() };
    setEvents((prev) => [...prev, newEvent]);
    if (useSupabase) await upsertEvent(newEvent).catch(console.error);
    else saveEvents([...events, newEvent]);
    return newEvent;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const updateEvent = useCallback(async (updated: CalendarEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (useSupabase) await upsertEvent(updated).catch(console.error);
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (useSupabase) await removeEvent(id).catch(console.error);
  }, []);

  const setViewPersisted = useCallback((v: CalendarView) => {
    localStorage.setItem("calendar_view", v);
    setView(v);
  }, []);

  const navigate = useCallback(
    (dir: -1 | 1) => {
      setCurrentDate((d) => {
        if (view === "month") return addMonths(d, dir);
        if (view === "week") return addWeeks(d, dir);
        return addDays(d, dir);
      });
    },
    [view]
  );

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  return {
    events,
    view,
    setView: setViewPersisted,
    currentDate,
    setCurrentDate,
    navigate,
    goToday,
    addEvent,
    updateEvent,
    deleteEvent,
    hydrated,
    useSupabase,
  };
}
