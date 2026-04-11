import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effdfa",
          100: "#d8faf1",
          200: "#b3f3e2",
          300: "#7de9cd",
          400: "#3fd7b1",
          500: "#1fc49d",
          600: "#179d7f",
          700: "#157d67",
          800: "#156453",
          900: "#155245"
        },
        asphalt: {
          50: "#f5f7fa",
          100: "#ebeef4",
          200: "#d2d8e3",
          300: "#a8b3c7",
          400: "#7a8aa8",
          500: "#5c6b8d",
          600: "#495675",
          700: "#3d465f",
          800: "#353c50",
          900: "#313646"
        }
      },
      boxShadow: {
        shell: "0 16px 40px rgba(26, 37, 61, 0.16)"
      },
      backgroundImage: {
        "speed-grid":
          "radial-gradient(circle at 1px 1px, rgba(116, 130, 156, 0.18) 1px, transparent 0)",
        "hero-glow":
          "radial-gradient(1200px 600px at 20% -20%, rgba(31, 196, 157, 0.3), transparent 70%), radial-gradient(900px 480px at 100% 0%, rgba(42, 88, 140, 0.28), transparent 70%)"
      }
    }
  },
  plugins: []
};

export default config;
