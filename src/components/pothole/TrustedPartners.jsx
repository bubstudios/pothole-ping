import React from 'react';
import { Store, Phone, Globe, ArrowUpRight, Wrench, Shield, Truck } from 'lucide-react';

const CATEGORY_ICONS = {
  tire_shop: Shield,
  alignment: Wrench,
  auto_repair: Wrench,
  towing: Truck,
  auto_body: Wrench,
  insurance: Shield,
  other: Store,
};

export default function TrustedPartners({ businesses, potholeLat, potholeLng }) {
  // Haversine distance in miles
  const distanceMiles = (lat1, lng1, lat2, lng2) => {
    const R = 3959; // Earth radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const nearby = businesses
    .filter((b) => {
      const dist = distanceMiles(
        Number(b.latitude), Number(b.longitude),
        Number(potholeLat), Number(potholeLng)
      );
      return dist <= 5;
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 2);

  if (nearby.length === 0) return null;

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nearby Help</p>
      {nearby.map((biz) => {
        const Icon = CATEGORY_ICONS[biz.category] || Store;
        const dist = distanceMiles(
          Number(biz.latitude), Number(biz.longitude),
          Number(potholeLat), Number(potholeLng)
        );
        return (
          <div key={biz.id} className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-sm">{biz.name}</p>
              <p className="text-xs text-muted-foreground">
                {dist < 1 ? `${(dist * 5280).toFixed(0)}ft away` : `${dist.toFixed(1)}mi away`}
              </p>
              {biz.discount_text && (
                <p className="text-xs text-green-600 font-medium mt-0.5">{biz.discount_text}</p>
              )}
              <div className="flex gap-2 mt-1.5">
                {biz.phone && (
                  <a
                    href={`tel:${biz.phone}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    Call
                  </a>
                )}
                {biz.website && (
                  <a
                    href={biz.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Globe className="w-3 h-3" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}