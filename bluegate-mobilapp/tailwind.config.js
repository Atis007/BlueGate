/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#11dee8",
        "background-light": "#f6f8f8",
        "background-dark": "#010e0e",
        "text-dark": "#f1e4e4",
        text: {
          light: "#f1e4e4",
          muted: "rgba(241, 228, 228, 0.6)",
        },
      },
      fontFamily: {
        display: ["Manrope_400Regular", "Manrope_500Medium", "Manrope_700Bold", "Manrope_800ExtraBold"],
      },
    },
  },
  plugins: [],
};
