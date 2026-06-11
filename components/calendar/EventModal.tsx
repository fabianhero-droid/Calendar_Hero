"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { X, Trash2 } from "lucide-react";
import { CalendarEvent } from "@/lib/types";
import { EVENT_COLORS, getColorById } from "@/lib/eventColors";

interface Props {
  event?: Partial<CalendarEvent>;
  defaultStart?: Date;
  onSave: (event: Omit<CalendarEvent, "id"> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

function toInputDate(iso: string) {
  return iso ? iso.slice(0, 10) : format(new Date(), "yyyy-MM-dd");
}
function toInputTime(iso: string) {
  return iso ? iso.slice(11, 16) : "09:00";
}
function toISO(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function EventModal({ event, defaultStart, onSave, onDelete, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const startDefault = event?.start ?? defaultStart?.toISOString() ?? new Date().toISOString();
  const endDefault =
    event?.end ??
    new Date((defaultStart?.getTime() ?? Date.now()) + 3600000).toISOString();

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startDate, setStartDate] = useState(toInputDate(startDefault));
  const [startTime, setStartTime] = useState(toInputTime(startDefault));
  const [endDate, setEndDate] = useState(toInputDate(endDefault));
  const [endTime, setEndTime] = useState(toInputTime(endDefault));
  const [color, setColor] = useState(event?.color ?? "blue");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      id: event?.id,
      title: title.trim(),
      description: description.trim() || undefined,
      start: allDay ? `${startDate}T00:00:00.000Z` : toISO(startDate, startTime),
      end: allDay ? `${endDate}T23:59:59.000Z` : toISO(endDate, endTime),
      color,
      allDay,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in"
        style={{ animation: "modalIn 0.18s ease-out" }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            {event?.id ? "Termin bearbeiten" : "Neuer Termin"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <input
            autoFocus
            type="text"
            placeholder="Titel des Termins"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-gray-900 text-base font-medium placeholder-gray-300 outline-none border-b border-gray-200 pb-2 focus:border-blue-400 transition-colors"
            required
          />

          <textarea
            placeholder="Beschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full text-sm text-gray-600 placeholder-gray-300 outline-none resize-none border border-gray-200 rounded-xl p-3 focus:border-blue-300 transition-colors"
          />

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded text-blue-500"
            />
            Ganztägig
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Startdatum</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 transition-colors"
              />
            </div>
            {!allDay && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Uhrzeit</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 transition-colors"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Enddatum</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 transition-colors"
              />
            </div>
            {!allDay && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ende</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 transition-colors"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-2 block">Farbe</label>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-7 h-7 rounded-full ${c.bg} transition-transform ${color === c.id ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-105"}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {event?.id && onDelete ? (
              <button
                type="button"
                onClick={() => { onDelete(event.id!); onClose(); }}
                className="flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-700 transition-colors"
              >
                <Trash2 size={15} /> Löschen
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors"
              >
                Speichern
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
