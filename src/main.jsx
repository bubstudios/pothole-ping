import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'
import App from '@/App.jsx'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);