// Utilidades para que la app de conductores sea "instalable" (PWA) con la marca de cada empresa.

// Apunta el manifest real (servido por el servidor) y registra el service worker.
export function activarPwaEmpresa(empresa, slug) {
  if (typeof document === 'undefined') return
  try {
    // Manifest real por empresa (mucho más confiable para "Instalar aplicación").
    let link = document.querySelector('link[rel="manifest"]')
    if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link) }
    link.href = `/api/manifest?slug=${encodeURIComponent(slug || '')}`
    // Color de la barra del navegador en el móvil.
    let theme = document.querySelector('meta[name="theme-color"]')
    if (!theme) { theme = document.createElement('meta'); theme.name = 'theme-color'; document.head.appendChild(theme) }
    theme.content = empresa?.color_primario || '#16a34a'
    // Ícono para "Agregar a inicio" en iOS (usa el logo de la empresa servido como imagen).
    let apple = document.querySelector('link[rel="apple-touch-icon"]')
    if (!apple) { apple = document.createElement('link'); apple.rel = 'apple-touch-icon'; document.head.appendChild(apple) }
    apple.href = slug ? `/api/logo?slug=${encodeURIComponent(slug)}` : '/icon-192.png'
  } catch {}

  if ('serviceWorker' in navigator) {
    // Registro estándar (scope raíz): no depende de headers especiales y es el más confiable
    // para que el navegador permita instalar la app.
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Busca actualizaciones al abrir.
      try { reg.update() } catch {}
    }).catch(() => {})

    // Cuando entra en control una versión nueva del service worker, recarga UNA vez
    // para que el usuario quede en la última versión sin tener que reinstalar.
    let recargado = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recargado) return
      recargado = true
      window.location.reload()
    })
  }
}

// ¿La app ya está abierta como app instalada (pantalla completa o dentro del APK)?
export const esStandalone = () => typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true ||
    /MovtekApp/.test(navigator.userAgent || ''))

// ¿Es un iPhone/iPad? (allí se instala con "Agregar a inicio", no con botón).
export const esIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent || '')

// Hook sencillo para el botón "Instalar app": captura el evento del navegador.
import { useEffect, useState } from 'react'
export function useInstalar() {
  // Arranca con el evento que ya pudo capturar el script temprano de index.html.
  const [prompt, setPrompt] = useState(() => (typeof window !== 'undefined' ? window.__installPrompt || null : null))
  const [instalada, setInstalada] = useState(false)
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); window.__installPrompt = e; setPrompt(e) }
    const onDispo = () => setPrompt(window.__installPrompt || null)
    const onInstalled = () => { setInstalada(true); setPrompt(null); window.__installPrompt = null }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('mv-installable', onDispo)   // avisa el script temprano
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('mv-installed', onInstalled)
    if (window.matchMedia?.('(display-mode: standalone)')?.matches) setInstalada(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('mv-installable', onDispo)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('mv-installed', onInstalled)
    }
  }, [])
  const instalar = async () => {
    const p = prompt || window.__installPrompt
    if (!p) return false
    p.prompt()
    try { await p.userChoice } catch {}
    setPrompt(null); window.__installPrompt = null
    return true
  }
  return { puedeInstalar: !!prompt && !instalada, instalar, instalada }
}
