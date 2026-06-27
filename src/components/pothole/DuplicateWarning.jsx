import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ThumbsUp, Plus, MapPin } from 'lucide-react';

const severityConfig = {
  minor: { label: 'Minor', color: 'bg-yellow-100 text-yellow-700' },
  moderate: { label: 'Moderate', color: 'bg-orange-100 text-orange-700' },
  severe: { label: 'Severe', color: 'bg-red-100 text-red-700' },
  dangerous: { label: 'Dangerous', color: 'bg-red-200 text-red-800' },
};

export default function DuplicateWarning({ candidate, pin, distanceFt, onConfirm, onReportAnyway, onDismiss }) {
  if (!candidate) return null;

  const fromLat = pin ? Number(pin.lat) : Number(candidate.latitude);
  const fromLng = pin ? Number(pin.lng) : Number(candidate.longitude);
  const feetAway = Math.round(
    distanceFt(fromLat, fromLng, Number(candidate.latitude), Number(candidate.longitude))
  );

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-800">Possible Duplicate</h4>
            <p className="text-xs text-amber-700 mt-1">
              A pothole was already reported about {feetAway} feet away.
              Confirm it instead to avoid duplicates.
            </p>
          </div>
        </div>
      </div>

      {/* Existing report preview */}
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate">
            {candidate.address || `${Number(candidate.latitude).toFixed(5)}, ${Number(candidate.longitude).toFixed(5)}`}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${severityConfig[candidate.severity]?.color || ''}`}>
            {severityConfig[candidate.severity]?.label || candidate.severity}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{candidate.upvotes || 0} confirms</span>
        </div>
        {candidate.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{candidate.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={() => onConfirm(candidate)} size="sm" className="w-full gap-1.5">
          <ThumbsUp className="w-3.5 h-3.5" />
          Confirm Existing Report
        </Button>
        <Button onClick={onReportAnyway} variant="outline" size="sm" className="w-full gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Report Anyway
        </Button>
        <button onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground py-1">
          Cancel
        </button>
      </div>
    </div>
  );
}