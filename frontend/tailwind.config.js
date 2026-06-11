/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        primary: {
          50:  '#edf7f2',
          100: '#d0ecdf',
          200: '#a3d9c0',
          300: '#6dc2a0',
          400: '#3da880',
          500: '#248f68',
          600: '#1a7352',
          700: '#155c41',
          800: '#114933',
          900: '#0d3b29',
          950: '#081f16',
        },
        accent: {
          50:  '#fff2ee',
          100: '#ffddd3',
          200: '#ffbba8',
          300: '#ff9070',
          400: '#f76540',
          500: '#e84a1e',
          600: '#c93a12',
          700: '#a82e0e',
          800: '#8b2710',
          900: '#732413',
        },
        surface: {
          50: '#f8faf8',
          100: '#f0f5f1',
          200: '#dce8de',
          300: '#b8d1bc',
          400: '#8aad8e',
          500: '#5e8a64',
          600: '#436d49',
          700: '#315238',
          800: '#1e3523',
          900: '#111e15',
          950: '#090f0a',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.3s ease-out',
        'fade-in-left': 'fadeInLeft 0.3s ease-out',
        'fade-in-right': 'fadeInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'wiggle': 'wiggle 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-2deg)' },
          '75%': { transform: 'rotate(2deg)' },
        },
      },
    },
  },
  plugins: [],
};
