import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

const WAKE_PHRASES = ['pothole ping'];

export default function VoiceReport({ onVoiceReport, isListening, onToggleListening }) {
  const [status, setStatus] = useState('idle'); // idle | listening | gps | triggered

  const getPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('No GPS'));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });

  const handleToggle = async () => {
    if (isListening) {
      onToggleListening(false);
      setStatus('idle');
      return;
    }

    // Request mic permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus('idle');
      return;
    }

    setStatus('listening');
    onToggleListening(true);
  };

  const handleWakeWord = useCallback(async () => {
    if (status === 'gps' || status === 'triggered') return;
    setStatus('gps');
    try {
      const pos = await getPosition();
      setStatus('triggered');
      onVoiceReport(pos.coords.latitude, pos.coords.longitude);
      // Reset after a moment
      setTimeout(() => {
        setStatus('listening');
        onToggleListening(true);
      }, 2000);
    } catch {
      setStatus('listening');
    }
  }, [status, onVoiceReport, onToggleListening]);

  return (
    <div className="fixed bottom-24 sm:bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">
      {status === 'listening' && (
        <div className="bg-card border rounded-lg px-3 py-1.5 shadow-lg text-xs text-muted-foreground animate-pulse">
          Say "Pothole Ping" to drop a pin
        </div>
      )}
      {status === 'gps' && (
        <div className="bg-card border rounded-lg px-3 py-1.5 shadow-lg text-xs flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Getting GPS...
        </div>
      )}
      {status === 'triggered' && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 shadow-lg text-xs text-green-700 font-medium">
          Pin dropped! Fill in the details.
        </div>
      )}
      <button
        onClick={handleToggle}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
          isListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-primary text-primary-foreground hover:scale-105'
        }`}
      >
        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
      {/* Hidden SpeechRecognition runner */}
      {isListening && <SpeechListener onWakeWord={handleWakeWord} />}
    </div>
  );
}

function SpeechListener({ onWakeWord }) {
  const recognitionRef = useRef(null);

  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        for (const phrase of WAKE_PHRASES) {
          if (transcript.includes(phrase)) {
            onWakeWord();
            return;
          }
        }
      }
    };

    recognition.onerror = () => {
      // Restart on error
      setTimeout(() => {
        try { recognition.start(); } catch {}
      }, 500);
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      try { recognition.start(); } catch {}
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onWakeWord]);

  return null;
}