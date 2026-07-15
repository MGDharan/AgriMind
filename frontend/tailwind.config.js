/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Base surfaces (deep indigo-black) ──────────────────────────────
        earth: {
          950: '#04040f',
          900: '#08081a',
          800: '#0f0f24',
          700: '#16162e',
          600: '#1e1e3a',
        },
        // ── Primary accent (electric emerald) ──────────────────────────────
        moss: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          glow: '#00ffb3',
        },
        // ── Secondary accent (vivid amber) ─────────────────────────────────
        wheat: {
          300: '#fcd34d',
          400: '#f59e0b',
          500: '#d97706',
        },
        // ── Tertiary (vivid orange) ─────────────────────────────────────────
        terra: {
          400: '#fb923c',
          500: '#f97316',
        },
        // ── Info (electric blue-violet) ────────────────────────────────────
        sky: {
          400: '#818cf8',
          500: '#6366f1',
        },
        // ── Indigo brand ───────────────────────────────────────────────────
        brand: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'mesh': 'radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 90%, rgba(139,92,246,0.08) 0%, transparent 50%)',
        'hex-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23161630' stroke-width='0.6'/%3E%3C/svg%3E\")",
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.08) 50%, transparent 100%)',
        'login-hero': 'radial-gradient(ellipse at 30% 40%, rgba(16,185,129,0.18) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(139,92,246,0.12) 0%, transparent 50%)',
      },
      boxShadow: {
        glow:          '0 0 40px rgba(52,211,153,0.20), 0 0 80px rgba(52,211,153,0.08)',
        'glow-amber':  '0 0 30px rgba(245,158,11,0.25), 0 0 60px rgba(245,158,11,0.10)',
        'glow-violet': '0 0 30px rgba(139,92,246,0.20), 0 0 60px rgba(139,92,246,0.08)',
        'glow-sm':     '0 0 20px rgba(52,211,153,0.15)',
        glass:         '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-lg':    '0 16px 64px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        'inner-glow':  'inset 0 1px 0 rgba(52,211,153,0.15)',
      },
      animation: {
        'pulse-slow':   'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':        'float 6s ease-in-out infinite',
        'float-slow':   'float 9s ease-in-out infinite',
        'shimmer':      'shimmer 2.5s infinite',
        'glow-pulse':   'glowPulse 3s ease-in-out infinite',
        'slide-up':     'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':      'fadeIn 0.4s ease-out',
        'spin-slow':    'spin 8s linear infinite',
        'bounce-soft':  'bounceSoft 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'orb':          'orb 12s ease-in-out infinite',
        'morph':        'morph 8s ease-in-out infinite',
        'text-reveal':  'textReveal 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        'orbit':        'orbit 10s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(52,211,153,0.15)' },
          '50%':      { boxShadow: '0 0 40px rgba(52,211,153,0.40)' },
        },
        slideUp: {
          '0%':   { opacity: 0, transform: 'translateY(24px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
        bounceSoft: {
          '0%':   { transform: 'scale(0.9)' },
          '60%':  { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        orb: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(40px, -30px) scale(1.08)' },
          '66%':      { transform: 'translate(-30px, 20px) scale(0.95)' },
        },
        morph: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%':      { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
        },
        textReveal: {
          '0%':   { opacity: 0, transform: 'translateY(20px) skewY(3deg)' },
          '100%': { opacity: 1, transform: 'translateY(0) skewY(0deg)' },
        },
        orbit: {
          '0%':   { transform: 'rotate(0deg) translateX(80px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(80px) rotate(-360deg)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backdropBlur: {
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
}
