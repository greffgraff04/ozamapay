/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ozama: {
          dark: '#0F121E',      // Fond principal
          surface: '#1A1F2E',   // Fond des cartes/inputs
          orange: '#FF7A00',    // Orange vif des boutons
          gold: '#D4AF37',      // Accents dorés
          gray: '#8E929B',      // Texte secondaire
        },
      },
    },
  },
  plugins: [],
}