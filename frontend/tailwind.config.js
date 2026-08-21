/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF8F4',
        vermilion: '#C0392B',
        ink: '#2B2B2B',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
      },
      maxWidth: {
        content: '680px',
      },
    },
  },
  plugins: [],
}
