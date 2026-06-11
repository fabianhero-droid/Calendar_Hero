"use client";

import {
  startOfWeek, endOfWeek, eachDayOfInterval, format,
  parseISO, isSameDay, isToday, differenceInMinutes, setHours, setMinutes,
} from "date-fns";
import { de } from "date-fns/locale";
import { CalendarEvent } from "@/lib/types";
import { getColorById } from "@/lib/eventColors";
import { useRef } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 60; // px per hour

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function WeekView({ currentDate, events, onSlotClick, onEventClick }: Props) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });

  function eventsForDay(day: Date) {
    return events.filter((e) => !e.allDay && isSameDay(parseISO(e.start), day));
  }

  function eventStyle(event: CalendarEvent) {
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const duration = Math.max(differenceInMinutes(end, start), 30);
    return {
      top: `${(startMin / 60) * SLOT_HEIGHT}px`,
      height: `${(duration / 60) * SLOT_HEIGHT}px`,
    };
  }

  function allDayEvents(day: Date) {
    return events.filter((e) => e.allDay && isSameDay(parseISO(e.start), day));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-gray-100">
        <div className="w-14 flex-shrink-0" />
        {days.map((day) => (
          <div key={day.toISOString()} className="flex-1 text-center py-2 border-l border-gray-100">
            <div className="text-xs text-gray-400 uppercase tracking-wide">{format(day, "EEE", { locale: de })}</div>
            <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-semibold mt-0.5
              ${isToday(day) ? "bg-blue-500 text-white" : "text-gray-700"}
            `}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day row */}
      <div className="flex border-b border-gray-100 min-h-[28px]">
        <div className="w-14 flex-shrink-0 flex items-center justify-end pr-2">
          <span className="text-xs text-gray-400">Ganztag</span>
        </div>
        {days.map((day) => (
          <div key={day.toISOString()} className="flex-1 border-l border-gray-100 px-1 py-0.5 space-y-0.5">
            {allDayEvents(day).map((e) => {
              const c = getColorById(e.color);
              return (
                <div
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  className={`${c.light} ${c.text} text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:opacity-80 font-medium`}
                >
                  {e.title}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: `${SLOT_HEIGHT * 24}px` }}>
          {/* Time labels */}
          <div className="w-14 flex-shrink-0 relative">
            {HOURS.map((h) => (
              <div key={h} className="absolute flex items-start justify-end pr-2" style={{ top: `${h * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}>
                <span className="text-xs text-gray-400 -mt-2">{h === 0 ? "" : `${h}:00`}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayEvts = eventsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className="flex-1 border-l border-gray-100 relative"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const hour = Math.floor(y / SLOT_HEIGHT);
                  const minute = Math.floor(((y % SLOT_HEIGHT) / SLOT_HEIGHT) * 2) * 30;
                  const d = setMinutes(setHours(day, hour), minute);
                  onSlotClick(d);
                }}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div key={h} className="absolute w-full border-t border-gray-100" style={{ top: `${h * SLOT_HEIGHT}px` }} />
                ))}
                {/* Half-hour lines */}
                {HOURS.map((h) => (
                  <div key={`h-${h}`} className="absolute w-full border-t border-gray-50" style={{ top: `${h * SLOT_HEIGHT + SLOT_HEIGHT / 2}px` }} />
                ))}
                {/* Events */}
                {dayEvts.map((evt) => {
                  const c = getColorById(evt.color);
                  const style = eventStyle(evt);
                  return (
                    <div
                      key={evt.id}
                      style={{ ...style, left: "2px", right: "2px" }}
                      onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                      className={`absolute ${c.light} ${c.text} ${c.border} border-l-2 rounded-md px-1.5 py-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden`}
                    >
                      <div className="text-xs font-semibold truncate">{evt.title}</div>
                      <div className="text-xs opacity-70">
                        {format(parseISO(evt.start), "HH:mm")} – {format(parseISO(evt.end), "HH:mm")}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
