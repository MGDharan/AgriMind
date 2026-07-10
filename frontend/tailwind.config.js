/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        earth: {
          950: '#0a0f0c',
          900: '#0f1612',
          800: '#1a2420',
          700: '#243029',
          600: '#2f3d35',
        },
        moss: {
          400: '#7cb87a',
          500: '#5a9e58',
          600: '#3d7a3c',
          glow: '#8eff8a',
        },
        wheat: {
          300: '#e8c87a',
          400: '#d4a853',
          500: '#b8892e',
        },
        terra: {
          400: '#d4845c',
          500: '#c0673b',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'mesh': 'radial-gradient(ellipse at 20% 50%, rgba(90,158,88,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(212,168,83,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(61,122,60,0.08) 0%, transparent 50%)',
        'hex-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23243029' stroke-width='0.5'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        glow: '0 0 40px rgba(124, 184, 122, 0.15)',
        'glow-wheat': '0 0 30px rgba(212, 168, 83, 0.2)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
