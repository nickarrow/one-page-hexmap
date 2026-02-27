/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: '#fdf4d6',
        'warm-gray': '#656058',
      },
      fontFamily: {
        serif: ['"Times New Roman"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
