/** @type {import('tailwindcss').Config} */
export default {
  // Scope to extension UI only — avoids polluting Gmail styles
  content: [
    './src/**/*.{ts,tsx}',
    './popup.html',
    './dashboard.html',
    './options.html',
  ],
  // Prefix all Tailwind classes to avoid conflicts with Gmail's own CSS
  prefix: 'pr-',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        surface: {
          0:   '#ffffff',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
        },
        ink: {
          900: '#0f172a',
          700: '#334155',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
        },
        amber: {
          50:  '#fffbeb',
          200: '#fde68a',
        },
        red: {
          50: '#fef2f2',
        },
        green: {
          50:  '#f0fdf4',
          200: '#bbf7d0',
        },
        success: '#16a34a',
        warning: '#d97706',
        danger:  '#dc2626',
      },
      fontFamily: {
        sans: [
          'Google Sans',
          'Roboto',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        panel: '0 4px 24px 0 rgb(0 0 0 / 0.10)',
      },
    },
  },
  plugins: [],
};
