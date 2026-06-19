import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import MobileSelect from '@/components/ui/mobile-select';
import { ArrowLeft, Plus, Trash2, Store, Loader2, MapPin, Globe, Phone, X } from 'lucide-react';

const CATEGORIES = [
  { value: 'tire_shop', label: 'Tire Shop' },
  { value: 'alignment', label: 'Alignment' },
  { value: 'auto_repair', label: 'Auto Repair' },
  { value: 'towing', label: 'Towing' },
  { value: 'auto_body', label: 'Auto Body' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = { name: '', category: 'tire_shop', phone: '', email: '', website: '', address: '', description: '', discount_text: '' };

export default function ManageSponsors() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSponsors(); }, []);

  const loadSponsors = async () => {
    setLoading(true);
    const data = await base44.entities.SponsoredBusiness.list('-created_date', 100);
    setSponsors(data);
    setLoading(false);
  };

  const geocode = async (address) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  };

  const handleAdd = async () => {
    if (!form.name || !form.address || !form.phone) return;
    setGeocoding(true);
    const coords = await geocode(form.address);
    setGeocoding(false);
    if (!coords) {
      alert('Could not find that address. Please check and try again.');
      return;
    }
    setSaving(true);
    await base44.entities.SponsoredBusiness.create({
      ...form,
      latitude: coords.lat,
      longitude: coords.lng,
      is_active: true,
      priority: 0,
    });
    setSaving(false);
    setForm(EMPTY_FORM);
    setShowForm(false);
    loadSponsors();
  };

  const handleToggle = async (sponsor) => {
    await base44.entities.SponsoredBusiness.update(sponsor.id, { is_active: !sponsor.is_active });
    loadSponsors();
  };

  const handleDelete = async (sponsor) => {
    if (!confirm(`Remove ${sponsor.name}?`)) return;
    await base44.entities.SponsoredBusiness.delete(sponsor.id);
    loadSponsors();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b sticky top-0 z-10 safe-top">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-heading font-bold text-lg">Manage Sponsors</h1>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Sponsor
          </Button>
        )}
      </header>

      <div className="max-w-xl mx-auto p-4 space-y-4">
        {showForm && (
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold">New Sponsor</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <Input
              placeholder="Business name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-2">
              <MobileSelect
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
                options={CATEGORIES}
                placeholder="Category"
              />
              <Input
                placeholder="Phone *"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <Input
              placeholder="Street address * — e.g. 111 Maple Street, City, State"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder="Website URL"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>

            <Textarea
              placeholder="Short description of services"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="min-h-[60px]"
            />

            <Input
              placeholder="Discount offer — e.g. '15% off with code PING15'"
              value={form.discount_text}
              onChange={(e) => setForm({ ...form, discount_text: e.target.value })}
            />

            <Button
              onClick={handleAdd}
              disabled={geocoding || saving || !form.name || !form.address || !form.phone}
              className="w-full gap-1.5"
            >
              {geocoding ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Finding address...</>
              ) : saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <>Add Sponsor</>
              )}
            </Button>
          </div>
        )}

        {sponsors.length === 0 && !showForm && (
          <div className="text-center py-12 text-muted-foreground">
            <Store className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No sponsors yet</p>
          </div>
        )}

        {sponsors.map((s) => (
          <div key={s.id} className={`bg-card border rounded-xl p-4 space-y-2 ${!s.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-heading font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{s.category?.replace('_', ' ')}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleToggle(s)}
                  className={`text-xs px-2 py-1 rounded-lg font-medium ${
                    s.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {s.address && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {s.address}
              </div>
            )}

            {s.discount_text && (
              <p className="text-xs text-green-600 font-medium">{s.discount_text}</p>
            )}

            <div className="flex gap-3 text-xs">
              {s.phone && (
                <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Phone className="w-3 h-3" /> {s.phone}
                </a>
              )}
              {s.website && (
                <a href={s.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <Globe className="w-3 h-3" /> Website
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}