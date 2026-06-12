"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";

export default function NotificationBell() {
  const [status, setStatus] = useState<"default" | "granted" | "denied" | "unsupported">("default");
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as typeof status);
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("denied"); setLoading(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!).buffer as ArrayBuffer,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      setStatus("granted");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("default");
    } catch {}
    setLoading(false);
  }

  if (status === "unsupported") return null;

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (status === "granted") { setShowTooltip((v) => !v); return; }
          subscribe();
        }}
        disabled={loading || status === "denied"}
        className={`p-2 rounded-xl transition-all ${
          status === "granted"
            ? "text-blue-500 bg-blue-50 hover:bg-blue-100"
            : status === "denied"
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        }`}
        title={
          status === "granted" ? "Push-Benachrichtigungen aktiv" :
          status === "denied" ? "Benachrichtigungen blockiert" :
          "Benachrichtigungen aktivieren"
        }
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : status === "granted" ? (
          <Bell size={18} className="fill-current" />
        ) : (
          <Bell size={18} />
        )}
      </button>

      {showTooltip && status === "granted" && (
        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-52 z-50">
          <div className="flex items-center gap-2 mb-2">
            <Check size={14} className="text-emerald-500" />
            <span className="text-xs font-semibold text-gray-700">Benachrichtigungen aktiv</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Du erhältst Erinnerungen für deine Termine.</p>
          <button
            onClick={() => { unsubscribe(); setShowTooltip(false); }}
            className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1"
          >
            <BellOff size={12} /> Deaktivieren
          </button>
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
