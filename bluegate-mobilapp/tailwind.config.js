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
<<<<<<< HEAD
        "text-dark": "#f1e4e4",
=======
>>>>>>> 4fe2ae4 (Tailwind css es NativeWind css inicializálása, egyedi dizájn rendszer beállítása, valamint az AGI-12es feladat route resze)
        text: {
          light: "#f1e4e4",
          muted: "rgba(241, 228, 228, 0.6)",
        },
      },
      fontFamily: {
<<<<<<< HEAD
        display: [
          "Manrope_400Regular",
          "Manrope_500Medium",
          "Manrope_700Bold",
          "Manrope_800ExtraBold",
        ],
=======
        display: ["Manrope_400Regular", "Manrope_500Medium", "Manrope_700Bold", "Manrope_800ExtraBold"],
>>>>>>> 4fe2ae4 (Tailwind css es NativeWind css inicializálása, egyedi dizájn rendszer beállítása, valamint az AGI-12es feladat route resze)
      },
    },
  },
  plugins: [],
};
