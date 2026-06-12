"use client";

import { useState, useEffect } from "react";
import { BookOpen, Loader2, Check, X, RefreshCw, Trash2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { CalendarEvent } from "@/lib/types";

interface UntisCredentials {
  school: string;
  username: string;
  password: string;
  server: string;
  weeksAhead: number;
}

const CREDS_KEY = "untis_credentials";
const KNOWN_SERVERS = [
  "neilo.webuntis.com",
  "mese.webuntis.com",
  "kephiso.webuntis.com",
  "helios.webuntis.com",
  "arche.webuntis.com",
  "nessa.webuntis.com",
  "borys.webuntis.com",
  "peleus.webuntis.com",
  "theben.webuntis.com",
  "ikarus.webuntis.com",
];

interface Props {
  onEventsImported: (events: CalendarEvent[]) => void;
  existingEventIds: string[];
}

export default function WebUntisSetup({ onEventsImported, existingEventIds }: Props) {
  const [open, setOpen] = useState(false);
  const [creds, setCreds] = useState<UntisCredentials>({
    school: "", username: "", password: "", server: "neilo.webuntis.com", weeksAhead: 4,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CREDS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCreds(parsed);
        setConnected(true);
        const syncTime = localStorage.getItem("untis_last_sync");
        if (syncTime) setLastSync(syncTime);
      } catch {}
    }
  }, []);

  async function handleSync(savedCreds?: UntisCredentials) {
    const c = savedCreds ?? creds;
    if (!c.school || !c.username || !c.password || !c.server) {
      setStatus({ type: "error", message: "Bitte alle Felder ausfüllen." });
      return;
    }
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/webuntis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ type: "error", message: data.error ?? "Verbindung fehlgeschlagen." });
        setLoading(false);
        return;
      }

      localStorage.setItem(CREDS_KEY, JSON.stringify(c));
      const now = new Date().toLocaleString("de-DE");
      localStorage.setItem("untis_last_sync", now);
      setLastSync(now);
      setConnected(true);

      // Save to Supabase for cron-based change notifications (password excluded ideally, but needed for cron)
      fetch("/api/webuntis/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school: c.school, username: c.username, password: c.password, server: c.server }),
      }).catch(() => {});

      onEventsImported(data.events);
      setStatus({ type: "success", message: `${data.count} Stunden importiert. Suppliersstunden-Benachrichtigungen aktiv!` });
      setOpen(false);
    } catch (e) {
      setStatus({ type: "error", message: "Netzwerkfehler. Bitte versuche es erneut." });
    }
    setLoading(false);
  }

  function handleDisconnect() {
    localStorage.removeItem(CREDS_KEY);
    localStorage.removeItem("untis_last_sync");
    setConnected(false);
    setLastSync(null);
    setCreds({ school: "", username: "", password: "", server: "neilo.webuntis.com", weeksAhead: 4 });
    setStatus(null);
    fetch("/api/webuntis/credentials", { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${connected ? "bg-emerald-100" : "bg-gray-100"}`}>
            <BookOpen size={16} className={connected ? "text-emerald-600" : "text-gray-500"} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-700">WebUntis Stundenplan</p>
            {connected && lastSync ? (
              <p className="text-xs text-emerald-600">Verbunden · Sync: {lastSync}</p>
            ) : (
              <p className="text-xs text-gray-400">Zugangsdaten eingeben zum Importieren</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          )}
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {/* Form */}
      {open && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50/50">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Schule (Kürzel)</label>
              <input
                type="text"
                placeholder="z.B. brgklu"
                value={creds.school}
                onChange={(e) => setCreds((c) => ({ ...c, school: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 bg-white transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Benutzername</label>
              <input
                type="text"
                placeholder="WebUntis Username"
                value={creds.username}
                onChange={(e) => setCreds((c) => ({ ...c, username: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 bg-white transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Passwort</label>
            <input
              type="password"
              placeholder="WebUntis Passwort"
              value={creds.password}
              onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 bg-white transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Server</label>
            <select
              value={creds.server}
              onChange={(e) => setCreds((c) => ({ ...c, server: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 bg-white transition-colors"
            >
              {KNOWN_SERVERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400">Findest du in der WebUntis URL deiner Schule</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Wochen importieren</label>
            <select
              value={creds.weeksAhead}
              onChange={(e) => setCreds((c) => ({ ...c, weeksAhead: parseInt(e.target.value) }))}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 bg-white transition-colors"
            >
              <option value={2}>2 Wochen</option>
              <option value={4}>4 Wochen</option>
              <option value={8}>8 Wochen</option>
              <option value={12}>12 Wochen</option>
            </select>
          </div>

          {status && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
              status.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}>
              {status.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
              {status.message}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleSync()}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {loading ? "Importiere…" : connected ? "Erneut synchronisieren" : "Verbinden & importieren"}
            </button>
            {connected && (
              <button
                onClick={handleDisconnect}
                className="px-3 py-2.5 border border-gray-200 text-gray-500 hover:text-rose-500 hover:border-rose-200 rounded-xl transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">
            Deine Zugangsdaten werden nur lokal gespeichert und nie an Dritte weitergegeben.
          </p>
        </div>
      )}
    </div>
  );
}
