/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#fdf8ee',
          100: '#f8edcc',
          200: '#f0d899',
          300: '#e6bc5e',
          400: '#dfa232',
          500: '#d4871a',
        },
        dungeon: {
          900: '#0f0e0d',
          800: '#1a1916',
          700: '#252320',
          600: '#322f2b',
          500: '#413d38',
          400: '#5a5450',
        },
      },
      fontFamily: {
        fantasy: ['Cinzel', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
