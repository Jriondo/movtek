import { createContext, useContext, useEffect, useState } from 'react'
import { listEmpresas } from '../lib/db'
import { applyTheme } from '../lib/theme'
import { useAuth } from './AuthContext'

// Empresa activa + aplicación de su tema (color de marca).
const EmpresaContext = createContext(null)
export const useEmpresa = () => useContext(EmpresaContext)

const LS_KEY = 'movtek_empresa'

export function EmpresaProvider({ children }) {
  const { rolReal, empresaIdUsuario } = useAuth() || {}
  const [empresas, setEmpresas] = useState([])
  const [empresa, setEmpresa] = useState(null)

  // El operativo y el propietario quedan fijados a su empresa: no pueden cambiarla.
  // El administrador de Movtek sí puede moverse entre todas.
  const bloqueado = !!rolReal && rolReal !== 'admin' && !!empresaIdUsuario

  async function recargarEmpresas() {
    const list = await listEmpresas()
    setEmpresas(list)
    let saved = null
    try { saved = localStorage.getItem(LS_KEY) } catch {}
    setEmpresa((prev) => list.find((e) => e.id === (prev?.id || saved)) || prev || list[0] || null)
    return list
  }

  useEffect(() => {
    listEmpresas().then((list) => {
      setEmpresas(list)
      let saved = null
      try { saved = localStorage.getItem(LS_KEY) } catch {}
      setEmpresa(list.find((e) => e.id === saved) || list[0] || null)
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

  return (
    <EmpresaContext.Provider value={{ empresa, empresas, cambiarEmpresa, recargarEmpresas, bloqueado }}>
      {children}
    </EmpresaContext.Provider>
  )
}
