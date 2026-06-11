"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { CalendarView } from "@/lib/types";

interface Props {
  currentDate: Date;
  view: CalendarView;
  onNavigate: (dir: -1 | 1) => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
}

const VIEW_LABELS: Record<CalendarView, string> = {
  month: "Monat",
  week: "Woche",
  day: "Tag",
};

function formatTitle(date: Date, view: CalendarView): string {
  if (view === "month") return format(date, "MMMM yyyy", { locale: de });
  if (view === "week") {
    const { startOfWeek, endOfWeek } = require("date-fns");
    const s = startOfWeek(date, { weekStartsOn: 1 });
    const e = endOfWeek(date, { weekStartsOn: 1 });
    return `${format(s, "d. MMM", { locale: de })} – ${format(e, "d. MMM yyyy", { locale: de })}`;
  }
  return format(date, "EEEE, d. MMMM yyyy", { locale: de });
}

export default function CalendarHeader({ currentDate, view, onNavigate, onToday, onViewChange }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
      {/* Left: Logo + title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center shadow-sm">
          <Calendar size={16} className="text-white" />
        </div>
        <h1 className="text-base font-semibold text-gray-800 capitalize">
          {formatTitle(currentDate, view)}
        </h1>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        {/* Today button */}
        <button
          onClick={onToday}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 font-medium transition-colors"
        >
          Heute
        </button>

        {/* Navigation */}
        <div className="flex items-center">
          <button
            onClick={() => onNavigate(-1)}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => onNavigate(1)}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* View switcher */}
        <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
          {(["month", "week", "day"] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                view === v
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
