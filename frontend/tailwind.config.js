// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fce4ec',
          100: '#f8bbd0',
          200: '#f48fb1',
          400: '#ec407a',
          500: '#e91e63',   // Fonqa pink-red (Ethiopian rose)
          600: '#c2185b',   // primary CTA
          700: '#ad1457',
          800: '#880e4f',
          900: '#560027',
        },
        gold: {
          400: '#ffd54f',
          500: '#ffca28',
          600: '#ffb300',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '20px' },
    },
  },
  plugins: [],
};
