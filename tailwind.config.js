/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hwaseong: {
          blue:    "#003087",
          skyblue: "#0066CC",
          light:   "#E8F0FB",
          green:   "#2E7D32",
          gray:    "#F5F7FA",
          text:    "#1A1A2E",
        },
      },
      fontFamily: {
        sans: ["Noto Sans KR", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
