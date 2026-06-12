"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
    const standalone = (window.navigator as unknown as { standalone: boolean }).standalone;
    setIsIOS(ios);
    if (ios && !standalone && !localStorage.getItem("pwa-ios-dismissed")) {
      setTimeout(() => setShowIOSGuide(true), 3000);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed) return null;

  // Android / Desktop install prompt
  if (prompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-40 max-w-sm mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl shadow-blue-100 border border-blue-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">App installieren</p>
            <p className="text-xs text-gray-500">Kalender auf dem Homescreen</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await prompt.prompt();
                const { outcome } = await prompt.userChoice;
                if (outcome === "accepted") setPrompt(null);
                setDismissed(true);
              }}
              className="text-xs font-semibold text-white bg-blue-500 px-3 py-1.5 rounded-xl hover:bg-blue-600 transition-colors"
            >
              Installieren
            </button>
            <button onClick={() => setDismissed(true)} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iOS guide
  if (isIOS && showIOSGuide) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-40 max-w-sm mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl shadow-blue-100 border border-blue-100 p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-semibold text-gray-800">Auf Homescreen installieren</p>
            <button
              onClick={() => { setShowIOSGuide(false); localStorage.setItem("pwa-ios-dismissed", "1"); }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
          <ol className="space-y-1.5 text-xs text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</span>
              Tippe auf das <span className="font-semibold">Teilen-Symbol</span> unten in Safari
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</span>
              Wähle <span className="font-semibold">„Zum Home-Bildschirm"</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</span>
              Tippe auf <span className="font-semibold">„Hinzufügen"</span>
            </li>
          </ol>
        </div>
      </div>
    );
  }

  return null;
}
