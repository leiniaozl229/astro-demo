/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        agent: {
          light: '#A855F7',
          DEFAULT: '#7C3AED',
          dark: '#5B21B6',
        },
        user: {
          light: '#60A5FA',
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
        },
      },
    },
  },
  plugins: [typography],
};
