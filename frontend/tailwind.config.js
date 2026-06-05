/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        school: {
          navy: '#16213e',
          blue: '#0f3460',
          accent: '#e94560',
          mint: '#10b981',
        },
      },
      boxShadow: {
        card: '0 4px 14px rgba(15, 52, 96, 0.12)',
        'card-hover': '0 8px 24px rgba(15, 52, 96, 0.18)',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
