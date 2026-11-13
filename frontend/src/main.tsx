import "@fontsource-variable/inter"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { StoreProvider } from './context/StoreProvider'
import { applyTheme, readCachedStore } from './utils/theme'

// paint the last known colors before React renders, so there is no color flash
applyTheme(readCachedStore())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
