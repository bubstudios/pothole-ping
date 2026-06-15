import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';

const WAKE_PHRASES = ['pothole ping'];
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VoiceReport({ onVoiceReport, isListening, onToggleListening }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const statusRef = useRef(status);
  const onVoiceReportRef = useRef(onVoiceReport);
  const onToggleListeningRef = useRef(onToggleListening);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { onVoiceReportRef.current = onVoiceReport; }, [onVoiceReport]);
  useEffect(() => { onToggleListeningRef.current = onToggleListening; }, [onToggleListening]);

  // On mount, go straight to listening if isListening is true
  useEffect(() => {
    if (isListening && !SpeechRecognitionAPI) {
      setStatus('error');
      setError('Voice not supported. Try Chrome or Edge.');
    } else if (isListening && status === 'idle') {
      setStatus('listening');
    }
  }, [isListening, status]);

  const getPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('No GPS'));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });

  const handleToggle = () => {
    if (isListening) {
      onToggleListening(false);
      setStatus('idle');
      setError('');
    } else {
      onToggleListening(true);
      setStatus('listening');
      setError('');
    }
  };

  const handleWakeWord = useCallback(async () => {
    if (statusRef.current === 'gps' || statusRef.current === 'triggered') return;
    setStatus('gps');
    try {
      const pos = await getPosition();
      setStatus('triggered');
      onVoiceReportRef.current(pos.coords.latitude, pos.coords.longitude);
      setTimeout(() => setStatus('listening'), 2000);
    } catch {
      setError('GPS unavailable. Try again.');
      setStatus('listening');
      setTimeout(() => setError(''), 3000);
    }
  }, []);

  return (
    <div className="fixed bottom-24 sm:bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">
      {status === 'listening' && !error && (
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
          Pin dropped! Tap it to add details.
        </div>
      )}
      {status === 'error' && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 shadow-lg text-xs text-red-700 flex items-center gap-1.5 max-w-[220px]">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}
      <button
        onClick={handleToggle}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
          isListening
            ? 'bg-red-500 text-white animate-pulse'
            : status === 'error'
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-primary text-primary-foreground hover:scale-105'
        }`}
      >
        {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>
      {isListening && <SpeechListener onWakeWord={handleWakeWord} />}
    </div>
  );
}

function SpeechListener({ onWakeWord }) {
  const onWakeWordRef = useRef(onWakeWord);
  const recogRef = useRef(null);
  useEffect(() => { onWakeWordRef.current = onWakeWord; });

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recogRef.current = recognition;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        for (const phrase of WAKE_PHRASES) {
          if (transcript.includes(phrase)) {
            onWakeWordRef.current();
            return;
          }
        }
      }
    };

    recognition.onerror = () => {
      // Browser may block auto-start without user gesture; retry on next interaction
      setTimeout(() => {
        try { recognition.start(); } catch {}
      }, 1000);
    };

    recognition.onend = () => {
      try { recognition.start(); } catch {}
    };

    try {
      recognition.start();
    } catch {
      // Silently fail — browser requires user gesture, retry on toggle
    }

    return () => {
      try { recognition.stop(); } catch {}
    };
  }, []);

  return null;
}