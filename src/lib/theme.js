// Tema dinámico de Movtek (multiempresa / white-label).
// A partir del color de una empresa generamos toda la escala de tonos
// y la aplicamos como variables CSS, para que la app se repinte sola.

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const int = parseInt(full, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

const WHITE = [255, 255, 255]
const BLACK = [0, 0, 0]
const mix = (rgb, target, amt) => rgb.map((c, i) => Math.round(c + (target[i] - c) * amt))
const toVar = (rgb) => rgb.join(' ')

// Escala 50→900 a partir del color base (que ocupa el lugar 500).
function escala(hex) {
  const b = hexToRgb(hex)
  return {
    50: mix(b, WHITE, 0.9), 100: mix(b, WHITE, 0.8), 200: mix(b, WHITE, 0.62),
    300: mix(b, WHITE, 0.42), 400: mix(b, WHITE, 0.2), 500: b,
    600: mix(b, BLACK, 0.14), 700: mix(b, BLACK, 0.28), 800: mix(b, BLACK, 0.42), 900: mix(b, BLACK, 0.55),
  }
}

// Aplica el tema de una empresa: color principal + acento.
export function applyTheme({ primary, accent } = {}) {
  if (!primary) return
  const root = document.documentElement.style
  const b = escala(primary)
  Object.entries(b).forEach(([k, v]) => root.setProperty(`--brand-${k}`, toVar(v)))
  const a = escala(accent || primary)
  root.setProperty('--accent-400', toVar(a[400]))
  root.setProperty('--accent-500', toVar(a[500]))
  root.setProperty('--accent-600', toVar(a[600]))
}
