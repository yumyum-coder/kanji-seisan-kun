import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        "ink-sub": "#374151",
        muted: "#6b7280",
        paper: "#ffffff",
        surface: "#f9fafb",
        line: "#e5e7eb",
        "line-strong": "#d1d5db",
        brand: "#1e40af",
        "brand-hover": "#1c3a9c",
        "brand-soft": "#eef2ff",
        ok: "#047857",
        "ok-soft": "#ecfdf5",
        warn: "#b91c1c",
        "warn-soft": "#fef2f2"
      },
      boxShadow: {
        soft: "none"
      }
    }
  },
  plugins: []
};

export default config;
