"use client";

import { format, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Plus } from "lucide-react";
import { CalendarView } from "@/lib/types";
import NotificationBell from "@/components/NotificationBell";
import { useEffect, useState } from "react";

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-xs font-semibold text-gray-500 tabular-nums">
      {format(time, "HH:mm")}
    </span>
  );
}

interface Props {
  currentDate: Date;
  view: CalendarView;
  onNavigate: (dir: -1 | 1) => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
  onNewEvent: () => void;
  useSupabase: boolean;
}

const VIEW_LABELS: Record<CalendarView, string> = {
  month: "Monat",
  week: "Woche",
  day: "Tag",
};

function formatTitle(date: Date, view: CalendarView): string {
  if (view === "month") return format(date, "MMMM yyyy", { locale: de });
  if (view === "week") {
    const s = startOfWeek(date, { weekStartsOn: 1 });
    const e = endOfWeek(date, { weekStartsOn: 1 });
    return `${format(s, "d. MMM", { locale: de })} – ${format(e, "d. MMM yyyy", { locale: de })}`;
  }
  return format(date, "EEEE, d. MMMM yyyy", { locale: de });
}

export default function CalendarHeader({ currentDate, view, onNavigate, onToday, onViewChange, onNewEvent, useSupabase }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white gap-3">
      {/* Logo + title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
          <Calendar size={15} className="text-white" />
        </div>
        <h1 className="text-sm font-semibold text-gray-800 capitalize truncate hidden sm:block">
          {formatTitle(currentDate, view)}
        </h1>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Supabase badge */}
        {useSupabase && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Cloud
          </span>
        )}

        <LiveClock />
        <NotificationBell />

        <button onClick={onNewEvent}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-sm shadow-blue-200">
          <Plus size={15} />
          <span className="hidden sm:inline">Neu</span>
        </button>

        <button onClick={onToday}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 font-medium transition-colors">
          Heute
        </button>

        <div className="flex items-center">
          <button onClick={() => onNavigate(-1)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => onNavigate(1)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* View switcher */}
        <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
          {(["month", "week", "day"] as CalendarView[]).map((v) => (
            <button key={v} onClick={() => onViewChange(v)}
              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all ${
                view === v ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
