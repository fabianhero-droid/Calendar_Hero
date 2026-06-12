"use client";

import {
  startOfWeek, endOfWeek, eachDayOfInterval, format,
  parseISO, isSameDay, isToday, differenceInMinutes, setHours, setMinutes,
} from "date-fns";
import { de } from "date-fns/locale";
import { CalendarEvent } from "@/lib/types";
import { getColorById } from "@/lib/eventColors";
import { useEffect, useRef, useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 64; // px per hour
const TIME_COL_W = 56; // px

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function NowIndicator() {
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    function calc() {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      setTop((mins / 60) * SLOT_HEIGHT);
    }
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, []);
  if (top === null) return null;
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
        <div className="flex-1 border-t border-red-500" />
      </div>
    </div>
  );
}

export default function WeekView({ currentDate, events, onSlotClick, onEventClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
  const todayIdx = days.findIndex((d) => isToday(d));

  // Scroll to current time on mount
  useEffect(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const scrollTo = Math.max(0, (mins / 60) * SLOT_HEIGHT - 150);
    scrollRef.current?.scrollTo({ top: scrollTo, behavior: "smooth" });
  }, []);

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
      {/* Day header */}
      <div className="flex border-b border-gray-100 flex-shrink-0" style={{ paddingLeft: TIME_COL_W }}>
        {days.map((day, i) => (
          <div key={day.toISOString()} className={`flex-1 text-center py-2 border-l border-gray-100 ${i === todayIdx ? "bg-blue-50/50" : ""}`}>
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">
              {format(day, "EEE", { locale: de })}
            </div>
            <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold mt-0.5
              ${isToday(day) ? "bg-blue-500 text-white shadow-sm shadow-blue-200" : "text-gray-700"}
            `}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day row */}
      <div className="flex border-b border-gray-100 min-h-[28px] flex-shrink-0">
        <div className="flex-shrink-0 flex items-center justify-end pr-2 text-right" style={{ width: TIME_COL_W }}>
          <span className="text-[10px] text-gray-400 leading-tight">Ganz-<br/>tag</span>
        </div>
        {days.map((day, i) => (
          <div key={day.toISOString()} className={`flex-1 border-l border-gray-100 px-1 py-0.5 space-y-0.5 ${i === todayIdx ? "bg-blue-50/30" : ""}`}>
            {allDayEvents(day).map((e) => {
              const c = getColorById(e.color);
              return (
                <div key={e.id} onClick={() => onEventClick(e)}
                  className={`${c.light} ${c.text} text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:opacity-80 font-medium`}>
                  {e.title}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="flex" style={{ height: `${SLOT_HEIGHT * 24}px` }}>

          {/* Time labels column */}
          <div className="flex-shrink-0 relative border-r border-gray-100" style={{ width: TIME_COL_W }}>
            {HOURS.map((h) => (
              <div key={h}>
                {/* Full hour label */}
                <div
                  className="absolute flex items-start justify-end pr-2"
                  style={{ top: `${h * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px`, right: 0, left: 0 }}
                >
                  <span className={`text-xs font-medium -mt-2 ${h === 0 ? "opacity-0" : "text-gray-500"}`}>
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
                {/* Half-hour label */}
                <div
                  className="absolute flex items-start justify-end pr-2"
                  style={{ top: `${h * SLOT_HEIGHT + SLOT_HEIGHT / 2}px`, right: 0, left: 0 }}
                >
                  <span className="text-[10px] text-gray-300 -mt-2">
                    {String(h).padStart(2, "0")}:30
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, i) => {
            const dayEvts = eventsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={`flex-1 border-l border-gray-100 relative ${i === todayIdx ? "bg-blue-50/20" : ""}`}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const hour = Math.floor(y / SLOT_HEIGHT);
                  const minute = Math.floor(((y % SLOT_HEIGHT) / SLOT_HEIGHT) * 2) * 30;
                  onSlotClick(setMinutes(setHours(day, hour), minute));
                }}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div key={h} className="absolute w-full border-t border-gray-100" style={{ top: `${h * SLOT_HEIGHT}px` }} />
                ))}
                {/* Half-hour lines */}
                {HOURS.map((h) => (
                  <div key={`h-${h}`} className="absolute w-full border-t border-dashed border-gray-100" style={{ top: `${h * SLOT_HEIGHT + SLOT_HEIGHT / 2}px` }} />
                ))}
                {/* Today red line */}
                {isToday(day) && <NowIndicator />}
                {/* Events */}
                {dayEvts.map((evt) => {
                  const c = getColorById(evt.color);
                  const style = eventStyle(evt);
                  const start = parseISO(evt.start);
                  const end = parseISO(evt.end);
                  const durationMins = differenceInMinutes(end, start);
                  return (
                    <div
                      key={evt.id}
                      style={{ ...style, left: "2px", right: "2px" }}
                      onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                      className={`absolute ${c.light} ${c.text} ${c.border} border-l-2 rounded-lg px-1.5 py-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden select-none`}
                    >
                      <div className="text-xs font-semibold truncate leading-tight">{evt.title}</div>
                      {durationMins >= 45 && (
                        <div className="text-[10px] opacity-70 mt-0.5">
                          {format(start, "HH:mm")} – {format(end, "HH:mm")}
                        </div>
                      )}
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
