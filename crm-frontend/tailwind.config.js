/** @type {import('tailwindcss').Config} */
const templatePaths = ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'];

module.exports = {
  // Tailwind v2 (postcss7-compat) reads `purge`; keep `content` for forward-compat.
  purge: templatePaths,
  content: templatePaths,
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--accent)',
        'primary-dim': 'var(--accent-dim)',
        background: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        border: 'var(--border)',
        text: 'var(--text-main)',
        muted: 'var(--text-muted)'
      },
      boxShadow: {
        glow: '0 0 20px var(--accent-dim)',
        'glow-strong': '0 0 30px var(--accent)'
      }
    }
  },
  plugins: []
};
