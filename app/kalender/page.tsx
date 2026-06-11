import Calendar from "@/components/calendar/Calendar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar Hero – KI-Kalender",
  description: "Dein intelligenter Kalender mit KI-Assistent",
};

export default function KalenderPage() {
  return (
    <main className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-hidden max-w-screen-2xl mx-auto w-full h-full">
        <Calendar />
      </div>
    </main>
  );
}
