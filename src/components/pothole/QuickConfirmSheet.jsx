import { CheckCircle, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const severityDots = {
  minor: 'bg-yellow-400',
  moderate: 'bg-orange-400',
  severe: 'bg-red-400',
  dangerous: 'bg-red-700',
};

export default function QuickConfirmSheet({ pothole, onConfirm, onViewDetails, onDismiss }) {
  if (!pothole) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center" onClick={onDismiss}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-card w-full max-w-lg rounded-t-2xl border-t shadow-2xl p-4 safe-bottom"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-3" />

        <div className="flex items-start gap-2 mb-4">
          <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${severityDots[pothole.severity] || 'bg-orange-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{pothole.address || 'Unknown location'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {Math.round(pothole.upvotes || 0)} confirms · {pothole.severity}
            </p>
          </div>
          <button onClick={onDismiss} aria-label="Dismiss" className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <Button
          onClick={onConfirm}
          size="lg"
          className="w-full gap-2 text-base font-heading"
        >
          <CheckCircle className="w-5 h-5" />
          ✓ Still here
        </Button>

        <button
          onClick={onViewDetails}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2 mt-1"
        >
          View details
        </button>
      </div>
    </div>
  );
}