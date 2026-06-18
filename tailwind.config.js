/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        archive: {
          navy: {
            50: "#f0f4f9",
            100: "#d9e2ec",
            200: "#b3c6da",
            300: "#8da9c7",
            400: "#5a7fa9",
            500: "#1e3a5f",
            600: "#1a3355",
            700: "#152a46",
            800: "#102137",
            900: "#0b1828",
          },
          gold: {
            50: "#fbf8f1",
            100: "#f4ecd6",
            200: "#e9d9ad",
            300: "#dcc584",
            400: "#d2b362",
            500: "#c9a961",
            600: "#b5934a",
            700: "#97783c",
            800: "#795e31",
            900: "#5c4624",
          },
        },
      },
      fontFamily: {
        serif: [
          '"Noto Serif SC"',
          '"Source Han Serif CN"',
          '"Songti SC"',
          "SimSun",
          "serif",
        ],
        sans: [
          '"Noto Sans SC"',
          '"Source Han Sans CN"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(30, 58, 95, 0.08), 0 1px 2px rgba(30, 58, 95, 0.06)",
        "card-hover":
          "0 4px 12px rgba(30, 58, 95, 0.12), 0 2px 4px rgba(30, 58, 95, 0.08)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-once": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "pulse-once": "pulse-once 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
