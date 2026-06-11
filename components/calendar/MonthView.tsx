"use client";

import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  format, parseISO, getDay,
} from "date-fns";
import { de } from "date-fns/locale";
import { CalendarEvent } from "@/lib/types";
import { getColorById } from "@/lib/eventColors";

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function MonthView({ currentDate, events, onDayClick, onEventClick }: Props) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  function eventsForDay(day: Date) {
    return events.filter((e) => {
      const start = parseISO(e.start);
      const end = parseISO(e.end);
      return isSameDay(start, day) || (start <= day && end >= day);
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` }}>
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`border-r border-b border-gray-100 p-1.5 cursor-pointer transition-colors min-h-[80px]
                ${isCurrentMonth ? "bg-white hover:bg-gray-50" : "bg-gray-50/40 hover:bg-gray-100/40"}
              `}
            >
              <div className="flex items-start justify-between mb-1">
                <span
                  className={`w-7 h-7 flex items-center justify-center text-sm rounded-full font-medium
                    ${today ? "bg-blue-500 text-white" : isCurrentMonth ? "text-gray-800" : "text-gray-300"}
                  `}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((evt) => {
                  const c = getColorById(evt.color);
                  return (
                    <div
                      key={evt.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                      className={`${c.light} ${c.text} text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:opacity-80 transition-opacity font-medium`}
                    >
                      {!evt.allDay && (
                        <span className="opacity-60 mr-1">{format(parseISO(evt.start), "HH:mm")}</span>
                      )}
                      {evt.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-400 px-1.5">+{dayEvents.length - 3} mehr</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
