/* ============================================================
   KUDII — Application entry
   ============================================================ */
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ToastProvider, ConfirmProvider } from './lib/hooks'
import { ComposerProvider } from './components/composer-context'
import { KudiiBotProvider } from './components/kudiibot/KudiiBotProvider'

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/app.css'
import './styles/kudiibot.css'
import './styles/marketing.css'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <ComposerProvider>
          <KudiiBotProvider>
            <App />
          </KudiiBotProvider>
        </ComposerProvider>
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>,
)
