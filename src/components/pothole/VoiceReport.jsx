import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';

const WAKE_PHRASES = ['pothole ping'];
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VoiceReport({ onVoiceReport, isListening, onToggleListening }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [needsGesture, setNeedsGesture] = useState(false);
  const statusRef = useRef(status);
  const onVoiceReportRef = useRef(onVoiceReport);
  const onToggleListeningRef = useRef(onToggleListening);
  const isListeningRef = useRef(isListening);
  const gestureGrantedRef = useRef(false);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { onVoiceReportRef.current = onVoiceReport; }, [onVoiceReport]);
  useEffect(() => { onToggleListeningRef.current = onToggleListening; }, [onToggleListening]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  // On mount: check if mic permission is already granted (from a previous session).
  // If yes → auto-start listening. If no → wait for a tap.
  useEffect(() => {
    if (!isListening || status !== 'idle') return;

    if (!SpeechRecognitionAPI) {
      setStatus('error');
      setError('Voice not supported. Try Chrome or Edge.');
      return;
    }

    let cancelled = false;
    (async () => {
      let permissionGranted = false;
      try {
        const perm = await navigator.permissions.query({ name: 'microphone' });
        permissionGranted = perm.state === 'granted';
      } catch {
        // permissions.query not supported — try to auto-start and see if it works
        permissionGranted = true; // optimistic
      }
      if (cancelled) return;
      if (permissionGranted) {
        setNeedsGesture(false);
        setStatus('listening');
        gestureGrantedRef.current = true;
      } else {
        setNeedsGesture(true);
        setStatus('waiting');
      }
    })();

    return () => { cancelled = true; };
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
    if (needsGesture) {
      setNeedsGesture(false);
      setStatus('listening');
      setError('');
      gestureGrantedRef.current = true;
      return;
    }
    if (isListening) {
      onToggleListening(false);
      setStatus('idle');
      setError('');
      setNeedsGesture(false);
      gestureGrantedRef.current = false;
    } else {
      onToggleListening(true);
      setNeedsGesture(false);
      setStatus('listening');
      setError('');
      gestureGrantedRef.current = true;
    }
  };

  const handleWakeWord = useCallback(async () => {
    if (statusRef.current === 'gps' || statusRef.current === 'triggered') return;
    if (!isListeningRef.current) return;
    setStatus('gps');
    try {
      const pos = await getPosition();
      if (!isListeningRef.current) return; // mic turned off during GPS
      setStatus('triggered');
      onVoiceReportRef.current(pos.coords.latitude, pos.coords.longitude);
      setTimeout(() => { if (isListeningRef.current) setStatus('listening'); }, 2000);
    } catch {
      if (!isListeningRef.current) return;
      setError('GPS unavailable. Try again.');
      setStatus('listening');
      setTimeout(() => setError(''), 3000);
    }
  }, []);

  return (
    <div className="fixed bottom-24 sm:bottom-6 right-4 z-[1000] flex flex-col items-end gap-2">
      {status === 'waiting' && !error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 shadow-lg text-xs text-amber-700 font-medium">
          Tap the mic to enable voice
        </div>
      )}
      {status === 'listening' && isListening && !error && (
        <div className="bg-card border rounded-lg px-3 py-1.5 shadow-lg text-xs text-muted-foreground animate-pulse">
          Say "Pothole Ping" to drop a pin
        </div>
      )}
      {status === 'gps' && isListening && (
        <div className="bg-card border rounded-lg px-3 py-1.5 shadow-lg text-xs flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Getting GPS...
        </div>
      )}
      {status === 'triggered' && isListening && (
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
          isListening && !needsGesture
            ? 'bg-red-500 text-white animate-pulse'
            : isListening && needsGesture
            ? 'bg-amber-500 text-white'
            : status === 'error'
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-primary text-primary-foreground hover:scale-105'
        }`}
      >
        {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>
      {isListening && !needsGesture && <SpeechListener onWakeWord={handleWakeWord} />}
    </div>
  );
}

function SpeechListener({ onWakeWord }) {
  const onWakeWordRef = useRef(onWakeWord);
  useEffect(() => { onWakeWordRef.current = onWakeWord; });

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let stopped = false;

    recognition.onresult = (event) => {
      if (stopped) return;
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
      if (stopped) return;
      setTimeout(() => {
        if (!stopped) { try { recognition.start(); } catch {} }
      }, 1000);
    };

    recognition.onend = () => {
      if (!stopped) { try { recognition.start(); } catch {} }
    };

    recognition.start();

    return () => {
      stopped = true;
      try { recognition.stop(); } catch {}
    };
  }, []);

  return null;
}