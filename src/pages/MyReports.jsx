import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, FileText } from 'lucide-react';
import PotholeListItem from '@/components/pothole/PotholeListItem';
import { Loader2 } from 'lucide-react';

const STATUS_LABELS = {
  reported: 'Open',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  fixed: 'Fixed',
  disputed: 'Disputed',
};

export default function MyReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, []);

  const loadReports = async () => {
    try {
      const me = await base44.auth.me();
      const mine = await base44.entities.PotholeReport.filter({ created_by_id: me.id }, '-created_date', 100);
      setReports(mine);
    } catch (e) {}
    setLoading(false);
  };

  const handleClick = (pothole) => navigate(`/pothole/${pothole.id}`);

  const counts = reports.reduce((acc, r) => {
    const label = STATUS_LABELS[r.status] || r.status;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background sm:pb-0 pb-14">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="font-heading font-bold text-lg">My Reports</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary strip */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(counts).map(([label, count]) => (
                <div key={label} className="bg-card border rounded-lg px-3 py-2 text-center flex-1 min-w-[80px]">
                  <p className="text-xl font-heading font-bold text-primary">{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
              {reports.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">You haven't reported any potholes yet.</p>
              )}
            </div>

            {/* Report cards */}
            <div className="space-y-2">
              {reports.map((p) => (
                <PotholeListItem key={p.id} pothole={p} onClick={handleClick} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}