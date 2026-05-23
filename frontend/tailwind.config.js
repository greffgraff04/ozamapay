/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'space-grotesk': ['var(--font-space-grotesk)', 'sans-serif'],
      },
      colors: {
        ozama: {
          dark: '#0F121E',      // Fond principal
          surface: '#1A1F2E',   // Fond des cartes/inputs
          orange: '#FF7A00',    // Orange vif des boutons
          gold: '#D4AF37',      // Accents dorés
          gray: '#8E929B',      // Texte secondaire
        },
        // Tailwind defaults pou Framer Motion
        orange: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
        slate: {
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
    },
  },
  plugins: [],
}