import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Calendar Hero",
    short_name: "CalHero",
    description: "KI-Kalender mit Push-Erinnerungen",
    start_url: "/kalender",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3b82f6",
    orientation: "portrait",
    icons: [
      { src: "/icon-72.png", sizes: "72x72", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["productivity", "utilities"],
  };
}
