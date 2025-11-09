import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f7f3ef",
          100: "#e9e1d8",
          200: "#d5c7b7",
          300: "#c1a992",
          400: "#ad8c70",
          500: "#96755a",
          600: "#7d5e48",
          700: "#644a3a",
          800: "#4c382c",
          900: "#33251e"
        },
        secondary: {
          50: "#f1f6f4",
          100: "#d6e6e0",
          200: "#b1cdc2",
          300: "#8db3a4",
          400: "#689a87",
          500: "#507d6c",
          600: "#406454",
          700: "#324c41",
          800: "#24352e",
          900: "#121d19"
        },
        accent: {
          50: "#fdf5f1",
          100: "#f9e5da",
          200: "#f3cbb7",
          300: "#ecb194",
          400: "#e69771",
          500: "#dd7d4e",
          600: "#c5613a",
          700: "#9c4c2e",
          800: "#743922",
          900: "#4d2517"
        }
      },
      boxShadow: {
        soft: "0 4px 15px rgba(0, 0, 0, 0.05)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.08)"
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px"
      }
    }
  },
  darkMode: ["class"],
  plugins: []
}

export default config
