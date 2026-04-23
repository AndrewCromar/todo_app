import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Todo PWA",
    short_name: "Todo",
    description: "Personal todo app with reminders",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/globe.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
