/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // class stratejisi kullanılıyor
  theme: {
    extend: {
      colors: {
        // Dark mode için özel renkler
        'dark-bg': '#121212',
        'dark-card': '#1E1E1E',
        'dark-border': '#333333',
        'dark-text': '#E0E0E0',
        'dark-text-secondary': '#AAAAAA',
      },
    },
  },
  plugins: [],
}
