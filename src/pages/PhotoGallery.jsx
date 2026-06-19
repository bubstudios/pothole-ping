import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Camera, Search, Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import moment from 'moment';

const severityBadge = {
  minor: 'bg-yellow-400 text-yellow-900',
  moderate: 'bg-orange-400 text-orange-900',
  severe: 'bg-red-400 text-red-900',
  dangerous: 'bg-red-700 text-red-50',
};

export default function PhotoGallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    loadPhotos();
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, []);

  const loadPhotos = async () => {
    setLoading(true);
    const data = await base44.entities.PotholeReport.list('-created_date', 300);
    setPhotos(data.filter((p) => p.photo_url));
    setLoading(false);
  };

  const filtered = photos.filter((p) => {
    if (severityFilter !== 'all' && p.severity !== severityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (p.address || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.jurisdiction_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3 safe-top">
        <Link to="/" className="p-1 -ml-1 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h1 className="font-heading font-bold text-lg">Photo Gallery</h1>
        </div>
      </header>

      <div className="p-3 border-b flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search photos..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'minor', 'moderate', 'severe', 'dangerous'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border transition-colors ${
                severityFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-20 sm:pb-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-heading font-semibold">No photos yet</p>
            <p className="text-sm mt-1">Report a pothole with a photo to see it here!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to={`/pothole/${p.id}`}
                className="bg-card border rounded-xl overflow-hidden group hover:shadow-md transition-shadow"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={p.photo_url}
                    alt={p.address || 'Pothole'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className={`capitalize text-[10px] px-1.5 py-0 ${severityBadge[p.severity] || ''}`}>
                      {p.severity}
                    </Badge>
                  </div>
                  {p.status === 'fixed' && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      FIXED
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{p.address || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {moment(p.created_date).fromNow()}
                    {p.jurisdiction_name && ` · ${p.jurisdiction_name}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}