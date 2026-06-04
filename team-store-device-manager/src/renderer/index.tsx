import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { Toaster } from 'react-hot-toast'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Cairo, sans-serif',
            direction: 'rtl',
            textAlign: 'right',
            fontSize: '14px',
          },
          success: {
            style: { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
          },
          error: {
            style: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
          },
        }}
      />
    </HashRouter>
  </React.StrictMode>
)
