/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        canvas: {
          DEFAULT: '#f1f5f9',
          dark: '#0f172a',
        },
      },
      boxShadow: {
        soft: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
        card: '0 1px 3px 0 rgb(15 23 42 / 0.08), 0 4px 12px -2px rgb(15 23 42 / 0.05)',
      },
    },
  },
  plugins: [],
};
