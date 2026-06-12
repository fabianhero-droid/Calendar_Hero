import { NextRequest, NextResponse } from "next/server";
import { WebUntis } from "webuntis";
import { startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { CalendarEvent } from "@/lib/types";

function colorForSubject(subject: string): string {
  const s = subject.toLowerCase();
  if (/math|mathe/.test(s)) return "blue";
  if (/deutsch|german|deu/.test(s)) return "violet";
  if (/englisch|english|eng/.test(s)) return "sky";
  if (/sport|pe|turn/.test(s)) return "emerald";
  if (/bio|chemie|physik|natur|wissensch/.test(s)) return "emerald";
  if (/kunst|musik|theater/.test(s)) return "amber";
  if (/geschichte|geo|politik|sow|religion/.test(s)) return "rose";
  if (/labor|praktikum/.test(s)) return "violet";
  if (/wirtschaft|recht|betriebs/.test(s)) return "amber";
  return "blue";
}

// Convert WebUntis local school time to correct UTC ISO string
// WebUntis times are LOCAL school time — Vercel runs on UTC, so we must apply timezone offset
function schoolTimeToISO(dateStr: string, timeInt: number): string {
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6));
  const day = parseInt(dateStr.slice(6, 8));

  const timeStr = timeInt.toString().padStart(4, "0");
  const hour = parseInt(timeStr.slice(0, 2));
  const min = parseInt(timeStr.slice(2, 4));

  // Austria timezone: CEST (UTC+2) Apr–Oct, CET (UTC+1) Nov–Mar
  // Approximate: months 4-10 = UTC+2, else UTC+1
  const tzOffsetHours = (month >= 4 && month <= 10) ? 2 : 1;

  // Convert local time to UTC
  const utcMs = Date.UTC(year, month - 1, day, hour - tzOffsetHours, min, 0);
  return new Date(utcMs).toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const { school, username, password, server, weeksAhead = 4 } = await req.json();

    if (!school || !username || !password || !server) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich." }, { status: 400 });
    }

    const untis = new WebUntis(school.trim(), username, password, server);
    await untis.login();

    const now = new Date();
    const lessonsByDay: Record<string, typeof Array.prototype> = {};

    for (let w = -1; w < weeksAhead; w++) {
      const weekDate = addWeeks(now, w);
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

      const timetable = await untis.getOwnTimetableForRange(weekStart, weekEnd);

      for (const lesson of timetable) {
        if (lesson.code === "cancelled") continue;
        const dateStr = lesson.date.toString();
        if (!lessonsByDay[dateStr]) lessonsByDay[dateStr] = [];
        lessonsByDay[dateStr].push(lesson);
      }
    }

    await untis.logout();

    const events: CalendarEvent[] = [];

    for (const [dateStr, dayLessons] of Object.entries(lessonsByDay)) {
      // Sort lessons by start time
      const sorted = [...(dayLessons as { startTime: number; endTime: number; id: number; su: { longname?: string; name?: string }[]; te: { longname?: string; name?: string }[]; ro: { name?: string }[]; code?: string }[])]
        .sort((a, b) => a.startTime - b.startTime);

      for (let i = 0; i < sorted.length; i++) {
        const lesson = sorted[i];

        const subjectName = lesson.su?.[0]?.longname ?? lesson.su?.[0]?.name ?? "Unterricht";
        const teacherName = lesson.te?.[0]?.longname ?? lesson.te?.[0]?.name ?? "";
        const roomName = lesson.ro?.[0]?.name ?? "";

        const description = [
          teacherName && `Lehrer: ${teacherName}`,
          roomName && `Raum: ${roomName}`,
          lesson.code === "irregular" ? "⚠️ Geändert" : "",
        ].filter(Boolean).join(" · ");

        events.push({
          id: `untis_${lesson.id}_${dateStr}`,
          title: subjectName,
          description: description || undefined,
          start: schoolTimeToISO(dateStr, lesson.startTime),
          end: schoolTimeToISO(dateStr, lesson.endTime),
          color: colorForSubject(subjectName),
          allDay: false,
        });

        // Add break between this and next lesson if gap >= 5 minutes
        if (i < sorted.length - 1) {
          const nextLesson = sorted[i + 1];
          const thisEnd = lesson.endTime;
          const nextStart = nextLesson.startTime;

          // Calculate gap in minutes
          const thisEndH = Math.floor(thisEnd / 100);
          const thisEndM = thisEnd % 100;
          const nextStartH = Math.floor(nextStart / 100);
          const nextStartM = nextStart % 100;
          const gapMins = (nextStartH * 60 + nextStartM) - (thisEndH * 60 + thisEndM);

          if (gapMins >= 5 && gapMins <= 60) {
            events.push({
              id: `untis_break_${dateStr}_${thisEnd}`,
              title: gapMins >= 20 ? `☕ Pause (${gapMins} Min)` : `Pause (${gapMins} Min)`,
              description: undefined,
              start: schoolTimeToISO(dateStr, thisEnd),
              end: schoolTimeToISO(dateStr, nextStart),
              color: "amber",
              allDay: false,
            });
          }
        }
      }
    }

    return NextResponse.json({ events, count: events.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("WebUntis error:", message);

    if (message.includes("404") || message.includes("not found") || message.includes("school")) {
      return NextResponse.json({
        error: `Schule nicht gefunden. Öffne webuntis.com → URL → Wert nach "?school=" kopieren.`,
      }, { status: 404 });
    }
    if (message.includes("credentials") || message.includes("401") || message.includes("login") || message.includes("password")) {
      return NextResponse.json({ error: "Falsches Passwort oder falscher Benutzername." }, { status: 401 });
    }
    if (message.includes("ENOTFOUND") || message.includes("ECONNREFUSED")) {
      return NextResponse.json({ error: "Server nicht erreichbar. Bitte den richtigen WebUntis-Server wählen." }, { status: 503 });
    }
    return NextResponse.json({ error: `Fehler: ${message}` }, { status: 500 });
  }
}
