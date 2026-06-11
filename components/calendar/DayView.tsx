"use client";

import {
  format, parseISO, isSameDay, isToday,
  differenceInMinutes, setHours, setMinutes,
} from "date-fns";
import { CalendarEvent } from "@/lib/types";
import { getColorById } from "@/lib/eventColors";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 72;

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function DayView({ currentDate, events, onSlotClick, onEventClick }: Props) {
  const dayEvents = events.filter(
    (e) => !e.allDay && isSameDay(parseISO(e.start), currentDate)
  );
  const allDayEvts = events.filter(
    (e) => e.allDay && isSameDay(parseISO(e.start), currentDate)
  );

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
      <div className="border-b border-gray-100 py-3 px-6 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
          ${isToday(currentDate) ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"}
        `}>
          {format(currentDate, "d")}
        </div>
        <div>
          <div className="text-base font-semibold text-gray-800">{format(currentDate, "EEEE")}</div>
          <div className="text-sm text-gray-400">{format(currentDate, "MMMM yyyy")}</div>
        </div>
      </div>

      {/* All-day */}
      {allDayEvts.length > 0 && (
        <div className="border-b border-gray-100 px-4 py-2 flex gap-2 flex-wrap">
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
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: `${SLOT_HEIGHT * 24}px` }}>
          <div className="w-16 flex-shrink-0 relative">
            {HOURS.map((h) => (
              <div key={h} className="absolute flex items-start justify-end pr-3" style={{ top: `${h * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}>
                <span className="text-xs text-gray-400 -mt-2">{h === 0 ? "" : `${h}:00`}</span>
              </div>
            ))}
          </div>

          <div
            className="flex-1 border-l border-gray-100 relative"
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
              <div key={`h-${h}`} className="absolute w-full border-t border-gray-50" style={{ top: `${h * SLOT_HEIGHT + SLOT_HEIGHT / 2}px` }} />
            ))}
            {dayEvents.map((evt) => {
              const c = getColorById(evt.color);
              const style = eventStyle(evt);
              return (
                <div
                  key={evt.id}
                  style={{ ...style, left: "4px", right: "4px" }}
                  onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                  className={`absolute ${c.light} ${c.text} ${c.border} border-l-[3px] rounded-xl px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden`}
                >
                  <div className="text-sm font-semibold">{evt.title}</div>
                  <div className="text-xs opacity-70 mt-0.5">
                    {format(parseISO(evt.start), "HH:mm")} – {format(parseISO(evt.end), "HH:mm")}
                  </div>
                  {evt.description && <div className="text-xs opacity-60 mt-1 truncate">{evt.description}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
