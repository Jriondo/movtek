import { createContext, useContext, useEffect, useState } from 'react'
import { listEmpresas, empresaMaestra, setActorHistorial } from '../lib/db'
import { applyTheme } from '../lib/theme'
import { useAuth } from './AuthContext'

// Empresa activa + aplicación de su tema (color de marca).
const EmpresaContext = createContext(null)
export const useEmpresa = () => useContext(EmpresaContext)

const LS_KEY = 'movtek_empresa'
const SNAP_KEY = 'movtek_empresa_snap'

// Guarda/lee una "foto" ligera de la empresa activa para pintar su marca
// (logo, nombre y color) desde la PRIMERA renderización, sin esperar la red.
// Así no aparece Movtek un instante antes de la empresa al actualizar.
function leerSnapshot() {
  try { const s = localStorage.getItem(SNAP_KEY); return s ? JSON.parse(s) : null } catch { return null }
}
function guardarSnapshot(e) {
  if (!e) return
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify({
      id: e.id, nombre: e.nombre, slug: e.slug, logo_url: e.logo_url,
      color_primario: e.color_primario, color_acento: e.color_acento,
    }))
  } catch {}
}

export function EmpresaProvider({ children }) {
  const { rolReal, empresaIdUsuario, user } = useAuth() || {}
  const [empresas, setEmpresas] = useState([])
  // Arrancamos con la foto guardada → la marca correcta se ve de inmediato.
  const [empresa, setEmpresa] = useState(() => {
    const snap = leerSnapshot()
    if (snap) applyTheme({ primary: snap.color_primario, accent: snap.color_acento })
    return snap
  })

  // Deja registrado quién hace los cambios (para el historial).
  useEffect(() => { setActorHistorial({ usuario: user?.email || '', empresaId: empresa?.id || null }) }, [user?.email, empresa?.id])

  // El operativo y el propietario quedan fijados a su empresa: no pueden cambiarla.
  // El administrador de Movtek sí puede moverse entre todas.
  const bloqueado = !!rolReal && rolReal !== 'admin' && !!empresaIdUsuario

  // Elige la empresa activa inicial: la guardada (si existe) o Movtek (maestra) para el admin.
  function elegirInicial(list) {
    let saved = null
    try { saved = localStorage.getItem(LS_KEY) } catch {}
    return list.find((e) => e.id === saved) || empresaMaestra(list)
  }

  async function recargarEmpresas() {
    const list = await listEmpresas()
    setEmpresas(list)
    setEmpresa((prev) => list.find((e) => e.id === prev?.id) || elegirInicial(list))
    return list
  }

  useEffect(() => {
    listEmpresas().then((list) => {
      setEmpresas(list)
      setEmpresa(elegirInicial(list))
    })
  }, [])

  // Si el usuario está fijado a una empresa, forzamos esa empresa activa.
  useEffect(() => {
    if (!bloqueado || !empresas.length) return
    const mia = empresas.find((e) => e.id === empresaIdUsuario)
    if (mia && mia.id !== empresa?.id) setEmpresa(mia)
  }, [bloqueado, empresaIdUsuario, empresas, empresa?.id])

  // Cada vez que cambia la empresa, repintamos la plataforma con su color.
  useEffect(() => {
    if (!empresa) return
    applyTheme({ primary: empresa.color_primario, accent: empresa.color_acento })
    try { localStorage.setItem(LS_KEY, empresa.id) } catch {}
    guardarSnapshot(empresa)
  }, [empresa])

  function cambiarEmpresa(id) {
    if (bloqueado) return // el usuario fijado no puede cambiar de empresa
    const e = empresas.find((x) => x.id === id)
    if (e) setEmpresa(e)
  }

  // Entrar a una empresa por su link (/e/slug): fija cuál empresa se verá al iniciar sesión.
  function entrarAEmpresa(emp) {
    if (!emp?.id) return
    try { localStorage.setItem(LS_KEY, emp.id) } catch {}
    // Si ya está cargada en la lista, la activamos de una.
    setEmpresa((prev) => (emp.id === prev?.id ? prev : (empresas.find((e) => e.id === emp.id) || emp)))
  }

  // Volver a la plataforma principal (Movtek).
  function irAMovtek() {
    const m = empresaMaestra(empresas)
    try { localStorage.setItem(LS_KEY, m.id) } catch {}
    setEmpresa(m)
  }

  return (
    <EmpresaContext.Provider value={{ empresa, empresas, cambiarEmpresa, recargarEmpresas, entrarAEmpresa, irAMovtek, bloqueado }}>
      {children}
    </EmpresaContext.Provider>
  )
}
