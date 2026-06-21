import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Route, Plus, Trash2, AlertTriangle, CheckCircle, MapPin, Navigation, Bell, Loader2, Shuffle, Clock, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PullToRefresh from '@/components/PullToRefresh';

// Point-to-segment distance in feet
function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distanceFt(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distanceFt(px, py, x1 + t * dx, y1 + t * dy);
}

function distanceFt(lat1, lng1, lat2, lng2) {
  const R = 20903520;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ALERT_RADIUS_FT = 300;

const severityBadge = {
  minor: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800',
  dangerous: 'bg-red-700 text-red-50',
};

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);
  return null;
}

export default function CommuteSaver() {
  const [routes, setRoutes] = useState([]);
  const [potholes, setPotholes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [nearbyPotholes, setNearbyPotholes] = useState([]);
  const [form, setForm] = useState({ name: '', start_address: '', start_lat: '', start_lng: '', start_label: '', end_address: '', end_lat: '', end_lng: '', end_label: '', commute_hour: '' });
  const [useGps, setUseGps] = useState(null);
  const [geocoding, setGeocoding] = useState(null); // 'start' or 'end'
  const [analyzing, setAnalyzing] = useState(null);
  const [routeAnalysis, setRouteAnalysis] = useState(null);
  const [showAlt, setShowAlt] = useState(false);
  const [formError, setFormError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestFor, setSuggestFor] = useState(null); // 'start' or 'end'
  const [routePaths, setRoutePaths] = useState({}); // { routeId: [[lat,lng],...] }
  const [loadingRoutePath, setLoadingRoutePath] = useState(null);
  const mapRef = useRef();
  const debounceTimers = useRef({ start: null, end: null });

  useEffect(() => {
    loadData();
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, []);

  const loadingRef = useRef(false);
  const loadData = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      // Sequential to avoid rate limiting
      const r = await base44.entities.UserRoute.filter({}, '-created_date', 50);
      const p = await base44.entities.PotholeReport.filter({ status: { $in: ['reported', 'acknowledged', 'in_progress'] } }, '-created_date', 100);
      setRoutes(r);
      setPotholes(p);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const geocodeAddress = async (address, which, showSuggestions = false) => {
    if (!address.trim()) {
      if (showSuggestions) { setSuggestions([]); setSuggestFor(null); }
      return;
    }
    setGeocoding(which);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=${showSuggestions ? 5 : 1}&accept-language=en`, {
        headers: { 'User-Agent': 'PotholePing/1.0 (commute-saver)' },
      });
      if (!res.ok) throw new Error(`Nominatim returned ${res.status}`);
      const data = await res.json();
      if (data.length) {
        if (showSuggestions) {
          setSuggestions(data);
          setSuggestFor(which);
        } else {
          setSuggestions([]);
          setSuggestFor(null);
          setForm((f) => ({
            ...f,
            [which === 'start' ? 'start_lat' : 'end_lat']: parseFloat(data[0].lat).toFixed(6),
            [which === 'start' ? 'start_lng' : 'end_lng']: parseFloat(data[0].lon).toFixed(6),
            [`${which}_label`]: data[0].display_name,
          }));
        }
      } else if (!showSuggestions) {
        setFormError(`Could not find: "${address}"`);
      }
    } catch (e) {
      console.error('Geocoding failed', e);
      if (!showSuggestions) setFormError('Address lookup failed. Please try again.');
    }
    setGeocoding(null);
  };

  const debouncedSuggest = (address, which) => {
    if (debounceTimers.current[which]) clearTimeout(debounceTimers.current[which]);
    if (!address.trim() || address.trim().length < 2) {
      setSuggestions([]);
      setSuggestFor(null);
      return;
    }
    debounceTimers.current[which] = setTimeout(() => {
      geocodeAddress(address, which, true);
    }, 800);
  };

  const selectSuggestion = (suggestion, which) => {
    setForm((f) => ({
      ...f,
      [`${which}_address`]: suggestion.display_name,
      [`${which}_lat`]: parseFloat(suggestion.lat).toFixed(6),
      [`${which}_lng`]: parseFloat(suggestion.lon).toFixed(6),
      [`${which}_label`]: suggestion.display_name,
    }));
    setSuggestions([]);
    setSuggestFor(null);
    setFormError('');
  };

  const getLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const handleUseGps = async (which) => {
    setUseGps(which);
    const loc = await getLocation();
    setUseGps(null);
    if (loc) {
      setForm((f) => ({
        ...f,
        [which === 'start' ? 'start_address' : 'end_address']: '📍 Current Location',
        [which === 'start' ? 'start_lat' : 'end_lat']: loc.lat.toFixed(6),
        [which === 'start' ? 'start_lng' : 'end_lng']: loc.lng.toFixed(6),
        [which === 'start' ? 'start_label' : 'end_label']: '📍 Current Location',
      }));
    }
  };

  const handleAdd = async () => {
    const slat = parseFloat(form.start_lat);
    const slng = parseFloat(form.start_lng);
    const elat = parseFloat(form.end_lat);
    const elng = parseFloat(form.end_lng);
    
    if (!form.name) {
      setFormError('Please enter a route name');
      return;
    }
    if (!form.start_address || isNaN(slat) || isNaN(slng)) {
      setFormError('Please enter and select a valid start address');
      return;
    }
    if (!form.end_address || isNaN(elat) || isNaN(elng)) {
      setFormError('Please enter and select a valid end address');
      return;
    }
    setFormError('');

    await base44.entities.UserRoute.create({
      name: form.name,
      start_lat: slat,
      start_lng: slng,
      start_label: form.start_label,
      end_lat: elat,
      end_lng: elng,
      end_label: form.end_label,
      commute_hour: form.commute_hour ? parseInt(form.commute_hour) : undefined,
    });
    setForm({ name: '', start_address: '', start_lat: '', start_lng: '', start_label: '', end_address: '', end_lat: '', end_lng: '', end_label: '', commute_hour: '' });
    setAdding(false);
    loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.UserRoute.delete(id);
    setSelectedRoute(null);
    setNearbyPotholes([]);
    loadData();
  };

  const checkRoute = async (route) => {
    setSelectedRoute(route);
    setRouteAnalysis(null);
    setShowAlt(false);
    
    // Fetch real road route from OSRM
    if (!routePaths[route.id]) {
      setLoadingRoutePath(route.id);
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${route.start_lng},${route.start_lat};${route.end_lng},${route.end_lat}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl, { headers: { 'User-Agent': 'PotholePing/1.0' } });
        if (!res.ok) throw new Error(`OSRM returned ${res.status}`);
        const data = await res.json();
        if (data.routes?.length) {
          const pathCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRoutePaths(prev => ({ ...prev, [route.id]: pathCoords }));
          // Find nearby potholes using the actual road path
          const nearby = potholes.filter((p) => {
            const path = pathCoords;
            let minDist = Infinity;
            for (let i = 0; i < path.length - 1; i++) {
              const d = pointToSegmentDist(
                Number(p.latitude), Number(p.longitude),
                path[i][0], path[i][1],
                path[i+1][0], path[i+1][1]
              );
              if (d < minDist) minDist = d;
            }
            return minDist <= ALERT_RADIUS_FT;
          });
          setNearbyPotholes(nearby);
        }
      } catch (e) {
        console.warn('OSRM route fetch failed, using straight-line fallback', e.message);
        // Fall back to straight-line proximity check
        const nearby = potholes.filter((p) => {
          const d = pointToSegmentDist(
            Number(p.latitude), Number(p.longitude),
            route.start_lat, route.start_lng,
            route.end_lat, route.end_lng
          );
          return d <= ALERT_RADIUS_FT;
        });
        setNearbyPotholes(nearby);
      }
      setLoadingRoutePath(null);
    } else {
      // Already have the path, just recalculate potholes
      const path = routePaths[route.id];
      const nearby = potholes.filter((p) => {
        let minDist = Infinity;
        for (let i = 0; i < path.length - 1; i++) {
          const d = pointToSegmentDist(
            Number(p.latitude), Number(p.longitude),
            path[i][0], path[i][1],
            path[i+1][0], path[i+1][1]
          );
          if (d < minDist) minDist = d;
        }
        return minDist <= ALERT_RADIUS_FT;
      });
      setNearbyPotholes(nearby);
    }
  };

  const analyzeRoute = async (route) => {
    setAnalyzing(route.id);
    setRouteAnalysis(null);
    setShowAlt(false);
    try {
      const res = await base44.functions.invoke('analyzeRoute', {
        start_lat: route.start_lat,
        start_lng: route.start_lng,
        end_lat: route.end_lat,
        end_lng: route.end_lng,
      });
      setRouteAnalysis(res.data);
    } catch (e) {
      console.error('Route analysis failed', e);
    }
    setAnalyzing(false);
  };

  const totalAlerts = routes.reduce((sum, r) => {
    return sum + potholes.filter((p) => {
      const d = pointToSegmentDist(
        Number(p.latitude), Number(p.longitude),
        r.start_lat, r.start_lng,
        r.end_lat, r.end_lng
      );
      return d <= ALERT_RADIUS_FT;
    }).length;
  }, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <Link to="/" className="p-1 -ml-1 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-primary" />
          <h1 className="font-heading font-bold text-lg">Commute Saver</h1>
        </div>
        {totalAlerts > 0 && (
          <Badge className="ml-auto bg-red-500 text-white">{totalAlerts} alerts</Badge>
        )}
      </header>

      <PullToRefresh onRefresh={loadData} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 pb-20 sm:pb-4 space-y-4">
          {/* Info banner */}
          <div className="bg-accent border rounded-xl p-4 flex items-start gap-3">
            <Bell className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-accent-foreground">Save your routes</p>
              <p className="text-xs text-accent-foreground/80 mt-0.5">
                We'll check for potholes within 300ft of your commute and alert you before you hit the road.
              </p>
            </div>
          </div>

          {/* Add route form */}
          {adding && (
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <h2 className="font-heading font-semibold text-sm">New Route</h2>
              <Input
                placeholder="Route name (e.g. Work Commute)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <select
                  value={form.commute_hour}
                  onChange={(e) => setForm({ ...form, commute_hour: e.target.value })}
                  className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">No pre-trip alert</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i % 12 || 12) + ':00 ' + (i < 12 ? 'AM' : 'PM')}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Start</p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Address or intersection"
                      value={form.start_address}
                      onChange={(e) => { setForm({ ...form, start_address: e.target.value, start_lat: '', start_lng: '', start_label: '' }); debouncedSuggest(e.target.value, 'start'); }}
                      onBlur={() => { if (!form.start_lat) geocodeAddress(form.start_address, 'start'); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') geocodeAddress(form.start_address, 'start'); }}
                      className="pl-8 text-sm"
                    />
                    {geocoding === 'start' && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    {suggestFor === 'start' && suggestions.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {suggestions.map((s, i) => (
                          <button key={i} onClick={() => selectSuggestion(s, 'start')} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b last:border-b-0">
                            {s.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {form.start_lat && (
                    <p className="text-[10px] text-muted-foreground truncate">📍 {form.start_label ? form.start_label.substring(0, 60) : `${form.start_lat}, ${form.start_lng}`}</p>
                  )}
                  <button onClick={() => handleUseGps('start')} disabled={!!useGps} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> {useGps === 'start' ? 'Getting location...' : 'Use my current location'}
                  </button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">End</p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Address or intersection"
                      value={form.end_address}
                      onChange={(e) => { setForm({ ...form, end_address: e.target.value, end_lat: '', end_lng: '', end_label: '' }); debouncedSuggest(e.target.value, 'end'); }}
                      onBlur={() => { if (!form.end_lat) geocodeAddress(form.end_address, 'end'); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') geocodeAddress(form.end_address, 'end'); }}
                      className="pl-8 text-sm"
                    />
                    {geocoding === 'end' && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    {suggestFor === 'end' && suggestions.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {suggestions.map((s, i) => (
                          <button key={i} onClick={() => selectSuggestion(s, 'end')} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b last:border-b-0">
                            {s.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {form.end_lat && (
                    <p className="text-[10px] text-muted-foreground truncate">📍 {form.end_label ? form.end_label.substring(0, 60) : `${form.end_lat}, ${form.end_lng}`}</p>
                  )}
                  <button onClick={() => handleUseGps('end')} disabled={!!useGps} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> {useGps === 'end' ? 'Getting location...' : 'Use my current location'}
                  </button>
                </div>
              </div>
              {formError && (
                <p className="text-xs text-red-500 font-medium">{formError}</p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleAdd} size="sm" className="flex-1" disabled={!!geocoding}>
                  {geocoding ? <>Geocoding <Loader2 className="w-3 h-3 animate-spin ml-1" /></> : 'Save Route'}
                </Button>
                <Button onClick={() => { setAdding(false); setFormError(''); }} variant="outline" size="sm">Cancel</Button>
              </div>
            </div>
          )}

          {/* Route list */}
          {routes.length === 0 && !adding ? (
            <div className="text-center py-12">
              <Route className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="font-heading font-semibold">No routes saved</p>
              <p className="text-sm text-muted-foreground mt-1">Save your daily commute to get pothole alerts</p>
              <Button onClick={() => setAdding(true)} className="mt-4 gap-2">
                <Plus className="w-4 h-4" /> Add Route
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-semibold text-sm">Your Routes</h2>
                <Button onClick={() => setAdding(true)} size="sm" variant="outline" className="gap-1">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>

              {routes.map((r) => {
                const alertCount = potholes.filter((p) => {
                  const d = pointToSegmentDist(
                    Number(p.latitude), Number(p.longitude),
                    r.start_lat, r.start_lng,
                    r.end_lat, r.end_lng
                  );
                  return d <= ALERT_RADIUS_FT;
                }).length;

                return (
                  <div key={r.id} className="bg-card border rounded-xl overflow-hidden">
                    <button
                      onClick={() => checkRoute(r)}
                      className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Route className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">{r.name}</span>
                        </div>
                        {alertCount > 0 ? (
                          <Badge className="bg-red-500 text-white text-xs">{alertCount} potholes</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Clear</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[40%]">{r.start_label === '📍 Current Location' ? 'Current Location' : r.start_label || `${r.start_lat?.toFixed(4)}, ${r.start_lng?.toFixed(4)}`}</span>
                        <span>→</span>
                        <span className="truncate max-w-[40%]">{r.end_label === '📍 Current Location' ? 'Current Location' : r.end_label || `${r.end_lat?.toFixed(4)}, ${r.end_lng?.toFixed(4)}`}</span>
                      </div>
                    </button>

                    {selectedRoute?.id === r.id && (
                      <div className="border-t p-3 space-y-3">
                        {loadingRoutePath === r.id && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" /> Loading road route...
                          </div>
                        )}
                        {!loadingRoutePath && selectedRoute?.id === r.id && !routePaths[r.id] && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AlertTriangle className="w-3 h-3" /> Showing approximate straight-line route
                          </div>
                        )}
                        {/* Mini map */}
                        <div className="h-48 rounded-lg overflow-hidden">
                          <MapContainer
                            center={[(r.start_lat + r.end_lat) / 2, (r.start_lng + r.end_lng) / 2]}
                            zoom={13}
                            className="w-full h-full"
                            zoomControl={false}
                          >
                            <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {!showAlt || !routeAnalysis?.alternate ? (
                              <Polyline
                                positions={routePaths[r.id] || [[r.start_lat, r.start_lng], [r.end_lat, r.end_lng]]}
                                color="#f97316"
                                weight={3}
                                opacity={routePaths[r.id] ? 1 : 0.6}
                                dashArray={routePaths[r.id] ? undefined : '8 6'}
                              />
                            ) : (
                              <>
                                <Polyline
                                  positions={routeAnalysis.direct.geometry ? routeAnalysis.direct.geometry.coordinates.map(c => [c[1], c[0]]) : (routePaths[r.id] || [[r.start_lat, r.start_lng], [r.end_lat, r.end_lng]])}
                                  color="#f97316" weight={2} opacity={0.4} dashArray="8 8"
                                />
                                <Polyline positions={routeAnalysis.alternate.geometry.coordinates.map(c => [c[1], c[0]])} color="#22c55e" weight={3} />
                                <Marker position={[routeAnalysis.alternate.waypoint.lat, routeAnalysis.alternate.waypoint.lng]} icon={L.divIcon({ html: '<div style="width:14px;height:14px;background:#22c55e;border:2px solid white;border-radius:50%;"></div>', iconSize: [14, 14], iconAnchor: [7, 7] })} />
                              </>
                            )}
                            <Marker position={[r.start_lat, r.start_lng]} icon={L.divIcon({ html: '<div style="width:12px;height:12px;background:#22c55e;border:2px solid white;border-radius:50%;"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })} />
                            <Marker position={[r.end_lat, r.end_lng]} icon={L.divIcon({ html: '<div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%;"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })} />
                            {(routeAnalysis?.potholes || nearbyPotholes)
                              .filter((p) => !isNaN(p.latitude) && !isNaN(p.longitude))
                              .map((p) => (
                                <Marker
                                  key={p.id}
                                  position={[Number(p.latitude), Number(p.longitude)]}
                                  icon={L.divIcon({
                                    html: `<div style="width:10px;height:10px;background:${p.severity === 'dangerous' ? '#b91c1c' : p.severity === 'severe' ? '#ef4444' : '#f97316'};border:2px solid white;border-radius:50%;"></div>`,
                                    iconSize: [10, 10],
                                    iconAnchor: [5, 5],
                                  })}
                                />
                              ))}
                            <FitBounds positions={showAlt && routeAnalysis?.alternate ? routeAnalysis.alternate.geometry.coordinates.map(c => [c[1], c[0]]) : (routePaths[r.id] ? [...routePaths[r.id], ...nearbyPotholes.map((p) => [Number(p.latitude), Number(p.longitude)])] : [[r.start_lat, r.start_lng], [r.end_lat, r.end_lng], ...nearbyPotholes.map((p) => [Number(p.latitude), Number(p.longitude)])])} />
                          </MapContainer>
                        </div>

                        {/* Route summary */}
                        {!routeAnalysis ? (
                          <div className="space-y-2">
                            {nearbyPotholes.length > 0 ? (
                              <p className="text-sm font-semibold text-red-600 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" /> ~{nearbyPotholes.length} potholes within {ALERT_RADIUS_FT}ft of your route
                              </p>
                            ) : (
                              <p className="text-sm text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" /> Route appears clear!
                              </p>
                            )}
                            {nearbyPotholes.length > 0 && (
                              <Button onClick={() => analyzeRoute(r)} disabled={!!analyzing} size="sm" className="w-full gap-2" variant="outline">
                                {analyzing === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                                {analyzing === r.id ? 'Finding alternate route...' : 'Find Pothole-Free Route'}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Direct route card */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-red-700">Direct Route</span>
                                <span className="text-xs text-red-600">{routeAnalysis.direct.distance_miles} mi • {routeAnalysis.direct.duration_minutes} min</span>
                              </div>
                              {routeAnalysis.pothole_count > 0 && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> {routeAnalysis.pothole_count} pothole{routeAnalysis.pothole_count !== 1 ? 's' : ''} along route
                                </p>
                              )}
                            </div>

                            {/* Alternate route card */}
                            {routeAnalysis.alternate ? (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-green-700 flex items-center gap-1">
                                    <Shuffle className="w-3.5 h-3.5" /> Pothole-Free Route
                                  </span>
                                  <span className="text-xs text-green-600">{routeAnalysis.alternate.distance_miles} mi • {routeAnalysis.alternate.duration_minutes} min</span>
                                </div>
                                <p className="text-xs text-green-600 mt-1">
                                  Only {routeAnalysis.alternate.extra_minutes} extra minute{routeAnalysis.alternate.extra_minutes !== 1 ? 's' : ''} — zero reported potholes
                                </p>
                                <Button
                                  onClick={() => setShowAlt(!showAlt)}
                                  size="sm"
                                  variant={showAlt ? 'outline' : 'default'}
                                  className="mt-2 w-full gap-1 text-xs"
                                >
                                  <Shuffle className="w-3 h-3" />
                                  {showAlt ? 'Show Direct Route' : 'Show on Map'}
                                </Button>
                              </div>
                            ) : routeAnalysis.pothole_count === 0 ? (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm text-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" /> No potholes found on this route!
                                </p>
                              </div>
                            ) : (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <p className="text-xs text-amber-600">Alternate pothole-free route could not be calculated for this path.</p>
                              </div>
                            )}

                            {/* Pothole list */}
                            {routeAnalysis.potholes?.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">Potholes on route:</p>
                                {routeAnalysis.potholes.map((p) => (
                                  <Link key={p.id} to={`/pothole/${p.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors border">
                                    <Badge className={`capitalize text-[10px] ${severityBadge[p.severity] || ''}`}>{p.severity}</Badge>
                                    <span className="text-xs flex-1 truncate">{p.address || 'Unknown'}</span>
                                    <span className="text-xs text-muted-foreground">{p.distance_ft}ft</span>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          {r.commute_hour != null && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Clock className="w-3 h-3" /> Alert at {String(r.commute_hour % 12 || 12)}:00 {r.commute_hour < 12 ? 'AM' : 'PM'}
                            </Badge>
                          )}
                        </div>

                        <Button onClick={() => handleDelete(r.id)} variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50">
                          <Trash2 className="w-4 h-4 mr-1" /> Delete Route
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}