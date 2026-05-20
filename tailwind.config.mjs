/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBF8F3',
        'paper-2': '#F4EFE6',
        ink: '#1C1A17',
        'ink-soft': '#4A453D',
        'ink-faint': '#8A8479',
        line: '#E8E1D2',
        accent: '#B4543E',
        'accent-soft': '#D89B7E',
      },
      fontFamily: {
        serif: ['Fraunces', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.035em',
        tighter: '-0.02em',
        tight: '-0.01em',
        looser: '0.15em',
        loosest: '0.3em',
      },
    },
  },
  plugins: [],
};
