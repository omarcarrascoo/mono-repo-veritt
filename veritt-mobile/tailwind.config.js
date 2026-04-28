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
          surface: '#0A0A0A',
          surfaceSoft: '#050505',
          surfaceElevated: '#101010',
          surfaceHi: '#161616',
          border: '#1A1A1A',
          borderStrong: '#2A2A2A',
          borderSubtle: '#0D0D0D',
          text: '#F5F2EA',
          muted: '#8C8C8C',
          mutedStrong: '#6E6E6E',
          mutedSoft: '#555555',
          inactive: '#3A3A3A',
          paper: '#F5F2EA',
          paperSoft: '#E8E3D4',
          bone: '#CFC8B5',
          ink: '#0A0A0A',
          forest: '#4A7C59',
          forestDeep: '#1F3A2B',
          forestInk: '#0C1A14',
          sage: '#8FB09D',
          steel: '#6B7A8F',
          steelDeep: '#2A3544',
          amber: '#C48A3A',
          amberDeep: '#5E3F14',
          amberInk: '#1A0F03',
          danger: '#C25450',
          dangerDeep: '#3D1312',
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