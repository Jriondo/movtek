import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { EmpresaProvider } from './context/EmpresaContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <EmpresaProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </EmpresaProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
