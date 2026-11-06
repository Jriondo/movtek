/** Identidad visual de Movtek: fresca, profesional y llamativa. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Colores de marca dinámicos: se definen por empresa vía variables CSS
        // (ver src/lib/theme.js). El valor por defecto es Esmeralda + Lima (index.css).
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)', 100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)', 300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)', 500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)', 700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)', 900: 'rgb(var(--brand-900) / <alpha-value>)',
        },
        mint: {
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
        },
        coral: { 400: '#ff8a6b', 500: '#ff6a47' },
        ink: { DEFAULT: '#1a1830', soft: '#5b5872', faint: '#8d8aa3' },
        cloud: { DEFAULT: '#f6f6fc', line: '#e8e6f4' },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,24,48,.05), 0 10px 30px rgba(26,24,48,.07)',
        glow: '0 10px 40px rgb(var(--brand-500) / 0.35)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
}
