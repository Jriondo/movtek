import { createContext, useContext, useEffect, useState } from 'react'
import { listEmpresas } from '../lib/db'
import { applyTheme } from '../lib/theme'

// Empresa activa + aplicación de su tema (color de marca).
const EmpresaContext = createContext(null)
export const useEmpresa = () => useContext(EmpresaContext)

const LS_KEY = 'movtek_empresa'

export function EmpresaProvider({ children }) {
  const [empresas, setEmpresas] = useState([])
  const [empresa, setEmpresa] = useState(null)

  useEffect(() => {
    listEmpresas().then((list) => {
      setEmpresas(list)
      let saved = null
      try { saved = localStorage.getItem(LS_KEY) } catch {}
      setEmpresa(list.find((e) => e.id === saved) || list[0] || null)
    })
  }, [])

  // Cada vez que cambia la empresa, repintamos la plataforma con su color.
  useEffect(() => {
    if (!empresa) return
    applyTheme({ primary: empresa.color_primario, accent: empresa.color_acento })
    try { localStorage.setItem(LS_KEY, empresa.id) } catch {}
  }, [empresa])

  function cambiarEmpresa(id) {
    const e = empresas.find((x) => x.id === id)
    if (e) setEmpresa(e)
  }

  return (
    <EmpresaContext.Provider value={{ empresa, empresas, cambiarEmpresa }}>
      {children}
    </EmpresaContext.Provider>
  )
}
