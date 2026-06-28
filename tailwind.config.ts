import type { Config } from "tailwindcss";

/**
 * Design system: a restrained consulting aesthetic.
 * - `brand`  : deep navy / slate primary (trust, authority)
 * - `accent` : a single warm terracotta/amber (energy, the one "human" note)
 * Neutrals come from Tailwind's built-in `slate`. Generous whitespace + serif
 * headings are applied in globals.css.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F2F6FA",
          100: "#E2EAF2",
          200: "#C5D5E6",
          300: "#9DB6D1",
          400: "#6E8FB5",
          500: "#4A6C97",
          600: "#38547A",
          700: "#2C4361",
          800: "#1E2F46",
          900: "#14223A",
          950: "#0B1526",
        },
        accent: {
          50: "#FBF4EE",
          100: "#F6E6D7",
          200: "#ECC8AC",
          300: "#E0A57C",
          400: "#D4824F",
          500: "#C2643F",
          600: "#A8512F",
          700: "#874023",
          800: "#6B3320",
          900: "#582C1E",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        serif: [
          "ui-serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "Times",
          "serif",
        ],
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};

export default config;
