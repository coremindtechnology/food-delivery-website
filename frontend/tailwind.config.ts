import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FFFDF8",
          100: "#FDFBF7",
          200: "#F9F5EC",
          300: "#F1E9DA",
          400: "#E3D5C0",
          500: "#CBB69B",
        },
        primary: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316", // Main Orange
          600: "#EA580C",
          700: "#C2410C",
        },
        veg: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          500: "#22C55E",
          600: "#16A34A", // Signature Veg Green
          700: "#15803D",
          800: "#166534",
        },
        nonveg: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          500: "#EF4444",
          600: "#DC2626", // Signature Non-Veg Crimson
          700: "#B91C1C",
          800: "#991B1B", // Deep Maroon
        },
        charcoal: {
          900: "#1C1917",
          800: "#292524",
          700: "#44403C",
          600: "#57534E",
          500: "#78716C",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        display: [
          '"Playfair Display"',
          "Georgia",
          "Cambria",
          '"Times New Roman"',
          "Times",
          "serif",
        ],
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.04)",
        card: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
        lift: "0 20px 30px -10px rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;

