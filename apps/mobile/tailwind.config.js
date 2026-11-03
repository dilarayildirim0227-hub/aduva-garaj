/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Aduva Garaj Metalik Krom & Şampanya Altın Backlight Koyu Tema
        primary: { DEFAULT: '#D4AF37', dark: '#AA8620' },
        chrome: { DEFAULT: '#E2E8F0', dark: '#94A3B8' },
        bg: '#0D0E11',
        surface: { DEFAULT: '#15171C', alt: '#1E2128' },
        line: '#2B303B',
        fg: { DEFAULT: '#F8FAFC', muted: '#94A3B8' },
        ok: '#22C55E',
        warn: '#F59E0B',
      },
    },
  },
  plugins: [],
};
