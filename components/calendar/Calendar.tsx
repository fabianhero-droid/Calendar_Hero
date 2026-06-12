"use client";

import { useState, useCallback } from "react";
import { useCalendarStore } from "./useCalendarStore";
import CalendarHeader from "./CalendarHeader";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import EventModal from "./EventModal";
import AIChat from "./AIChat";
import WebUntisSetup from "@/components/WebUntisSetup";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { CalendarEvent, ParsedEventDraft } from "@/lib/types";
import { generateId } from "@/lib/storage";

type ModalState =
  | { type: "closed" }
  | { type: "create"; defaultStart: Date }
  | { type: "edit"; event: CalendarEvent }
  | { type: "draft"; draft: ParsedEventDraft };

export default function Calendar() {
  const store = useCalendarStore();
  const [modal, setModal] = useState<ModalState>({ type: "closed" });

  const handleDayClick = useCallback((date: Date) => {
    setModal({ type: "create", defaultStart: date });
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setModal({ type: "edit", event });
  }, []);

  const handleAIChatEvent = useCallback(
    (event: Omit<CalendarEvent, "id">) => {
      store.addEvent(event);
    },
    [store]
  );

  const handleUntisImport = useCallback(
    (events: CalendarEvent[]) => {
      // Remove old untis events, add new ones
      const untisIds = store.events.filter((e) => e.id.startsWith("untis_")).map((e) => e.id);
      untisIds.forEach((id) => store.deleteEvent(id));
      events.forEach((e) => store.addEvent(e));
      // Switch to week view so the timetable is visible properly
      store.setView("week");
    },
    [store]
  );

  const handleSave = useCallback(
    (eventData: Omit<CalendarEvent, "id"> & { id?: string }) => {
      if (eventData.id) {
        store.updateEvent(eventData as CalendarEvent);
      } else {
        store.addEvent(eventData);
      }
    },
    [store]
  );

  const closeModal = useCallback(() => setModal({ type: "closed" }), []);

  if (!store.hydrated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Kalender wird geladen…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <CalendarHeader
        currentDate={store.currentDate}
        view={store.view}
        onNavigate={store.navigate}
        onToday={store.goToday}
        onViewChange={store.setView}
        onNewEvent={() => setModal({ type: "create", defaultStart: new Date() })}
        useSupabase={store.useSupabase}
      />

      {/* Sidebar-like top panel */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <AIChat onEventAdded={handleAIChatEvent} />
        <WebUntisSetup
          onEventsImported={handleUntisImport}
          existingEventIds={store.events.map((e) => e.id)}
        />
      </div>

      {/* Calendar views */}
      <div className="flex-1 overflow-hidden">
        {store.view === "month" && (
          <MonthView
            currentDate={store.currentDate}
            events={store.events}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        )}
        {store.view === "week" && (
          <WeekView
            currentDate={store.currentDate}
            events={store.events}
            onSlotClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        )}
        {store.view === "day" && (
          <DayView
            currentDate={store.currentDate}
            events={store.events}
            onSlotClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {/* Modals */}
      {modal.type === "create" && (
        <EventModal
          defaultStart={modal.defaultStart}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
      {modal.type === "edit" && (
        <EventModal
          event={modal.event}
          onSave={handleSave}
          onDelete={store.deleteEvent}
          onClose={closeModal}
        />
      )}
      {modal.type === "draft" && (
        <EventModal
          event={{
            title: modal.draft.title,
            start: modal.draft.start.toISOString(),
            end: modal.draft.end.toISOString(),
            description: modal.draft.description,
          }}
          defaultStart={modal.draft.start}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      <PWAInstallPrompt />
    </div>
  );
}
