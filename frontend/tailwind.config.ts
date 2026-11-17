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
          50: "#F7F7F7",
          100: "#F7F7F7",
          200: "#E9E9EB",
          300: "#E9E9EB",
          400: "#D3D3D7",
          500: "#686B78",
        },
        primary: {
          50: "#FFF4EA",
          100: "#FFE7D2",
          200: "#FFD0A8",
          300: "#FFB378",
          400: "#FF9847",
          500: "#FC8019",
          600: "#E66C0A",
          700: "#C35409",
        },
        success: {
          50: "#F1F7F2",
          100: "#E4EFE6",
          200: "#C6DDCA",
          400: "#5BA76C",
          500: "#318849",
          600: "#267E3E",
          700: "#1F6532",
          800: "#194F29",
          900: "#123B1E",
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
          900: "#282C3F",
          800: "#34384B",
          700: "#484B5B",
          600: "#686B78",
          500: "#686B78",
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
