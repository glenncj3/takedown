/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Bangers', 'cursive'],
      },
      keyframes: {
        // Bouncy ease for card landing on the board, mirroring the
        // reference repo's CharacterCard landing curve.
        cardPlace: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // Brief pulse for score increments.
        scorePulse: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'card-place': 'cardPlace 280ms cubic-bezier(0.34, 1.56, 0.64, 0.95) both',
        'score-pulse': 'scorePulse 280ms ease-out',
      },
    },
  },
  plugins: [],
};
