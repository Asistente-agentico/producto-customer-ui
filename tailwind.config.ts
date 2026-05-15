import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Q8 · solo light mode. Eliminado `darkMode: 'class'`.
  theme: {
    extend: {
      colors: {
        // Tokens semánticos v2 (Q9 + Handoff Final §4). Las CSS vars
        // las setea applyCapabilities en runtime; estos son los
        // fallbacks build-time apuntados a las mismas vars.
        navy: 'var(--color-navy, #0a2540)',
        coral: 'var(--color-coral, #e85c3c)',
        paper: 'var(--color-paper, #fafaf7)',
        cream: 'var(--color-cream, #f2eedf)',
        rule: 'var(--color-rule, #edeae0)',
        ink: 'var(--color-ink, #0a0a0a)',
        ink2: 'var(--color-ink2, #5c5c5c)',
        ink3: 'var(--color-ink3, #9a958b)',
        ok: 'var(--color-ok, #2d7d6f)',
        warn: 'var(--color-warn, #b8860b)',
        'cream-band': 'var(--color-cream-band, #fffcf5)',
        // Aliases v1 mantenidos para retro-compat con componentes que
        // aún usen `bg-primary`, `text-accent`, etc.
        primary: 'var(--color-primary, #fafaf7)',
        sidebar: 'var(--color-sidebar, #0a2540)',
        accent: 'var(--color-accent, #e85c3c)',
      },
      fontFamily: {
        // Variable fonts bundleadas en public/fonts/.
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Bumps mínimos para touch + WCAG legibility.
        xs: ['0.8125rem', { lineHeight: '1.125rem' }],
      },
    },
  },
  plugins: [],
};

export default config;
