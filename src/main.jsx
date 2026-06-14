import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'

// Inline fallback if the main app fails to load
function FallbackApp() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ color: '#e74c3c' }}>Loading Error</h1>
      <p>The app failed to initialize. Please refresh or check the console for errors.</p>
    </div>
  );
}

async function bootstrap() {
  try {
    const { default: App } = await import('@/App.jsx?v=6');
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  } catch (e) {
    console.error('App bootstrap failed:', e);
    document.getElementById('root').innerHTML = `
      <div style="padding:40px;font-family:monospace;color:#c00;background:#fee;min-height:100vh">
        <h2>Bootstrap Error</h2>
        <pre style="white-space:pre-wrap;word-break:break-word;font-size:14px">${e.message || String(e)}\n\n${e.stack || ''}</pre>
      </div>`;
  }
}

bootstrap();