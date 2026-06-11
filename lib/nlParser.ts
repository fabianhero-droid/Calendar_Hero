import { ParsedEventDraft } from "./types";
import {
  addDays,
  addWeeks,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  setHours,
  setMinutes,
  startOfDay,
  addHours,
} from "date-fns";

const GERMAN_WEEKDAYS: Record<string, (d: Date) => Date> = {
  montag: nextMonday,
  dienstag: nextTuesday,
  mittwoch: nextWednesday,
  donnerstag: nextThursday,
  freitag: nextFriday,
  samstag: nextSaturday,
  sonntag: nextSunday,
  monday: nextMonday,
  tuesday: nextTuesday,
  wednesday: nextWednesday,
  thursday: nextThursday,
  friday: nextFriday,
  saturday: nextSaturday,
  sunday: nextSunday,
};

function parseTime(text: string): { hours: number; minutes: number } | null {
  // "14:30", "14 Uhr", "14:30 Uhr", "2pm", "2:30pm", "14h"
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:uhr|h|pm|am)?/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const isPm = /pm/i.test(text) && hours < 12;
  const isAm = /am/i.test(text) && hours === 12;
  if (isPm) hours += 12;
  if (isAm) hours = 0;
  return { hours, minutes };
}

function parseDuration(text: string): number {
  // Returns duration in minutes
  const hourMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:stunde[n]?|hour[s]?|h\b)/i);
  const minMatch = text.match(/(\d+)\s*(?:minute[n]?|min)/i);
  let total = 0;
  if (hourMatch) total += parseFloat(hourMatch[1].replace(",", ".")) * 60;
  if (minMatch) total += parseInt(minMatch[1]);
  return total || 60; // default 1 hour
}

function parseDate(text: string, now: Date): Date {
  const lower = text.toLowerCase();

  if (/heute|today/.test(lower)) return startOfDay(now);
  if (/morgen|tomorrow/.test(lower)) return startOfDay(addDays(now, 1));
  if (/übermorgen|day after tomorrow/.test(lower)) return startOfDay(addDays(now, 2));
  if (/nächste(?:r|s|n)?\s+woche|next\s+week/.test(lower)) return startOfDay(addWeeks(now, 1));

  for (const [key, fn] of Object.entries(GERMAN_WEEKDAYS)) {
    const regex = new RegExp(`(?:nächste[rns]?\\s+)?${key}`, "i");
    if (regex.test(lower)) return startOfDay(fn(now));
  }

  // DD.MM.YYYY or DD.MM or YYYY-MM-DD
  const dateMatch =
    lower.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/) ||
    lower.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const d = new Date(parseInt(dateMatch[3] ?? dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1] ?? dateMatch[3]));
    if (!isNaN(d.getTime())) return startOfDay(d);
  }

  return startOfDay(addDays(now, 1)); // fallback: tomorrow
}

function extractTitle(text: string): string {
  let t = text;
  // Remove time expressions
  t = t.replace(/(?:um|at)\s+\d{1,2}(?::\d{2})?\s*(?:uhr|h|pm|am)?/gi, "");
  t = t.replace(/\d{1,2}(?::\d{2})?\s*(?:uhr|h)/gi, "");
  // Remove duration expressions
  t = t.replace(/(?:für|for)\s+\d+(?:[.,]\d+)?\s*(?:stunde[n]?|hour[s]?|h\b|minute[n]?|min)/gi, "");
  // Remove relative date words
  t = t.replace(/(?:nächste[rns]?\s+)?(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|monday|tuesday|wednesday|thursday|friday|saturday|sunday|heute|morgen|übermorgen|today|tomorrow)/gi, "");
  t = t.replace(/\b\d{1,2}\.\d{1,2}(?:\.\d{4})?\b/g, "");
  t = t.replace(/\bnächste(?:r|s|n)?\s+woche\b/gi, "");
  // Clean up
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/^[,\s]+|[,\s]+$/g, "");
  return t || "Neuer Termin";
}

export function parseNaturalLanguage(input: string): ParsedEventDraft | null {
  if (!input.trim()) return null;
  const now = new Date();
  const baseDate = parseDate(input, now);

  const timeMatch = input.match(/(?:um|at)?\s*(\d{1,2}(?::\d{2})?)\s*(?:uhr|h|pm|am)?/i);
  let startDate = baseDate;
  if (timeMatch) {
    const parsed = parseTime(timeMatch[0]);
    if (parsed) {
      startDate = setMinutes(setHours(baseDate, parsed.hours), parsed.minutes);
    }
  } else {
    startDate = setHours(baseDate, 9); // default 9am
  }

  const durationMinutes = parseDuration(input);
  const endDate = addHours(startDate, durationMinutes / 60);
  const title = extractTitle(input);

  return { title, start: startDate, end: endDate };
}
