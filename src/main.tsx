import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import { AuthProvider } from './features/auth/AuthContext'
import App from './app/App'

// Static hosting (GitHub Pages) can't rewrite deep links, so the demo uses hash routes.
const Router = import.meta.env.VITE_DEMO === 'true' ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>,
)
