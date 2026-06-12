export type CalendarView = "month" | "week" | "day";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO string
  end: string; // ISO string
  color?: string;
  allDay?: boolean;
  remindMinutes?: number; // minutes before event to send push
}

export interface ParsedEventDraft {
  title: string;
  start: Date;
  end: Date;
  description?: string;
}
