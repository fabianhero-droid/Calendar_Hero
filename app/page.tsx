import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-violet-50">
      <div className="text-center max-w-lg mx-auto px-6">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Calendar Hero</h1>
        <p className="text-gray-500 mb-8 text-lg">
          Dein intelligenter Kalender mit KI-Assistent
        </p>
        <Link
          href="/kalender"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-2xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-200"
        >
          Zum Kalender →
        </Link>
      </div>
    </main>
  );
}
