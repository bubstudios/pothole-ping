import React, { useState } from 'react';
import { Heart, Coffee, Gift, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIERS = [
  { amount: 3, label: 'Coffee', icon: Coffee, description: 'Buy the team a coffee' },
  { amount: 10, label: 'Tire Saver', icon: Gift, description: 'Help keep the servers running' },
  { amount: 25, label: 'Road Hero', icon: Heart, description: 'Support road safety in your city' },
];

export default function SupportButton({ compact = false }) {
  const [open, setOpen] = useState(false);

  const handleSupport = (amount) => {
    if (compact) {
      // External link for compact header usage
      window.open(`https://potholeping.com/support?amount=${amount}`, '_blank');
      return;
    }
    // Inline thank-you
    setOpen(false);
    alert(`Thanks for the support! A ${amount} contribution helps keep pothole reporting free for everyone. ❤️`);
  };

  if (compact) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-pink-600 border-pink-200 hover:bg-pink-50 transition-colors"
        title="Support PotholePing"
      >
        <Heart className="w-3.5 h-3.5" />
        Support
      </button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-pink-600 hover:text-pink-700 hover:bg-pink-50"
      >
        <Heart className="w-4 h-4" />
        Support Us
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">Support PotholePing</h3>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              PotholePing is free for everyone. Your support helps us keep potholes off the roads and drivers safe. ❤️
            </p>
            <div className="space-y-2">
              {TIERS.map((tier) => {
                const Icon = tier.icon;
                return (
                  <button
                    key={tier.amount}
                    onClick={() => handleSupport(tier.amount)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-primary hover:bg-accent/50 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">${tier.amount} — {tier.label}</p>
                      <p className="text-xs text-muted-foreground">{tier.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}