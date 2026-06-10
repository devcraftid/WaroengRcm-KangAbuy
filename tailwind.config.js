/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff5f2',
          100: '#ffe8e0',
          200: '#ffc9b5',
          300: '#ffa082',
          400: '#ff6b42',
          500: '#f05a28',
          600: '#d44d1f',
          700: '#b33e18',
          800: '#8a2e10',
          900: '#67200a',
        },
        brand: '#f05a28',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        'app': '480px',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in':  'fadeIn 0.25s ease-out',
        'shimmer':  'shimmer 1.6s infinite linear',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition:  '400px 0' },
        },
      },
      boxShadow: {
        'app':  '0 0 0 1px rgba(0,0,0,0.06), 0 8px 40px rgba(0,0,0,0.10)',
        'card': '0 2px 8px rgba(0,0,0,0.06)',
        'bar':  '0 -2px 12px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}