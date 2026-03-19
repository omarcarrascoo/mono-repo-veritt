/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        veritt: {
          bg: '#000000',
          surface: '#0B0B0B',
          surfaceSoft: '#050505',
          border: '#1D1D1D',
          borderStrong: '#3A3A3A',
          text: '#FFFFFF',
          muted: '#8C8C8C',
          mutedStrong: '#7A7A7A',
          mutedSoft: '#6A6A6A',
          inactive: '#555555',
        },
      },
      borderRadius: {
        veritt: '18px',
        card: '22px',
      },
      letterSpacing: {
        eyebrow: '3px',
        tightHero: '-1.5px',
      },
    },
  },
  plugins: [],
};