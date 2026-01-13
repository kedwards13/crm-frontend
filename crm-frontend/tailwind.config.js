/** @type {import('tailwindcss').Config} */
module.exports = {
    purge: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html",
    ],
    theme: {
      extend: {
        colors: {
          primary: "#1f6bff",
          accent: "#1f6bff",
          background: "#f6f7f9",
          surface: "#ffffff",
          muted: "#0d1220",
          danger: "#ef4444",
          success: "#12b76a",
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
