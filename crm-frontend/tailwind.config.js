/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--accent)',
        'primary-dim': 'var(--accent-dim)',
        background: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        border: 'var(--border)',
        text: 'var(--text-main)',
        muted: 'var(--text-muted)',
      },
      boxShadow: {
        glow: '0 0 20px var(--accent-dim)',
        'glow-strong': '0 0 30px var(--accent)',
      },
    },
  },
  plugins: [],
};
