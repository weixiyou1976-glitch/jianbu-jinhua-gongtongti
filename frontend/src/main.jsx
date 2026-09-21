import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

const AUTH_EPOCH_KEY = 'jianbu_auth_epoch'
const AUTH_EPOCH = 'hk-v2-20260921'
const LEGACY_AUTH_KEYS = ['token', 'user', 'adminPassword', 'trialToken']

try {
  if (localStorage.getItem(AUTH_EPOCH_KEY) !== AUTH_EPOCH) {
    LEGACY_AUTH_KEYS.forEach((key) => localStorage.removeItem(key))
    localStorage.setItem(AUTH_EPOCH_KEY, AUTH_EPOCH)
  }
} catch {
  // localStorage may be unavailable in private or restricted browser contexts.
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
