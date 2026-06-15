import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Check } from 'lucide-react';

export default function ShareButton({ pothole }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = `🚨 ${pothole.severity.toUpperCase()} pothole reported on PotholePing!\n📍 ${pothole.address || 'Unknown location'}\n🏛️ Managed by: ${pothole.jurisdiction_name || 'Unknown'}\n\nHelp map and fix potholes in your community!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pothole Report — PotholePing',
          text,
        });
      } catch {}
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className={`gap-1.5 ${copied ? 'text-green-600 border-green-300' : ''}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          Share
        </>
      )}
    </Button>
  );
}