"use client";

import {
  format, parseISO, isSameDay, isToday,
  differenceInMinutes, setHours, setMinutes,
} from "date-fns";
import { de } from "date-fns/locale";
import { CalendarEvent } from "@/lib/types";
import { getColorById } from "@/lib/eventColors";
import { useEffect, useRef, useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 72;
const TIME_COL_W = 56;

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
      setTop(((now.getHours() * 60 + now.getMinutes()) / 60) * SLOT_HEIGHT);
    }
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, []);
  if (top === null) return null;
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
      <div className="flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 flex-shrink-0 shadow-sm" />
        <div className="flex-1 border-t-2 border-red-500" />
      </div>
    </div>
  );
}

export default function DayView({ currentDate, events, onSlotClick, onEventClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayEvents = events.filter((e) => !e.allDay && isSameDay(parseISO(e.start), currentDate));
  const allDayEvts = events.filter((e) => e.allDay && isSameDay(parseISO(e.start), currentDate));

  useEffect(() => {
    const now = new Date();
    const scrollTo = Math.max(0, ((now.getHours() * 60 + now.getMinutes()) / 60) * SLOT_HEIGHT - 180);
    scrollRef.current?.scrollTo({ top: scrollTo, behavior: "smooth" });
  }, []);

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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 py-3 px-6 flex items-center gap-3 flex-shrink-0">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold
          ${isToday(currentDate) ? "bg-blue-500 text-white shadow-sm shadow-blue-200" : "bg-gray-100 text-gray-700"}
        `}>
          {format(currentDate, "d")}
        </div>
        <div>
          <div className="text-base font-semibold text-gray-800">{format(currentDate, "EEEE", { locale: de })}</div>
          <div className="text-sm text-gray-400">{format(currentDate, "MMMM yyyy", { locale: de })}</div>
        </div>
        {isToday(currentDate) && (
          <span className="ml-auto text-xs font-semibold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full">Heute</span>
        )}
      </div>

      {/* All-day */}
      {allDayEvts.length > 0 && (
        <div className="border-b border-gray-100 px-4 py-2 flex gap-2 flex-wrap flex-shrink-0">
          {allDayEvts.map((e) => {
            const c = getColorById(e.color);
            return (
              <div key={e.id} onClick={() => onEventClick(e)}
                className={`${c.light} ${c.text} text-sm px-3 py-1 rounded-lg cursor-pointer hover:opacity-80 font-medium`}>
                {e.title}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="flex" style={{ height: `${SLOT_HEIGHT * 24}px` }}>

          {/* Time labels */}
          <div className="flex-shrink-0 relative border-r border-gray-100" style={{ width: TIME_COL_W }}>
            {HOURS.map((h) => (
              <div key={h}>
                <div
                  className="absolute flex items-start justify-end pr-2"
                  style={{ top: `${h * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px`, right: 0, left: 0 }}
                >
                  <span className={`text-xs font-medium -mt-2 ${h === 0 ? "opacity-0" : "text-gray-500"}`}>
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
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

          <div
            className="flex-1 relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const hour = Math.floor(y / SLOT_HEIGHT);
              const minute = Math.floor(((y % SLOT_HEIGHT) / SLOT_HEIGHT) * 2) * 30;
              onSlotClick(setMinutes(setHours(currentDate, hour), minute));
            }}
          >
            {HOURS.map((h) => (
              <div key={h} className="absolute w-full border-t border-gray-100" style={{ top: `${h * SLOT_HEIGHT}px` }} />
            ))}
            {HOURS.map((h) => (
              <div key={`h-${h}`} className="absolute w-full border-t border-dashed border-gray-100" style={{ top: `${h * SLOT_HEIGHT + SLOT_HEIGHT / 2}px` }} />
            ))}

            {isToday(currentDate) && <NowIndicator />}

            {dayEvents.map((evt) => {
              const c = getColorById(evt.color);
              const style = eventStyle(evt);
              const start = parseISO(evt.start);
              const end = parseISO(evt.end);
              const durationMins = differenceInMinutes(end, start);
              return (
                <div
                  key={evt.id}
                  style={{ ...style, left: "6px", right: "6px" }}
                  onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                  className={`absolute ${c.light} ${c.text} ${c.border} border-l-[3px] rounded-xl px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden select-none`}
                >
                  <div className="text-sm font-bold leading-tight">{evt.title}</div>
                  <div className="text-xs opacity-75 mt-0.5 font-medium">
                    {format(start, "HH:mm")} – {format(end, "HH:mm")} Uhr
                    <span className="ml-1.5 opacity-60">
                      ({Math.floor(durationMins / 60) > 0 ? `${Math.floor(durationMins / 60)}h` : ""}{durationMins % 60 > 0 ? ` ${durationMins % 60}min` : ""})
                    </span>
                  </div>
                  {evt.description && (
                    <div className="text-xs opacity-60 mt-1 space-y-0.5">
                      {evt.description.split(" · ").map((part, i) => (
                        <div key={i} className="flex items-center gap-1">
                          {part.startsWith("Raum:") && <span>📍</span>}
                          {part.startsWith("Lehrer:") && <span>👤</span>}
                          {part.startsWith("⚠️") && <span></span>}
                          <span>{part.replace(/^(Raum:|Lehrer:)\s*/, "")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
