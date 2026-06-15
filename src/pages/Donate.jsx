import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Coffee, Gift, ArrowLeft, ArrowRight, Check, Share2, Users, Wrench, Shield, Server, MessageCircle, Loader2, Repeat } from 'lucide-react';

const PRESET_TIERS = [
  { amount: 3, label: 'Coffee', icon: Coffee, description: 'Fuel the team' },
  { amount: 10, label: 'Tire Saver', icon: Shield, description: 'Keep servers running' },
  { amount: 25, label: 'Road Hero', icon: Heart, description: 'Fund new features' },
];

function StepTiers({ onSelect, onCustom, customAmount, setCustomAmount, recurring, setRecurring }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {PRESET_TIERS.map((tier) => {
          const Icon = tier.icon;
          return (
            <button
              key={tier.amount}
              onClick={() => onSelect(tier.amount)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 hover:border-primary hover:bg-accent/30 transition-all text-center"
            >
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="font-heading font-bold text-lg">${tier.amount}</p>
                <p className="text-xs text-muted-foreground">{tier.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
          <Input
            type="number"
            min="1"
            placeholder="Custom amount"
            value={customAmount}
            onChange={(e) => {
              const val = e.target.value;
              setCustomAmount(val);
              if (val) onCustom(Number(val));
            }}
            className="pl-7 text-lg font-bold"
          />
        </div>
      </div>

      <button
        onClick={() => setRecurring(!recurring)}
        className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
          recurring
            ? 'border-pink-400 bg-pink-50 text-pink-700'
            : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
        }`}
      >
        <Repeat className={`w-4 h-4 ${recurring ? 'text-pink-500' : ''}`} />
        {recurring ? 'Monthly recurring donation' : 'Make this a monthly donation'}
      </button>
    </div>
  );
}

function StepWhy({ potholesFixed, donorCount }) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading font-bold text-lg">Your impact</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <Wrench className="w-6 h-6 text-green-600 mx-auto mb-1" />
          <p className="font-heading font-bold text-2xl text-green-700">{potholesFixed}</p>
          <p className="text-xs text-green-600">Potholes Fixed</p>
        </div>
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 text-pink-600 mx-auto mb-1" />
          <p className="font-heading font-bold text-2xl text-pink-700">{donorCount}</p>
          <p className="text-xs text-pink-600">Community Donors</p>
        </div>
      </div>

      <div className="bg-muted rounded-xl p-4 space-y-3">
        <h4 className="font-heading font-semibold text-sm">Where your money goes</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary flex-shrink-0" />
            <span><strong>Servers & hosting</strong> — keeping the map and alerts running 24/7</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary flex-shrink-0" />
            <span><strong>LLM & API costs</strong> — jurisdiction lookups for every report</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary flex-shrink-0" />
            <span><strong>Community outreach</strong> — getting more cities on board</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepMessage({ message, setMessage, donorName, setDonorName, onSubmit, isSubmitting, amount, recurring, onBack }) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading font-bold text-lg">
        {recurring ? 'Monthly' : 'One-time'} donation of <span className="text-primary">${amount}</span>
      </h3>

      <div>
        <label className="text-sm font-medium">Your name (optional)</label>
        <Input
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder="How you'd like to appear"
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Leave a message (optional)</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Why you support PotholePing..."
          className="mt-1 min-h-[80px]"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting} className="flex-1 gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Donate ${amount}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function StepThankYou({ amount, recurring, donorCount, onShare }) {
  return (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h3 className="font-heading font-bold text-xl">Thank you! ❤️</h3>
        <p className="text-muted-foreground mt-1">
          Your {recurring ? 'monthly' : ''} ${amount} donation helps keep potholes off the roads.
        </p>
      </div>

      <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
        <p className="text-sm font-medium text-pink-700">
          You're one of <strong>{donorCount}</strong> community donors powering PotholePing!
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Tell your friends and family:</p>
        <Button variant="outline" onClick={onShare} className="gap-2 w-full">
          <Share2 className="w-4 h-4" />
          Share PotholePing
        </Button>
      </div>

      <Link to="/" className="text-sm text-primary hover:underline inline-block">
        ← Back to the map
      </Link>
    </div>
  );
}

export default function Donate() {
  const [step, setStep] = useState('tiers');
  const [amount, setAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [message, setMessage] = useState('');
  const [donorName, setDonorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [potholesFixed, setPotholesFixed] = useState(0);
  const [donorCount, setDonorCount] = useState(0);

  useEffect(() => {
    loadStats();
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setStep('thanks');
    }
  }, []);

  const loadStats = async () => {
    try {
      const fixed = await base44.entities.PotholeReport.filter({ status: 'fixed' });
      setPotholesFixed(fixed.length);
    } catch {}
    try {
      const donations = await base44.entities.Donation.filter({ status: 'completed' });
      setDonorCount(donations.length);
    } catch {}
  };

  const handleSelect = (amt) => {
    setAmount(amt);
    setCustomAmount('');
    setStep('why');
  };

  const handleCustom = (val) => {
    setAmount(val);
  };

  const handleSubmit = async () => {
    if (!amount || amount < 1) return;
    setIsSubmitting(true);

    try {
      const successUrl = window.location.origin + '/donate?success=true';
      const cancelUrl = window.location.origin + '/donate?canceled=true';

      const response = await base44.functions.invoke('createDonationCheckout', {
        amount,
        recurring,
        successUrl,
        cancelUrl,
        donorName: donorName || undefined,
        message: message || undefined,
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
    setIsSubmitting(false);
  };

  const handleShare = async () => {
    const text = `I just supported PotholePing — a free app that maps and tracks potholes to keep our roads safe. ${potholesFixed} potholes fixed so far! 🚗✨`;
    if (navigator.share) {
      try { await navigator.share({ title: 'PotholePing', text }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(text); } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to map
        </Link>

        <div className="bg-card border rounded-2xl shadow-xl p-6">
          {step === 'tiers' && (
            <StepTiers
              onSelect={handleSelect}
              onCustom={handleCustom}
              customAmount={customAmount}
              setCustomAmount={setCustomAmount}
              recurring={recurring}
              setRecurring={setRecurring}
            />
          )}

          {step === 'why' && (
            <StepWhy potholesFixed={potholesFixed} donorCount={donorCount} />
          )}

          {step === 'why' && (
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => setStep('tiers')} className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={() => setStep('message')} className="flex-1 gap-2">
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 'message' && (
            <StepMessage
              message={message}
              setMessage={setMessage}
              donorName={donorName}
              setDonorName={setDonorName}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              amount={amount}
              recurring={recurring}
              onBack={() => setStep('why')}
            />
          )}

          {step === 'thanks' && (
            <StepThankYou
              amount={amount}
              recurring={recurring}
              donorCount={donorCount}
              onShare={handleShare}
            />
          )}
        </div>
      </div>
    </div>
  );
}