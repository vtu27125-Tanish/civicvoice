/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  corePlugins: {
    preflight: false // your existing styles.css already sets base styles — this avoids Tailwind's reset conflicting with them
  },
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Mapped from styles.css :root variables — the CivicVoice Lead Edition palette
        border: 'var(--outline-variant)',
        input: 'var(--outline-variant)',
        ring: 'var(--primary-container)',
        background: 'var(--background)',
        foreground: 'var(--on-surface)',
        primary: {
          DEFAULT: 'var(--primary-container)',
          foreground: '#ffffff'
        },
        secondary: {
          DEFAULT: 'var(--secondary-container)',
          foreground: 'var(--on-secondary-container)'
        },
        muted: {
          DEFAULT: 'var(--surface-container-high)',
          foreground: 'var(--on-surface-variant)'
        },
        destructive: {
          DEFAULT: 'var(--error)',
          foreground: '#ffffff'
        },
        card: {
          DEFAULT: 'var(--surface-container-lowest)',
          foreground: 'var(--on-surface)'
        },
        popover: {
          DEFAULT: 'var(--surface-container-lowest)',
          foreground: 'var(--on-surface)'
        },
        accent: {
          DEFAULT: 'var(--surface-container-high)',
          foreground: 'var(--primary)'
        }
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};