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
        primary: {
          DEFAULT: "#003B95",
          foreground: "#ffffff",
          50: "#e6eef8",
          100: "#c0d4f0",
          200: "#96b8e8",
          300: "#6b9bdf",
          400: "#4a85d9",
          500: "#2970d3",
          600: "#1f5fc0",
          700: "#144ba8",
          800: "#0a3890",
          900: "#003B95",
        },
        accent: {
          DEFAULT: "#00AEEF",
          light: "#e6f7fd",
        },
        border: "hsl(214.3 31.8% 91.4%)",
        input: "hsl(214.3 31.8% 91.4%)",
        ring: "#003B95",
        background: "hsl(210 20% 98%)",
        foreground: "hsl(222.2 84% 4.9%)",
        card: {
          DEFAULT: "rgba(255, 255, 255, 0.95)",
          foreground: "hsl(222.2 84% 4.9%)",
        },
        muted: {
          DEFAULT: "hsl(210 40% 96.1%)",
          foreground: "hsl(215.4 16.3% 46.9%)",
        },
        destructive: {
          DEFAULT: "hsl(0 84.2% 60.2%)",
          foreground: "hsl(210 40% 98%)",
        },
        success: {
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["Sarabun", "ui-sans-serif", "system-ui"],
        sarabun: ["Sarabun", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      boxShadow: {
        premium: "0 10px 15px -3px rgba(0, 45, 114, 0.15), 0 4px 6px -2px rgba(0, 45, 114, 0.05)",
        card: "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
