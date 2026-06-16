import React, { useState } from 'react';
import { MapPin, AlertTriangle, Mic, Map, Trophy, ArrowRight, ArrowLeft, X } from 'lucide-react';

const SLIDES = [
  {
    icon: MapPin,
    color: 'text-primary',
    bg: 'bg-primary/10',
    title: 'Report Potholes',
    text: 'Tap "Report Pothole" and drop a pin on the map. We\'ll figure out which agency is responsible and give you their contact info.',
  },
  {
    icon: Mic,
    color: 'text-purple-500',
    bg: 'bg-purple-100',
    title: 'Drive & Drop',
    text: 'While driving, just say "Pothole Ping" out loud. We\'ll mark the spot so you can report it later — no need to touch your phone.',
  },
  {
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-100',
    title: 'Stay Safe',
    text: 'Proximity alerts warn you when you\'re approaching a reported pothole. The app tracks how much repair money you\'ve saved by avoiding damage.',
  },
  {
    icon: Map,
    color: 'text-green-500',
    bg: 'bg-green-100',
    title: 'See What\'s Out There',
    text: 'Switch between map and list views. Confirm others\' reports, mark potholes as fixed, or dispute ones still causing trouble.',
  },
  {
    icon: Trophy,
    color: 'text-amber-500',
    bg: 'bg-amber-100',
    title: 'Make a Difference',
    text: 'Earn reputation for reporting, confirming, and fixing potholes in your community. The more you contribute, the more weight your vote carries.',
  },
];

export default function OnboardingTour({ onClose }) {
  const [slide, setSlide] = useState(0);

  const isLast = slide === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        {/* Progress dots */}
        <div className="flex justify-between items-center px-6 pt-6 pb-2">
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === slide ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                }`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Slide content */}
        <div className="px-6 pt-6 pb-2 text-center">
          {(() => {
            const s = SLIDES[slide];
            const Icon = s.icon;
            return (
              <>
                <div className={`w-16 h-16 rounded-2xl ${s.bg} flex items-center justify-center mx-auto mb-5`}>
                  <Icon className={`w-8 h-8 ${s.color}`} />
                </div>
                <h2 className="font-heading font-bold text-xl mb-2">{s.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              </>
            );
          })()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-5 gap-3">
          {slide > 0 ? (
            <button
              onClick={() => setSlide(slide - 1)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={isLast ? onClose : () => setSlide(slide + 1)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold font-heading hover:bg-primary/90 transition-colors"
          >
            {isLast ? 'Got It!' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}