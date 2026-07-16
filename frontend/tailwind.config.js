/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1216",
        panel: "#1A1E25",
        panel2: "#20252E",
        line: "#2B303B",
        muted: "#8B93A3",
        fog: "#C7CCD6",
        paper: "#ECEEF1",
        rec: "#FF5A36",
        rec2: "#FF8A5B",
        tape: "#E8B93F",
        decide: "#37D6A7",
      },
      fontFamily: {
        display: ["'Bebas Neue'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      letterSpacing: {
        widest2: "0.18em",
      },
      keyframes: {
        spin_slow: { to: { transform: "rotate(360deg)" } },
        blink: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.25 } },
        rise: { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
      animation: {
        reel: "spin_slow 6s linear infinite",
        rec: "blink 1.6s ease-in-out infinite",
        rise: "rise 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
