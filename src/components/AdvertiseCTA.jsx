import React from 'react';
import { Megaphone, ArrowRight } from 'lucide-react';

export default function AdvertiseCTA() {
  return (
    <a
      href="mailto:ads@potholeping.org?subject=Local%20Advertising%20Inquiry"
      className="block border border-dashed border-muted-foreground/30 rounded-lg p-3 hover:border-primary/50 hover:bg-accent/30 transition-all group"
    >
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <div className="flex-1">
          <p className="text-xs font-medium group-hover:text-primary transition-colors">Advertise With Us</p>
          <p className="text-xs text-muted-foreground">Reach nearby drivers when they need you most</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </a>
  );
}