import React from 'react';
import { Megaphone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdvertiseCTA({ variant = 'inline' }) {
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-heading font-semibold text-sm">Own a tire shop or repair business?</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Reach drivers when they need you most — right after hitting or avoiding a pothole. Become a Trusted Partner.
            </p>
            <Button size="sm" className="mt-3 gap-1.5" onClick={() => window.open('mailto:partners@potholeping.com?subject=Trusted Partner Inquiry', '_blank')}>
              Get Listed
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 bg-accent/30">
      <div className="flex items-center gap-2 mb-2">
        <Megaphone className="w-4 h-4 text-primary" />
        <p className="text-xs font-medium">Own a local tire or repair shop?</p>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        Reach drivers right when they need repairs. Be featured as a Trusted Partner.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs"
        onClick={() => window.open('mailto:partners@potholeping.com?subject=Trusted Partner Inquiry', '_blank')}
      >
        Advertise With Us
      </Button>
    </div>
  );
}