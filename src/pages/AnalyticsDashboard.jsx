import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, TrendingUp, PieChart, BarChart3, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import PullToRefresh from '@/components/PullToRefresh';

const SEVERITY_COLORS = { minor: '#eab308', moderate: '#f97316', severe: '#ef4444', dangerous: '#b91c1c' };
const STATUS_COLORS = { reported: '#ef4444', acknowledged: '#f59e0b', in_progress: '#3b82f6', fixed: '#22c55e', disputed: '#a855f7' };

export default function AnalyticsDashboard() {
  const [potholes, setPotholes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.PotholeReport.list('-created_date', 500);
    setPotholes(data);
    setLoading(false);
  };

  // Reports over time (by week)
  const reportsByWeek = {};
  potholes.forEach((p) => {
    const d = new Date(p.created_date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    reportsByWeek[key] = (reportsByWeek[key] || 0) + 1;
  });
  const weeklyData = Object.entries(reportsByWeek)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([date, count]) => ({ date: date.slice(5), count }));

  // Severity distribution
  const severityCounts = { minor: 0, moderate: 0, severe: 0, dangerous: 0 };
  potholes.forEach((p) => { severityCounts[p.severity] = (severityCounts[p.severity] || 0) + 1; });
  const severityData = Object.entries(severityCounts).map(([name, value]) => ({ name, value }));

  // Status breakdown
  const statusCounts = { reported: 0, acknowledged: 0, in_progress: 0, fixed: 0, disputed: 0 };
  potholes.forEach((p) => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  // Top jurisdictions
  const jurMap = {};
  potholes.forEach((p) => {
    const key = p.jurisdiction_name || 'Unknown';
    if (!jurMap[key]) jurMap[key] = { name: key, total: 0, fixed: 0 };
    jurMap[key].total++;
    if (p.status === 'fixed') jurMap[key].fixed++;
  });
  const jurData = Object.values(jurMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <Link to="/" className="p-1 -ml-1 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h1 className="font-heading font-bold text-lg">Analytics</h1>
        </div>
      </header>

      <PullToRefresh onRefresh={loadData} className="h-[calc(100vh-57px)] overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 pb-20 sm:pb-4 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Reports', value: potholes.length, color: 'text-primary' },
              { label: 'Fixed', value: potholes.filter((p) => p.status === 'fixed').length, color: 'text-green-500' },
              { label: 'Unfixed', value: potholes.filter((p) => p.status !== 'fixed').length, color: 'text-red-500' },
              { label: 'Fix Rate', value: potholes.length > 0 ? `${Math.round((potholes.filter((p) => p.status === 'fixed').length / potholes.length) * 100)}%` : '0%', color: 'text-blue-500' },
            ].map((card, i) => (
              <div key={i} className="bg-card border rounded-xl p-4 text-center">
                <p className={`text-2xl font-heading font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Weekly reports */}
          <div className="bg-card border rounded-xl p-4">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" />
              Reports Over Time
            </h2>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(24, 95%, 53%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Not enough data yet</p>
            )}
          </div>

          {/* Severity + Status breakdown */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-card border rounded-xl p-4">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2 mb-4">
                <PieChart className="w-4 h-4" />
                By Severity
              </h2>
              {severityData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RePieChart>
                    <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`}>
                      {severityData.map((entry) => (
                        <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#888'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              )}
            </div>

            <div className="bg-card border rounded-xl p-4">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2 mb-4">
                <PieChart className="w-4 h-4" />
                By Status
              </h2>
              {statusData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RePieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`}>
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name.replace(' ', '_')] || '#888'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              )}
            </div>
          </div>

          {/* Top jurisdictions */}
          <div className="bg-card border rounded-xl p-4">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4" />
              Top Jurisdictions
            </h2>
            {jurData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, jurData.length * 36)}>
                <BarChart data={jurData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" width={95} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(24, 95%, 53%)" radius={[0, 4, 4, 0]} name="Total" />
                  <Bar dataKey="fixed" fill="hsl(150, 60%, 40%)" radius={[0, 4, 4, 0]} name="Fixed" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}