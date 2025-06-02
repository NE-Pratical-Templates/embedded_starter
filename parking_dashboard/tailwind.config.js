/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A8A', // Dark blue for headers
        accent: '#F59E0B', // Amber for highlights
      },
    },
  },
  plugins: [],
}