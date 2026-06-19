import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Users, MapPin, DollarSign, BarChart3, Download, RefreshCw, FileJson, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PullToRefresh from '@/components/PullToRefresh';
import moment from 'moment';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    checkAdmin();
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, []);

  const checkAdmin = async () => {
    try {
      const u = await base44.auth.me();
      if (u.role !== 'admin') {
        setUser(u);
        setLoading(false);
        return;
      }
      setUser(u);
      await loadAll();
    } catch (e) {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (reports.length === 0) return;
    const headers = ['ID','Status','Severity','Latitude','Longitude','Address','Description','Jurisdiction','Phone','Email','Upvotes','Created','Fixed By'];
    const rows = reports.map((r) => [
      r.id, r.status, r.severity, r.latitude, r.longitude,
      `"${(r.address || '').replace(/"/g, '""')}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${(r.jurisdiction_name || '').replace(/"/g, '""')}"`,
      r.jurisdiction_phone || '', r.submission_email || '',
      r.upvotes, r.created_date, r.fixed_by || ''
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csv, 'potholeping-reports.csv', 'text/csv');
  };

  const exportJSON = () => {
    if (reports.length === 0) return;
    const clean = reports.map(({ created_date, updated_date, created_by_id, ...rest }) => rest);
    downloadFile(JSON.stringify(clean, null, 2), 'potholeping-reports.json', 'application/json');
  };

  const downloadFile = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadAll = async () => {
    setLoading(true);
    const [u, r, s, d] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.PotholeReport.list('-created_date', 200),
      base44.entities.SponsoredBusiness.list(),
      base44.entities.Donation.list('-created_date', 100),
    ]);
    setUsers(u);
    setReports(r);
    setSponsors(s);
    setDonations(d);

    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    setStats({
      totalUsers: u.length,
      totalReports: r.length,
      activeReports: r.filter((p) => p.status !== 'fixed').length,
      fixedReports: r.filter((p) => p.status === 'fixed').length,
      reportsThisWeek: r.filter((p) => new Date(p.created_date) >= weekAgo).length,
      reportsThisMonth: r.filter((p) => new Date(p.created_date) >= monthAgo).length,
      totalDonations: d.filter((d) => d.status === 'completed').reduce((sum, d) => sum + (d.amount || 0), 0),
      activeSponsors: s.filter((b) => b.is_active).length,
    });
    setLoading(false);
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="w-16 h-16 text-muted-foreground opacity-30" />
        <h1 className="font-heading font-bold text-xl">Access Denied</h1>
        <p className="text-sm text-muted-foreground">Admin-only area</p>
        <Link to="/"><Button variant="outline">Back to Home</Button></Link>
      </div>
    );
  }

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Active Reports', value: stats.activeReports, icon: MapPin, color: 'text-red-500' },
    { label: 'Fixed Reports', value: stats.fixedReports, icon: Shield, color: 'text-green-500' },
    { label: 'This Week', value: stats.reportsThisWeek, icon: BarChart3, color: 'text-purple-500' },
    { label: 'Total Donations', value: `$${stats.totalDonations.toFixed(0)}`, icon: DollarSign, color: 'text-amber-500' },
    { label: 'Active Sponsors', value: stats.activeSponsors, icon: Users, color: 'text-teal-500' },
  ] : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <Link to="/" className="p-1 -ml-1 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-heading font-bold text-lg">Admin Dashboard</h1>
        </div>
        <Badge className="ml-auto bg-primary text-primary-foreground">Admin</Badge>
      </header>

      <PullToRefresh onRefresh={loadAll} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 pb-20 sm:pb-4 space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statCards.map((s, i) => (
              <div key={i} className="bg-card border rounded-xl p-4 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <p className="text-xl font-heading font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Recent Reports */}
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold text-sm">Recent Reports</h2>
              <div className="flex items-center gap-1">
                <button onClick={exportCSV} className="flex items-center gap-1 px-2 py-1 text-xs border rounded-md hover:bg-muted transition-colors">
                  <FileSpreadsheet className="w-3 h-3" /> CSV
                </button>
                <button onClick={exportJSON} className="flex items-center gap-1 px-2 py-1 text-xs border rounded-md hover:bg-muted transition-colors">
                  <FileJson className="w-3 h-3" /> JSON
                </button>
                <span className="text-xs text-muted-foreground">{reports.length} total</span>
              </div>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {reports.slice(0, 15).map((r) => (
                <Link key={r.id} to={`/pothole/${r.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{r.address || `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`}</p>
                    <p className="text-[10px] text-muted-foreground">{moment(r.created_date).fromNow()}</p>
                  </div>
                  <Badge className={`text-[10px] capitalize ${r.status === 'fixed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {r.status?.replace('_', ' ')}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Users & Sponsors */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-card border rounded-xl p-4">
              <h2 className="font-heading font-semibold text-sm mb-3">Users</h2>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {users.slice(0, 12).map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-[10px] text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{u.role || 'user'}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-sm">Sponsors</h2>
                <Link to="/manage-sponsors"><Button variant="outline" size="sm" className="text-xs">Manage</Button></Link>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {sponsors.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No sponsors yet</p>
                ) : (
                  sponsors.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground">{s.category?.replace('_', ' ')}</p>
                      </div>
                      <Badge className={`text-[10px] ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Donations */}
          <div className="bg-card border rounded-xl p-4">
            <h2 className="font-heading font-semibold text-sm mb-3">Recent Donations</h2>
            {donations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No donations yet</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {donations.filter((d) => d.status === 'completed').slice(0, 10).map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded-lg">
                    <div>
                      <p className="text-xs font-medium">{d.donor_name || 'Anonymous'}</p>
                      <p className="text-[10px] text-muted-foreground">{moment(d.created_date).fromNow()} {d.recurring ? '· Monthly' : ''}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">${d.amount?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}