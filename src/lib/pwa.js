// Utilidades para que la app de conductores sea "instalable" (PWA) con la marca de cada empresa.

// Inserta un manifest dinámico (nombre, color e ícono de la empresa) y registra el service worker.
export function activarPwaEmpresa(empresa, slug) {
  if (typeof document === 'undefined') return
  const icono = empresa?.logo_url || ''
  const manifest = {
    name: `${empresa?.nombre || 'Movtek'} · Preoperacional`,
    short_name: empresa?.nombre || 'Preop',
    start_url: `/e/${slug}/app`,
    scope: `/e/${slug}/`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: empresa?.color_primario || '#16a34a',
    icons: icono ? [
      { src: icono, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icono, sizes: '512x512', type: 'image/png', purpose: 'any' },
    ] : [],
  }
  try {
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
    const url = URL.createObjectURL(blob)
    let link = document.querySelector('link[rel="manifest"]')
    if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link) }
    link.href = url
    // Color de la barra del navegador en el móvil.
    let theme = document.querySelector('meta[name="theme-color"]')
    if (!theme) { theme = document.createElement('meta'); theme.name = 'theme-color'; document.head.appendChild(theme) }
    theme.content = empresa?.color_primario || '#16a34a'
    // Ícono para "Agregar a pantalla de inicio" en iOS.
    if (icono) {
      let apple = document.querySelector('link[rel="apple-touch-icon"]')
      if (!apple) { apple = document.createElement('link'); apple.rel = 'apple-touch-icon'; document.head.appendChild(apple) }
      apple.href = icono
    }
  } catch {}

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
}

// Hook sencillo para el botón "Instalar app": captura el evento del navegador.
import { useEffect, useState } from 'react'
export function useInstalar() {
  const [prompt, setPrompt] = useState(null)
  const [instalada, setInstalada] = useState(false)
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e) }
    const onInstalled = () => { setInstalada(true); setPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    // Si ya se abre como app instalada, no mostrar el botón.
    if (window.matchMedia?.('(display-mode: standalone)')?.matches) setInstalada(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  const instalar = async () => { if (!prompt) return; prompt.prompt(); try { await prompt.userChoice } catch {} setPrompt(null) }
  return { puedeInstalar: !!prompt && !instalada, instalar, instalada }
}
