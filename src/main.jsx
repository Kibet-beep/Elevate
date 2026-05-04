import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SplashScreen } from '@capacitor/splash-screen'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Keep splash until first paint, then hide quickly to avoid white flash.
requestAnimationFrame(() => {
  setTimeout(() => {
    SplashScreen.hide().catch(() => {})
  }, 120)
})
