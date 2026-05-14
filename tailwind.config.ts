import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Capa 3 (capabilities) inyecta valores en --color-*; estos son
        // los defaults de Capa 1 (fallback universal del producto).
        primary: 'var(--color-primary, #eaeaea)',
        sidebar: 'var(--color-sidebar, #002c48)',
        accent: 'var(--color-accent, #c96442)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // Bumps mínimos para touch + WCAG legibility
        xs: ['0.8125rem', { lineHeight: '1.125rem' }],
      },
    },
  },
  plugins: [],
};

export default config;
