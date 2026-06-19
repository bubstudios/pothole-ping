import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not recently dismissed
      const dismissedAt = localStorage.getItem('potholeping_pwa_dismissed');
      if (!dismissedAt || Date.now() - Number(dismissedAt) > 7 * 24 * 60 * 60 * 1000) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Hide if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDismissed(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setDismissed(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('potholeping_pwa_dismissed', String(Date.now()));
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[2000] sm:left-auto sm:right-4 sm:w-80 animate-in slide-in-from-bottom">
      <div className="bg-card border shadow-2xl rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-semibold text-sm">Install PotholePing</p>
              <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1 text-muted-foreground hover:text-foreground flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="w-full mt-3 bg-primary text-primary-foreground font-medium rounded-xl py-2.5 text-sm hover:bg-primary/90 transition-colors"
        >
          Install App
        </button>
      </div>
    </div>
  );
}