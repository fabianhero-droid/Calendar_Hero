"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarEvent, CalendarView } from "@/lib/types";
import { loadEvents, saveEvents, generateId } from "@/lib/storage";
import { addMonths, addWeeks, addDays } from "date-fns";

export function useCalendarStore() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEvents(loadEvents());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveEvents(events);
  }, [events, hydrated]);

  const addEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = { ...event, id: generateId() };
    setEvents((prev) => [...prev, newEvent]);
    return newEvent;
  }, []);

  const updateEvent = useCallback((updated: CalendarEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
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
    setView,
    currentDate,
    setCurrentDate,
    navigate,
    goToday,
    addEvent,
    updateEvent,
    deleteEvent,
    hydrated,
  };
}
