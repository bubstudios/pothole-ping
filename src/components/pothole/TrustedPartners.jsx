import React from 'react';
import { Phone, Globe, MapPin, Tag, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

const categoryIcons = {
  tire_shop: '🛞',
  alignment: '🔧',
  auto_repair: '🔩',
  towing: '🪝',
  auto_body: '🚗',
  insurance: '🛡️',
  other: '🏪',
};

const categoryLabels = {
  tire_shop: 'Tire Shop',
  alignment: 'Alignment',
  auto_repair: 'Auto Repair',
  towing: 'Towing',
  auto_body: 'Body Shop',
  insurance: 'Insurance',
  other: 'Auto Service',
};

export default function TrustedPartners({ businesses = [], context = 'nearby' }) {
  if (!businesses.length) return null;

  const heading = context === 'damage'
    ? 'Need repairs? Trusted local shops'
    : context === 'pothole'
    ? 'Hit a pothole? Nearby trusted shops'
    : 'Trusted Partners Nearby';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Wrench className="w-4 h-4 text-primary" />
        <h4 className="font-heading font-semibold text-sm">{heading}</h4>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Sponsored</span>
      </div>

      <div className="space-y-2">
        {businesses.slice(0, 3).map((biz) => (
          <div
            key={biz.id}
            className="border rounded-lg p-3 bg-card hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">
                {categoryIcons[biz.category] || '🏪'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{biz.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">
                    {categoryLabels[biz.category] || biz.category}
                  </span>
                </div>
                {biz.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {biz.address}
                  </p>
                )}
                {biz.discount_text && (
                  <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1.5 bg-green-50 rounded px-2 py-1">
                    <Tag className="w-3 h-3" />
                    {biz.discount_text}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  {biz.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => window.open(`tel:${biz.phone}`)}
                    >
                      <Phone className="w-3 h-3" />
                      Call
                    </Button>
                  )}
                  {biz.website && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => window.open(biz.website.startsWith('http') ? biz.website : `https://${biz.website}`, '_blank')}
                    >
                      <Globe className="w-3 h-3" />
                      Website
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { categoryLabels };