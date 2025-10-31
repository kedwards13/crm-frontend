/** @type {import('tailwindcss').Config} */
module.exports = {
    purge: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html",
    ],
    theme: {
      extend: {
        colors: {
          primary: "#1f78ff",
          accent: "#10b981",
          background: "#f8f9fb",
          surface: "#ffffff",
          muted: "#6b7280",
          danger: "#ef4444",
          success: "#22c55e",
        },
        borderRadius: {
          xl: "1rem",
          '2xl': "1.5rem",
        },
        fontFamily: {
          sans: ["Inter", "ui-sans-serif", "system-ui"],
        },
      },
    },
    plugins: [],
  };