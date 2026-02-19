/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bull: { DEFAULT: "#22c55e", muted: "#16a34a20" },
        bear: { DEFAULT: "#ef4444", muted: "#dc262620" },
        surface: {
          0: "#09090b",
          1: "#111113",
          2: "#1a1a1f",
          3: "#232329",
        },
        border: "#27272a",
        accent: "#6366f1",
        warning: "#eab308",
        gold: "#f59e0b",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
