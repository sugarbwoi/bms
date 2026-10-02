/* ============================================================
   KUDII — Application entry
   ============================================================ */
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ToastProvider, ConfirmProvider } from './lib/hooks'
import { ComposerProvider } from './components/composer-context'

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/app.css'
import './styles/marketing.css'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <ComposerProvider>
          <App />
        </ComposerProvider>
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>,
)
