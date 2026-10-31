/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: '#090d16',
          panel: '#0f1626',
          card: '#161f33',
          border: '#1e293b',
          cyan: '#00f3ff',
          purple: '#a855f7',
          magenta: '#f43f5e',
          emerald: '#10b981'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
};
