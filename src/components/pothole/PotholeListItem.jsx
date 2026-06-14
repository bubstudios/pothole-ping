import React from 'react';
import { MapPin, ThumbsUp, Clock } from 'lucide-react';
import moment from 'moment';

const severityDots = {
  minor: 'bg-yellow-400',
  moderate: 'bg-orange-400',
  severe: 'bg-red-500',
  dangerous: 'bg-red-800',
};

export default function PotholeListItem({ pothole, onClick }) {
  return (
    <button
      onClick={() => onClick(pothole)}
      className="w-full text-left p-3 rounded-lg border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${severityDots[pothole.severity]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {pothole.address || 'Unknown location'}
          </p>
          {pothole.jurisdiction_name && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              📞 {pothole.jurisdiction_name}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="capitalize">{pothole.severity}</span>
            <span className="flex items-center gap-0.5">
              <ThumbsUp className="w-3 h-3" />
              {pothole.upvotes || 0}
            </span>
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {moment(pothole.created_date).fromNow()}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}