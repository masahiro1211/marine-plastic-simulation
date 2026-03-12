/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ocean: {
          light: "#0d47a1",
          dark: "#1a237e",
          bg: "#0a1929",
        },
        fish: "#4fc3f7",
        predator: "#ef5350",
        plastic: "#a1887f",
      },
    },
  },
  plugins: [],
};
