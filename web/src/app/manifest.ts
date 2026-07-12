import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "أسعار — Asaar",
    short_name: "Asaar",
    description:
      "قارن أسعار الموبايلات في مصر بين المتاجر | Compare phone prices across Egyptian stores",
    start_url: "/ar",
    display: "standalone",
    background_color: "#0b0f17",
    theme_color: "#0b0f17",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
