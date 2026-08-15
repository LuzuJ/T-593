/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Paleta Institucional Principal
        brand: {
          navy: '#0b1329',
          dark: '#0f172a',
          primary: '#1d4ed8',
          accent: '#0284c7',
          light: '#f8fafc',
        },
        // Paleta Semáforo de Viabilidad Legal COOTAD
        viabilidad: {
          exclusiva: '#059669', // Verde Esmeralda: Viable (100%)
          exclusivaBg: '#ecfdf5',
          exclusivaBorder: '#a7f3d0',
          parcial: '#d97706',   // Ámbar: Parcialmente viable
          parcialBg: '#fffbeb',
          parcialBorder: '#fde68a',
          fuera: '#e11d48',     // Rosa/Rojo: Fuera de competencia
          fueraBg: '#fff1f2',
          fueraBorder: '#fecdd3',
        },
        // Paleta de Dignidades Electorales
        dignidad: {
          alcalde: '#6366f1',   // Índigo
          alcaldeBg: '#eef2ff',
          prefecto: '#10b981',  // Esmeralda
          prefectoBg: '#ecfdf5',
          concejal: '#0284c7',  // Celeste / Sky
          concejalBg: '#f0f9ff',
          vocal: '#f59e0b',     // Ámbar / Naranja
          vocalBg: '#fffbeb',
        },
      },
    },
  },
  plugins: [],
}
