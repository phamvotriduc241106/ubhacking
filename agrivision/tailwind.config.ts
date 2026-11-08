import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1320px" } },
    extend: {
      fontFamily: {
        sans: ["'Inter Variable'", "system-ui", "sans-serif"],
        display: ["'Sora Variable'", "'Inter Variable'", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        forest: { 950: "#06140d", 900: "#0b2117", 800: "#10301f", 700: "#164229", 600: "#1d5636" },
        emerald: { 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669" },
        sage: { 200: "#d5e0d1", 300: "#b9cbb5", 400: "#9cb59a", 500: "#7d9a7a" },
        cream: { 50: "#fbf9f3", 100: "#f5f1e6", 200: "#ebe4d1" },
        gold: { 300: "#e6cc85", 400: "#d8b865", 500: "#c9a54c" },
        charcoal: { 700: "#2a2f2c", 800: "#1c1f1d", 900: "#121413" },
        status: { healthy: "#22c55e", attention: "#eab308", stress: "#ef4444" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 4px)", sm: "calc(var(--radius) - 8px)" },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        "pulse-ring": { "0%": { transform: "scale(0.8)", opacity: "0.8" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
        rain: { "0%": { transform: "translateY(-10%)" }, "100%": { transform: "translateY(110%)" } },
        drift: { "0%": { transform: "translateX(-10%)" }, "100%": { transform: "translateX(110%)" } },
        spin_slow: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2.4s linear infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite",
        rain: "rain 0.8s linear infinite",
        drift: "drift 40s linear infinite",
        "spin-slow": "spin_slow 12s linear infinite",
      },
    },
  },
  plugins: [animate],
};
export default config;
