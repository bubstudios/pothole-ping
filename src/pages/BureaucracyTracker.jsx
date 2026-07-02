import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Building2, Clock, AlertTriangle, CheckCircle2, Timer, TrendingDown, Award } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { differenceInDays, isBefore } from 'date-fns';

const statusLabel = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  fixed: 'Fixed',
};

const statusColor = {
  reported: 'bg-red-100 text-red-700 border-red-200',
  acknowledged: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  fixed: 'bg-green-100 text-green-700 border-green-200',
};

const statusIcon = {
  reported: AlertTriangle,
  acknowledged: Clock,
  in_progress: Timer,
  fixed: CheckCircle2,
};

export default function BureaucracyTracker() {
  const [potholes, setPotholes] = useState([]);
  const [jurisdictions, setJurisdictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('potholes');

  useEffect(() => {
    loadData();
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, []);

  const loadData = async () => {
    const data = await base44.entities.PotholeReport.filter({}, '-created_date', 100);
    setPotholes(data);

    // Aggregate jurisdiction stats
    const jurMap = {};
    data.forEach((p) => {
      const key = p.jurisdiction_name || 'Unknown';
      if (!jurMap[key]) {
        jurMap[key] = {
          name: key,
          type: p.jurisdiction_type || 'unknown',
          total: 0,
          reported: 0,
          acknowledged: 0,
          inProgress: 0,
          fixed: 0,
          oldestReport: null,
        };
      }
      jurMap[key].total++;
      jurMap[key][p.status]++;
      if (!jurMap[key].oldestReport || isBefore(new Date(p.created_date), new Date(jurMap[key].oldestReport))) {
        jurMap[key].oldestReport = p.created_date;
      }
    });

    const jurList = Object.values(jurMap).sort((a, b) => {
      const aUnfixed = a.total - a.fixed;
      const bUnfixed = b.total - b.fixed;
      return bUnfixed - aUnfixed;
    });
    setJurisdictions(jurList);
    setLoading(false);
  };

  const daysAgo = (date) => Math.max(0, differenceInDays(new Date(), new Date(date)));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const unfixedPotholes = potholes
    .filter((p) => p.status !== 'fixed')
    .sort((a, b) => differenceInDays(new Date(a.created_date), new Date(b.created_date)));

  const stuckPotholes = unfixedPotholes.filter((p) => p.status === 'reported');
  const avgDaysToAcknowledge = potholes
    .filter((p) => p.status !== 'reported')
    .reduce((sum, p) => sum + daysAgo(p.created_date), 0) / (potholes.filter((p) => p.status !== 'reported').length || 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <Link to="/" className="p-1 -ml-1 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-amber-600" />
          <h1 className="font-heading font-bold text-lg">Bureaucracy Tracker</h1>
        </div>
        <Link to="/report-card" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-amber-600 border-amber-200 hover:bg-amber-50 transition-colors">
          <Award className="w-3.5 h-3.5" />
          Report Card
        </Link>
      </header>

      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="max-w-2xl mx-auto p-4 pb-20 sm:pb-4 space-y-4">
          {/* Stats banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-2xl font-heading font-bold text-red-500">{stuckPotholes.length}</p>
              <p className="text-xs text-muted-foreground">Stuck Unacknowledged</p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-2xl font-heading font-bold text-amber-500">{unfixedPotholes.length}</p>
              <p className="text-xs text-muted-foreground">Still Unfixed</p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-2xl font-heading font-bold text-blue-500">
                {potholes.filter((p) => p.status === 'fixed').length}
              </p>
              <p className="text-xs text-muted-foreground">Fixed</p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-2xl font-heading font-bold text-muted-foreground">
                {Math.round(avgDaysToAcknowledge)}
              </p>
              <p className="text-xs text-muted-foreground">Avg Days to Acknowledge</p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('potholes')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                view === 'potholes' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              By Pothole
            </button>
            <button
              onClick={() => setView('jurisdictions')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                view === 'jurisdictions' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              By Jurisdiction
            </button>
          </div>

          {/* Pothole view */}
          {view === 'potholes' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                Unfixed potholes — oldest first
              </p>
              {unfixedPotholes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">No unfixed potholes — the system works!</p>
                </div>
              ) : (
                unfixedPotholes.map((p) => {
                  const Icon = statusIcon[p.status] || AlertTriangle;
                  const d = daysAgo(p.created_date);
                  return (
                    <div key={p.id} className="bg-card border rounded-xl p-3 flex items-center gap-3">
                      <Icon className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.address || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {d === 0 ? 'Today' : `${d} day${d === 1 ? '' : 's'}`} in{' '}
                          <Badge className={`ml-1 capitalize text-[10px] px-1.5 py-0 ${statusColor[p.status]}`}>
                            {statusLabel[p.status]}
                          </Badge>
                        </p>
                      </div>
                      {p.jurisdiction_name && (
                        <p className="text-xs text-muted-foreground hidden sm:block max-w-[120px] truncate">
                          {p.jurisdiction_name}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Jurisdiction view */}
          {view === 'jurisdictions' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Jurisdictions ranked by unfixed backlog
              </p>
              {jurisdictions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No jurisdiction data yet</p>
                </div>
              ) : (
                jurisdictions.map((jur, i) => {
                  const unfixed = jur.total - jur.fixed;
                  const fixRate = jur.total > 0 ? Math.round((jur.fixed / jur.total) * 100) : 0;
                  return (
                    <div key={jur.name} className="bg-card border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-semibold text-sm truncate">{jur.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <span className="capitalize">{jur.type}</span>
                            <span>·</span>
                            <span>{jur.total} reports</span>
                          </div>
                        </div>
                        <Badge className={unfixed > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                          {fixRate}% fixed
                        </Badge>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 flex h-2 rounded-full overflow-hidden bg-muted">
                        {jur.fixed > 0 && (
                          <div
                            className="bg-green-400"
                            style={{ width: `${(jur.fixed / jur.total) * 100}%` }}
                          />
                        )}
                        {jur.inProgress > 0 && (
                          <div
                            className="bg-blue-400"
                            style={{ width: `${(jur.inProgress / jur.total) * 100}%` }}
                          />
                        )}
                        {jur.acknowledged > 0 && (
                          <div
                            className="bg-yellow-400"
                            style={{ width: `${(jur.acknowledged / jur.total) * 100}%` }}
                          />
                        )}
                        {jur.reported > 0 && (
                          <div
                            className="bg-red-400"
                            style={{ width: `${(jur.reported / jur.total) * 100}%` }}
                          />
                        )}
                      </div>

                      <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                        {jur.reported > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-400" />
                            {jur.reported} reported
                          </span>
                        )}
                        {jur.acknowledged > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-yellow-400" />
                            {jur.acknowledged} acknowledged
                          </span>
                        )}
                        {jur.inProgress > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            {jur.inProgress} in progress
                          </span>
                        )}
                        {jur.fixed > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            {jur.fixed} fixed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}