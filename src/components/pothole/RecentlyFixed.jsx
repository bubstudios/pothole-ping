import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RecentlyFixed({ potholes = [] }) {
  const recentlyFixed = potholes
    .filter((p) => p.status === 'fixed')
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
    .slice(0, 5);

  if (recentlyFixed.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">✨</span>
        <h3 className="font-heading font-bold text-sm text-green-700 dark:text-green-300">Recently Fixed</h3>
        <span className="text-xs font-semibold bg-green-600 text-white px-2 py-1 rounded-full ml-auto">
          {recentlyFixed.length}
        </span>
      </div>
      <div className="space-y-2">
        {recentlyFixed.map((p) => (
          <div key={p.id} className="flex items-start gap-2 bg-white dark:bg-green-900/20 rounded-md p-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{p.address || 'Unknown location'}</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Fixed {formatDistanceToNow(new Date(p.updated_date), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}