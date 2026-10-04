/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: { DEFAULT: "#00D4AA", dark: "#00b894", light: "rgba(0,212,170,0.12)" },
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
      keyframes: {
        fadeUp:  { "0%": { opacity: 0, transform: "translateY(18px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        pulse2:  { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } },
        scanline:{ "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100vh)" } },
        ticker:  { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        blink:   { "0%,100%": { opacity: 1 }, "50%": { opacity: 0 } },
        ripple:  { "0%": { transform: "scale(1)", opacity: 0.6 }, "100%": { transform: "scale(3)", opacity: 0 } },
      },
      animation: {
        fadeUp:       "fadeUp 0.7s ease both",
        "fadeUp-d1":  "fadeUp 0.7s 0.1s ease both",
        "fadeUp-d2":  "fadeUp 0.7s 0.22s ease both",
        "fadeUp-d3":  "fadeUp 0.7s 0.38s ease both",
        pulse2:       "pulse2 2s ease-in-out infinite",
        scanline:     "scanline 3s linear infinite",
        ticker:       "ticker 20s linear infinite",
        blink:        "blink 1s step-end infinite",
        ripple:       "ripple 1.5s ease-out infinite",
      },
    },
  },
  plugins: [],
}
