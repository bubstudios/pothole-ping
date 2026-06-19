import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Skull, Clock, Flame, AlertTriangle, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

const severityScore = {
  minor: 1,
  moderate: 2,
  severe: 4,
  dangerous: 8,
};

const severityBadge = {
  minor: 'bg-yellow-400 text-yellow-900',
  moderate: 'bg-orange-400 text-orange-900',
  severe: 'bg-red-400 text-red-900',
  dangerous: 'bg-red-700 text-red-50',
};

function calcShameScore(pothole) {
  const daysOld = Math.max(1, moment().diff(moment(pothole.created_date), 'days'));
  const sev = severityScore[pothole.severity] || 2;
  const upvotes = pothole.upvotes || 0;
  return daysOld * sev + upvotes * 3;
}

export default function HallOfShame() {
  const [potholes, setPotholes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, []);

  const loadData = async () => {
    const data = await base44.entities.PotholeReport.list('-created_date', 200);
    const unfixed = data.filter((p) => p.status !== 'fixed');
    unfixed.sort((a, b) => calcShameScore(b) - calcShameScore(a));
    setPotholes(unfixed.slice(0, 20));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3 safe-top">
        <Link to="/" className="p-1 -ml-1 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Skull className="w-6 h-6 text-red-500" />
          <h1 className="font-heading font-bold text-lg">Hall of Shame</h1>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="max-w-2xl mx-auto p-4 pb-20 sm:pb-4 space-y-3">
          {potholes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-heading font-semibold">No shame here!</p>
              <p className="text-sm mt-1">All reported potholes have been fixed. 🎉</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                The most neglected potholes — ranked by age, severity, and community confirmations
              </p>

              {potholes.map((p, i) => {
                const score = calcShameScore(p);
                const daysOld = moment().diff(moment(p.created_date), 'days');

                return (
                  <div
                    key={p.id}
                    className="bg-card border rounded-xl p-4 flex gap-3 hover:shadow-md transition-shadow"
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-heading font-bold text-lg">
                      {i < 3 ? (
                        <span className={i === 0 ? 'text-red-500' : i === 1 ? 'text-orange-500' : 'text-amber-500'}>
                          {i + 1}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{i + 1}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-heading font-semibold text-sm truncate">
                          {p.address || 'Unknown Location'}
                        </h3>
                        <Badge className={`capitalize text-xs ${severityBadge[p.severity]}`}>
                          {p.severity}
                        </Badge>
                      </div>

                      {p.jurisdiction_name && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {p.jurisdiction_name}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {daysOld === 0 ? 'Today' : daysOld === 1 ? '1 day' : `${daysOld} days`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {p.upvotes || 0} confirms
                        </span>
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <Skull className="w-3 h-3" />
                          {score} pts
                        </span>
                      </div>

                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{p.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}