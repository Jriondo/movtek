// Extrae dos colores representativos de una imagen (el logo) para el tema de la empresa.
// Devuelve { primary, accent } en hexadecimal, o null si no se pudo.
export function extraerColoresDeImagen(src) {
  return new Promise((resolve) => {
    if (!src || typeof document === 'undefined') return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 48
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        const buckets = {}
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 128) continue
          const max = Math.max(r, g, b), min = Math.min(r, g, b)
          const sat = max === 0 ? 0 : (max - min) / max
          const lum = 0.299 * r + 0.587 * g + 0.114 * b
          if (lum > 238 || lum < 18) continue // descarta casi blanco / casi negro
          if (sat < 0.18) continue            // descarta grises
          const key = `${Math.round(r / 24)}_${Math.round(g / 24)}_${Math.round(b / 24)}`
          const bk = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0, sat: 0 })
          bk.n++; bk.r += r; bk.g += g; bk.b += b; bk.sat += sat
        }
        const arr = Object.values(buckets)
          .map((bk) => ({ r: bk.r / bk.n, g: bk.g / bk.n, b: bk.b / bk.n, score: bk.n * (bk.sat / bk.n) }))
          .sort((x, y) => y.score - x.score)
        if (!arr.length) return resolve(null)
        const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
        const hue = (c) => {
          const r = c.r / 255, g = c.g / 255, b = c.b / 255
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
          if (!d) return 0
          let h
          if (mx === r) h = ((g - b) / d) % 6
          else if (mx === g) h = (b - r) / d + 2
          else h = (r - g) / d + 4
          return (h * 60 + 360) % 360
        }
        const primary = arr[0]
        const hP = hue(primary)
        // Acento: el siguiente color con un tono bastante distinto; si no hay, el segundo más fuerte.
        const accent = arr.find((c) => { const dh = Math.abs(hue(c) - hP); return Math.min(dh, 360 - dh) > 40 }) || arr[1] || primary
        resolve({ primary: hex(primary), accent: hex(accent) })
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}
