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
        ink: "#102033",
        paper: "#f7f9fc",
        line: "#d8e0ea",
        brand: "#2f5f9f",
        accent: "#4b697f"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16, 32, 51, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
