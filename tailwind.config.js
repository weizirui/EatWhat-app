/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FF6A2C",
          50: "#FFF3EC",
          100: "#FFE2D0",
          200: "#FFC4A0",
          300: "#FFA06C",
          400: "#FF8646",
          500: "#FF6A2C",
          600: "#E5531B",
          700: "#B83E14",
        },
        ink: {
          DEFAULT: "#2F4A3A",
          soft: "#5B6F62",
        },
        fog: "#9AA0A6",
        cream: {
          DEFAULT: "#FAF7F2",
          soft: "#F3EDE3",
        },
      },
      fontFamily: {
        serif: [
          "Noto Serif SC",
          "Source Han Serif SC",
          "Songti SC",
          "STSong",
          "serif",
        ],
        sans: [
          "Noto Sans SC",
          "PingFang SC",
          "Microsoft YaHei",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2.5xl": "20px",
        "3.5xl": "28px",
      },
      boxShadow: {
        pop: "0 2px 0 0 rgba(47, 74, 58, 0.06)",
        card: "0 1px 0 0 rgba(47, 74, 58, 0.08)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out",
        "slide-up": "slide-up 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        "pulse-ring": "pulse-ring 1.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};
