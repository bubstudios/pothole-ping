import React from 'react';
import { MapPin, ThumbsUp, Clock, AlertTriangle, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ShareButton from './ShareButton';

const severityDots = {
  minor: 'bg-yellow-100',
  moderate: 'bg-orange-400',
  severe: 'bg-red-400',
  dangerous: 'bg-red-700',
};

function isStale(pothole) {
  if (pothole.status === 'fixed' || pothole.status === 'disputed') return false;
  const refDate = pothole.last_confirmed_date || pothole.created_date;
  if (!refDate) return false;
  const daysSince = (Date.now() - new Date(refDate).getTime()) / (24 * 60 * 60 * 1000);
  return daysSince > 30;
}

export default React.memo(function PotholeListItem({ pothole, onClick }) {
  const stale = isStale(pothole);
  return (
    <button
      onClick={() => onClick(pothole)}
      aria-label={`View pothole details: ${pothole.address || 'unknown location'} - ${pothole.severity} severity`}
      className={`w-full text-left p-3 rounded-lg border hover:border-primary/30 hover:shadow-sm transition-all group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none ${
        pothole.status === 'disputed' ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' :
        stale ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' :
        'bg-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${severityDots[pothole.severity]}`}>
          <span className="sr-only">{pothole.severity} severity</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {pothole.address || 'Unknown location'}
            </p>
            {stale && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            {pothole.status === 'disputed' && <Zap className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />}
          </div>
          {pothole.jurisdiction_name && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              📞 {pothole.jurisdiction_name}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
            <span className="capitalize">{pothole.severity}</span>
            <span className={`capitalize font-medium ${
              pothole.status === 'disputed' ? 'text-purple-600' : 'text-muted-foreground'
            }`}>
              {pothole.status?.replace('_', ' ')}
            </span>
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <ThumbsUp className="w-3 h-3" />
              {Math.round(pothole.upvotes || 0)}
            </span>
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(pothole.created_date), { addSuffix: true })}
            </span>
            <span onClick={(e) => e.stopPropagation()}>
              <ShareButton pothole={pothole} />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
});