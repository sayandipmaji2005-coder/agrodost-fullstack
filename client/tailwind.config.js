/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          50: '#f2fbf5',
          100: '#e1f6e8',
          200: '#c3ecd2',
          300: '#94dcaf',
          400: '#5dc285',
          500: '#34a565',
          600: '#25844e',
          700: '#1f6940',
          800: '#1c5335',
          900: '#18442d',
          950: '#0b2618',
        },
        earth: {
          50: '#fdfbf7',
          100: '#f8f4ec',
          200: '#f0e6d4',
          300: '#e3d2b2',
          400: '#d4b78a',
          500: '#c59d67',
          600: '#b48553',
          700: '#966a43',
          800: '#7a553b',
          900: '#644733',
        },
        monsoon: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          700: '#0369a1',
          900: '#0c4a6e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
