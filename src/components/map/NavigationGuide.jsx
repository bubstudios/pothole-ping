import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, CornerUpLeft, CornerUpRight, ArrowUpLeft, ArrowUpRight, Flag } from 'lucide-react';

const FEET_PER_METER = 3.28084;
const SPEAK_AHEAD_FT = 500; // speak warning this far before turn

// Map OSRM maneuver to icon + label
function maneuverLabel(maneuver) {
  const mod = maneuver?.modifier || '';
  const type = maneuver?.type || '';
  if (type === 'arrive') return { icon: Flag, text: 'Arrive' };
  const map = {
    'uturn': { icon: ArrowUp, text: 'U-turn', flip: true },
    'sharp right': { icon: CornerUpRight, text: 'Sharp right' },
    'right': { icon: CornerUpRight, text: 'Right' },
    'slight right': { icon: ArrowUpRight, text: 'Slight right' },
    'straight': { icon: ArrowUp, text: 'Continue straight' },
    'slight left': { icon: ArrowUpLeft, text: 'Slight left' },
    'left': { icon: CornerUpLeft, text: 'Left' },
    'sharp left': { icon: CornerUpLeft, text: 'Sharp left' },
  };
  if (mod === 'uturn') return map['uturn'];
  return map[`${mod}`] || { icon: ArrowUp, text: 'Continue' };
}

function pointToSegmentProgress(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { dist: Math.hypot(px - x1, py - y1), t: 0 };
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return { dist: Math.hypot(px - projX, py - projY), t };
}

export default function NavigationGuide({ steps, userPosition, enabled = true, onHide }) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [remainingFt, setRemainingFt] = useState(0);
  const spokenRef = useRef(new Set());
  const lastStepRef = useRef(-1);

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch {}
  }, []);

  useEffect(() => {
    if (!enabled || !steps?.length || !userPosition) return;
    if (isNaN(userPosition.lat) || isNaN(userPosition.lng)) return;

    const { lat, lng } = userPosition;
    let bestStep = 0;
    let bestProgress = 0;
    let bestDist = Infinity;

    for (let i = steps.length - 1; i >= 0; i--) {
      const coords = steps[i].coordinates;
      if (!coords?.length) continue;

      let stepMinDist = Infinity;
      let stepMaxProgress = 0;

      for (let j = 0; j < coords.length - 1; j++) {
        const a = coords[j];
        const b = coords[j + 1];
        if (!a || !b) continue;
        const { dist, t } = pointToSegmentProgress(lat, lng, a[0], a[1], b[0], b[1]);
        const progress = j + t;
        if (dist < stepMinDist) {
          stepMinDist = dist;
          stepMaxProgress = progress;
        }
      }

      // Prefer step we're actually on (close to geometry)
      if (stepMinDist < bestDist || (stepMinDist < bestDist * 1.5 && i > bestStep)) {
        bestDist = stepMinDist;
        bestStep = i;
        bestProgress = stepMaxProgress;
      }
    }

    setCurrentStepIdx(bestStep);

    // Calculate remaining feet in current step
    const step = steps[bestStep];
    if (step) {
      const totalSegments = (step.coordinates?.length || 1) - 1;
      const fractionRemaining = totalSegments > 0 ? Math.max(0, 1 - bestProgress / totalSegments) : 0;
      setRemainingFt(Math.round(step.distance * FEET_PER_METER * fractionRemaining));
    }

    // Voice guidance
    if (bestStep !== lastStepRef.current || bestStep === 0) {
      lastStepRef.current = bestStep;
      const nextStep = steps[bestStep + 1];
      const current = steps[bestStep];
      const speakKey = `${bestStep}`;

      if (bestStep === steps.length - 1) {
        if (!spokenRef.current.has('arrive')) {
          spokenRef.current.add('arrive');
          speak('You have arrived at your destination.');
        }
      } else if (!spokenRef.current.has(speakKey)) {
        spokenRef.current.add(speakKey);
        const label = maneuverLabel(nextStep?.maneuver);
        const ftAhead = Math.round(current.distance * FEET_PER_METER);
        let phrase = `${label.text}`;
        if (ftAhead > 100) {
          phrase += ` in ${Math.round(ftAhead / 100) * 100} feet`;
        }
        if (nextStep?.name) phrase += ` onto ${nextStep.name}`;
        speak(phrase);
      }
    }

    // Speak ahead warning
    if (remainingFt > 0 && remainingFt < SPEAK_AHEAD_FT && bestStep < steps.length - 1) {
      const warnKey = `warn-${bestStep}`;
      if (!spokenRef.current.has(warnKey)) {
        spokenRef.current.add(warnKey);
        const nextStep = steps[bestStep + 1];
        const label = maneuverLabel(nextStep?.maneuver);
        let phrase = `${label.text} in ${Math.round(remainingFt / 10) * 10} feet`;
        if (nextStep?.name) phrase += ` onto ${nextStep.name}`;
        speak(phrase);
      }
    }
  }, [userPosition?.lat, userPosition?.lng, steps, enabled, speak]);

  // Reset spoken state when steps change
  useEffect(() => {
    spokenRef.current = new Set();
    lastStepRef.current = -1;
    setCurrentStepIdx(0);
  }, [steps]);

  if (!enabled || !steps?.length || currentStepIdx >= steps.length) return null;

  const nextStep = steps[currentStepIdx + 1];
  const currentStep = steps[currentStepIdx];
  const isArriving = currentStepIdx >= steps.length - 1;

  const maneuver = isArriving
    ? { icon: Flag, text: 'Arriving' }
    : maneuverLabel(nextStep?.maneuver);

  const Icon = maneuver.icon;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <div className="bg-card/95 backdrop-blur border shadow-xl rounded-2xl px-5 py-3 flex items-center gap-3 min-w-[220px]">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isArriving ? 'bg-green-500' : 'bg-primary'
        }`}>
          <Icon className="w-5 h-5 text-white" style={maneuver.flip ? { transform: 'rotate(180deg)' } : {}} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-heading font-semibold truncate leading-tight">
            {isArriving ? 'Arriving' : maneuver.text}
          </p>
          {!isArriving && remainingFt > 0 && (
            <p className="text-xs text-muted-foreground">
              in {remainingFt >= 528 ? `${(remainingFt / 5280).toFixed(1)} mi` : `${remainingFt} ft`}
              {nextStep?.name ? ` onto ${nextStep.name}` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}