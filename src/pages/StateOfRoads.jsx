import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Award, Share2, Check, TrendingDown, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import moment from 'moment';

const STATUS_ORDER = ['reported', 'acknowledged', 'in_progress', 'fixed', 'disputed'];

export default function StateOfRoads() {
  const [jurisdictions, setJurisdictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, []);

  const loadData = async () => {
    try {
      const potholes = await base44.entities.PotholeReport.filter({}, '-created_date', 500);
      const events = await base44.entities.PotholeStatusEvent.filter({}, 'created_date', 1000);

      // Build a map of pothole_id → first "fixed" event date
      const fixedEventMap = {};
      events.forEach((e) => {
        if (e.status === 'fixed' && !fixedEventMap[e.pothole_id]) {
          fixedEventMap[e.pothole_id] = e.created_date;
        }
      });

      const now = moment();
      const startOfMonth = moment().startOf('month');

      const jurMap = {};
      potholes.forEach((p) => {
        const key = p.jurisdiction_name || 'Unknown';
        if (!jurMap[key]) {
          jurMap[key] = {
            name: key,
            reportedThisMonth: 0,
            fixedThisMonth: 0,
            fixTimesDays: [],
            openPast30: 0,
          };
        }

        const created = moment(p.created_date);
        const isThisMonth = created.isSameOrAfter(startOfMonth);

        if (isThisMonth) jurMap[key].reportedThisMonth++;

        if (p.status === 'fixed') {
          const fixedDate = fixedEventMap[p.id] ? moment(fixedEventMap[p.id]) : null;
          if (fixedDate && fixedDate.isSameOrAfter(startOfMonth)) {
            jurMap[key].fixedThisMonth++;
          }
          if (fixedDate) {
            const daysToFix = fixedDate.diff(created, 'days');
            if (daysToFix >= 0) jurMap[key].fixTimesDays.push(daysToFix);
          }
        }

        // Still open past 30 days
        if (p.status !== 'fixed' && p.status !== 'disputed') {
          const refDate = p.last_confirmed_date || p.created_date;
          if (refDate && now.diff(moment(refDate), 'days') > 30) {
            jurMap[key].openPast30++;
          }
        }
      });

      const jurList = Object.values(jurMap).map((j) => {
        const avgDaysToFix = j.fixTimesDays.length > 0
          ? Math.round(j.fixTimesDays.reduce((a, b) => a + b, 0) / j.fixTimesDays.length)
          : null;
        return { ...j, avgDaysToFix };
      });

      // Sort: best (most fixed, fewest open) first; worst at bottom
      jurList.sort((a, b) => {
        const aScore = (a.fixedThisMonth / Math.max(a.reportedThisMonth, 1)) - (a.openPast30 * 0.1) - ((a.avgDaysToFix || 999) * 0.01);
        const bScore = (b.fixedThisMonth / Math.max(b.reportedThisMonth, 1)) - (b.openPast30 * 0.1) - ((b.avgDaysToFix || 999) * 0.01);
        return bScore - aScore;
      });

      setJurisdictions(jurList);
    } catch (e) {}
    setLoading(false);
  };

  const handleShare = async () => {
    if (jurisdictions.length === 0) return;
    const lines = jurisdictions.slice(0, 5).map((j) => {
      const fixPart = j.avgDaysToFix ? `avg ${j.avgDaysToFix} days` : 'no fixes yet';
      return `${j.name}: ${j.fixedThisMonth} of ${j.reportedThisMonth} fixed this month — ${fixPart}`;
    });
    const text = `📊 State of the Roads — ${moment().format('MMMM YYYY')}\n\n${lines.join('\n')}\n\nSee the full map: ${window.location.origin}/map`;

    if (navigator.share) {
      try { await navigator.share({ title: 'PotholePing State of the Roads', text }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const worst = jurisdictions[jurisdictions.length - 1];

  return (
    <div className="min-h-screen bg-background sm:pb-0 pb-14">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center justify-between" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center gap-3">
          <Link to="/bureaucracy" className="p-1 -ml-1 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h1 className="font-heading font-bold text-lg">State of the Roads</h1>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Share'}
        </Button>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        <p className="text-xs text-muted-foreground text-center">
          {moment().format('MMMM YYYY')} · Ranked best to worst
        </p>

        {/* Hall of Shame callout */}
        {worst && worst.openPast30 > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <TrendingDown className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-heading font-semibold text-sm text-red-800">Slowest to Fix</p>
              <p className="text-xs text-red-700 mt-0.5">
                {worst.name} has {worst.openPast30} pothole{worst.openPast30 === 1 ? '' : 's'} still open past 30 days
                {worst.avgDaysToFix ? ` and averages ${worst.avgDaysToFix} days to fix` : ' with no fixes recorded'}.
              </p>
            </div>
          </div>
        )}

        {jurisdictions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No jurisdiction data yet</p>
          </div>
        ) : (
          jurisdictions.map((j, i) => (
            <div key={j.name} className={`bg-card border rounded-xl p-4 ${i === 0 ? 'border-green-300' : i === jurisdictions.length - 1 ? 'border-red-200' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                    i === 0 ? 'bg-green-100 text-green-700' : i === jurisdictions.length - 1 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-heading font-semibold text-sm">{j.name}</h3>
                    <p className="text-xs text-muted-foreground">{j.reportedThisMonth} reported this month</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-heading font-bold text-green-600">{j.fixedThisMonth}</p>
                  <p className="text-[10px] text-muted-foreground">fixed</p>
                </div>
              </div>

              <div className="flex gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {j.avgDaysToFix !== null ? `${j.avgDaysToFix}d avg fix` : 'No fixes yet'}
                </span>
                {j.openPast30 > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertTriangle className="w-3 h-3" />
                    {j.openPast30} open 30d+
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}