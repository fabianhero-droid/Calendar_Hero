import { NextRequest, NextResponse } from "next/server";
import { WebUntis } from "webuntis";
import { startOfWeek, endOfWeek, addWeeks, format } from "date-fns";
import { CalendarEvent } from "@/lib/types";

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Map subject names to colors
function colorForSubject(subject: string): string {
  const s = subject.toLowerCase();
  if (/math|mathe/.test(s)) return "blue";
  if (/deutsch|german|deu/.test(s)) return "violet";
  if (/englisch|english|eng/.test(s)) return "sky";
  if (/sport|pe|turn/.test(s)) return "emerald";
  if (/bio|chemie|physik|natur/.test(s)) return "emerald";
  if (/kunst|musik|theater/.test(s)) return "amber";
  if (/geschichte|geo|politik|sow/.test(s)) return "rose";
  return "blue";
}

export async function POST(req: NextRequest) {
  try {
    const { school, username, password, server, weeksAhead = 4 } = await req.json();

    if (!school || !username || !password || !server) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich." }, { status: 400 });
    }

    // Normalize school slug: remove spaces, try as-is first
    const schoolSlug = school.trim();
    const untis = new WebUntis(schoolSlug, username, password, server);
    await untis.login();

    const now = new Date();
    const events: CalendarEvent[] = [];

    for (let w = -1; w < weeksAhead; w++) {
      const weekDate = addWeeks(now, w);
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

      const timetable = await untis.getOwnTimetableForRange(weekStart, weekEnd);

      for (const lesson of timetable) {
        if (lesson.code === "cancelled") continue; // skip cancelled lessons

        const dateStr = lesson.date.toString();
        const year = dateStr.slice(0, 4);
        const month = dateStr.slice(4, 6);
        const day = dateStr.slice(6, 8);

        const startTimeStr = lesson.startTime.toString().padStart(4, "0");
        const endTimeStr = lesson.endTime.toString().padStart(4, "0");

        const startHour = parseInt(startTimeStr.slice(0, 2));
        const startMin = parseInt(startTimeStr.slice(2, 4));
        const endHour = parseInt(endTimeStr.slice(0, 2));
        const endMin = parseInt(endTimeStr.slice(2, 4));

        const start = new Date(`${year}-${month}-${day}T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`);
        const end = new Date(`${year}-${month}-${day}T${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`);

        const subjectName = lesson.su?.[0]?.longname ?? lesson.su?.[0]?.name ?? "Unterricht";
        const teacherName = lesson.te?.[0]?.longname ?? lesson.te?.[0]?.name ?? "";
        const roomName = lesson.ro?.[0]?.name ?? "";

        const description = [
          teacherName && `Lehrer: ${teacherName}`,
          roomName && `Raum: ${roomName}`,
          lesson.code === "irregular" ? "⚠️ Geändert" : "",
        ]
          .filter(Boolean)
          .join(" · ");

        events.push({
          id: `untis_${lesson.id}_${dateStr}`,
          title: subjectName,
          description: description || undefined,
          start: start.toISOString(),
          end: end.toISOString(),
          color: colorForSubject(subjectName),
          allDay: false,
        });
      }
    }

    await untis.logout();

    return NextResponse.json({ events, count: events.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("WebUntis error:", message);

    if (message.includes("404") || message.includes("not found") || message.includes("school")) {
      return NextResponse.json({
        error: `Schule nicht gefunden. Öffne webuntis.com → melde dich an → kopiere den Wert nach "?school=" aus der URL (z.B. "htbla-steyr").`,
      }, { status: 404 });
    }
    if (message.includes("credentials") || message.includes("401") || message.includes("login") || message.includes("password")) {
      return NextResponse.json({ error: "Falsches Passwort oder falscher Benutzername." }, { status: 401 });
    }
    if (message.includes("ENOTFOUND") || message.includes("network") || message.includes("ECONNREFUSED")) {
      return NextResponse.json({ error: `Server "${server}" nicht erreichbar. Bitte den richtigen WebUntis-Server wählen.` }, { status: 503 });
    }
    return NextResponse.json({ error: `Fehler: ${message}` }, { status: 500 });
  }
}
