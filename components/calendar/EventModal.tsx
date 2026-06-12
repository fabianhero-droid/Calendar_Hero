"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { X, Trash2, Bell } from "lucide-react";
import { CalendarEvent } from "@/lib/types";
import { EVENT_COLORS } from "@/lib/eventColors";

interface Props {
  event?: Partial<CalendarEvent>;
  defaultStart?: Date;
  onSave: (event: Omit<CalendarEvent, "id"> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const REMIND_OPTIONS = [
  { value: 0, label: "Keine" },
  { value: 5, label: "5 Min vorher" },
  { value: 15, label: "15 Min vorher" },
  { value: 30, label: "30 Min vorher" },
  { value: 60, label: "1 Std vorher" },
  { value: 120, label: "2 Std vorher" },
  { value: 1440, label: "1 Tag vorher" },
];

function toInputDate(iso: string) {
  return iso ? iso.slice(0, 10) : format(new Date(), "yyyy-MM-dd");
}
function toInputTime(iso: string) {
  if (!iso) return "09:00";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function toISO(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function EventModal({ event, defaultStart, onSave, onDelete, onClose }: Props) {
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
  const [remindMinutes, setRemindMinutes] = useState(event?.remindMinutes ?? 15);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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
      remindMinutes: remindMinutes || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: "modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {event?.id ? "Termin bearbeiten" : "Neuer Termin"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Title */}
          <input
            autoFocus
            type="text"
            placeholder="Titel des Termins…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-gray-900 text-lg font-semibold placeholder-gray-300 outline-none border-b-2 border-gray-100 pb-2 focus:border-blue-400 transition-colors bg-transparent"
            required
          />

          {/* Description */}
          <textarea
            placeholder="Notizen hinzufügen…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full text-sm text-gray-600 placeholder-gray-300 outline-none resize-none rounded-xl border border-gray-100 bg-gray-50 p-3 focus:border-blue-300 focus:bg-white transition-all"
          />

          {/* All day toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div
              onClick={() => setAllDay((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${allDay ? "bg-blue-500" : "bg-gray-200"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${allDay ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-gray-600 group-hover:text-gray-800">Ganztägig</span>
          </label>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Startdatum</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all" />
            </div>
            {!allDay && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Uhrzeit</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Enddatum</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all" />
            </div>
            {!allDay && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Ende</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all" />
              </div>
            )}
          </div>

          {/* Reminder */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
              <Bell size={12} /> Erinnerung
            </label>
            <div className="flex flex-wrap gap-2">
              {REMIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRemindMinutes(opt.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                    remindMinutes === opt.value
                      ? "bg-blue-500 text-white border-blue-500"
                      : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Farbe</label>
            <div className="flex gap-2.5">
              {EVENT_COLORS.map((c) => (
                <button key={c.id} type="button" onClick={() => setColor(c.id)}
                  className={`w-8 h-8 rounded-full ${c.bg} transition-all ${
                    color === c.id ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-105 opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {event?.id && onDelete ? (
              <button type="button" onClick={() => { onDelete(event.id!); onClose(); }}
                className="flex items-center gap-1.5 text-sm text-rose-400 hover:text-rose-600 transition-colors">
                <Trash2 size={15} /> Löschen
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium">
                Abbrechen
              </button>
              <button type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors shadow-sm shadow-blue-200">
                Speichern
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
