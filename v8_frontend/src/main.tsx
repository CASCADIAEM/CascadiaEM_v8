import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AdminEngineProvider } from './services/AdminEngineService.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminEngineProvider>
      <App />
    </AdminEngineProvider>
  </StrictMode>,
)
