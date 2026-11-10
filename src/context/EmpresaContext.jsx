import { createContext, useContext, useEffect, useState } from 'react'
import { listEmpresas, empresaMaestra, setActorHistorial } from '../lib/db'
import { applyTheme } from '../lib/theme'
import { useAuth } from './AuthContext'

// Empresa activa + aplicación de su tema (color de marca).
const EmpresaContext = createContext(null)
export const useEmpresa = () => useContext(EmpresaContext)

const LS_KEY = 'movtek_empresa'

export function EmpresaProvider({ children }) {
  const { rolReal, empresaIdUsuario, user } = useAuth() || {}
  const [empresas, setEmpresas] = useState([])
  const [empresa, setEmpresa] = useState(null)

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
