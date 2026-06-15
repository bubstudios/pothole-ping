import React, { useState } from 'react';
import { Heart, Coffee, Gift, X } from 'lucide-react';

const TIERS = [
  { amount: 3, label: 'Coffee', icon: Coffee, description: 'Buy the team a coffee' },
  { amount: 10, label: 'Tire Saver', icon: Gift, description: 'Help keep the servers running' },
  { amount: 25, label: 'Road Hero', icon: Heart, description: 'Support road safety in your city' },
];

export default function SupportButton() {
  const [open, setOpen] = useState(false);

  const handleSupport = (amount) => {
    setOpen(false);
    window.open(`https://potholeping.com/support?amount=${amount}`, '_blank');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute top-4 right-4 z-[1001] w-9 h-9 rounded-full bg-pink-500 text-white shadow-lg hover:bg-pink-600 transition-colors flex items-center justify-center"
        title="Support PotholePing"
      >
        <Heart className="w-4 h-4" />
      </button>

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