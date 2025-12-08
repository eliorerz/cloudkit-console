import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import '@patternfly/react-core/dist/styles/base.css'
import '@patternfly/patternfly/patternfly.css'
import '@patternfly/patternfly/patternfly-addons.css'
import './styles/dark-theme.css'
import { logger } from '@/utils/logger'

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __OSAC_UI_CONFIG__?: {
      strictMode: boolean
    }
  }
}

// Get REACT_STRICT_MODE from runtime config injected by server
// Default to false for production mode
const strictMode = window.__OSAC_UI_CONFIG__?.strictMode ?? false

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (strictMode) {
  logger.info('React StrictMode enabled - effects will run twice in development')
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} else {
  logger.info('React StrictMode disabled - production mode')
  root.render(<App />)
}
