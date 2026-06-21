import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Route, Plus, Trash2, AlertTriangle, CheckCircle, MapPin, Navigation, Bell, Loader2, Shuffle, Clock } from 'lucide-react';
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
  const [form, setForm] = useState({ name: '', start_lat: '', start_lng: '', start_label: '', end_lat: '', end_lng: '', end_label: '', commute_hour: '' });
  const [useGps, setUseGps] = useState(null);
  const [analyzing, setAnalyzing] = useState(null); // route id being analyzed
  const [routeAnalysis, setRouteAnalysis] = useState(null); // { direct, potholes, alternate }
  const [showAlt, setShowAlt] = useState(false);
  const mapRef = useRef();

  useEffect(() => {
    loadData();
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [r, p] = await Promise.all([
      base44.entities.UserRoute.list('-created_date', 50),
      base44.entities.PotholeReport.filter({ status: { $in: ['reported', 'acknowledged', 'in_progress'] } }, '-created_date', 500),
    ]);
    setRoutes(r);
    setPotholes(p);
    setLoading(false);
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
    if (!form.name || isNaN(slat) || isNaN(slng) || isNaN(elat) || isNaN(elng)) return;

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
    setForm({ name: '', start_lat: '', start_lng: '', start_label: '', end_lat: '', end_lng: '', end_label: '', commute_hour: '' });
    setAdding(false);
    loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.UserRoute.delete(id);
    setSelectedRoute(null);
    setNearbyPotholes([]);
    loadData();
  };

  const checkRoute = (route) => {
    setSelectedRoute(route);
    const nearby = potholes.filter((p) => {
      const d = pointToSegmentDist(
        Number(p.latitude), Number(p.longitude),
        route.start_lat, route.start_lng,
        route.end_lat, route.end_lng
      );
      return d <= ALERT_RADIUS_FT;
    });
    setNearbyPotholes(nearby);
    setRouteAnalysis(null);
    setShowAlt(false);
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
                  <Input placeholder="Label" value={form.start_label} onChange={(e) => setForm({ ...form, start_label: e.target.value })} />
                  <Input placeholder="Latitude" value={form.start_lat} onChange={(e) => setForm({ ...form, start_lat: e.target.value })} type="number" step="any" />
                  <Input placeholder="Longitude" value={form.start_lng} onChange={(e) => setForm({ ...form, start_lng: e.target.value })} type="number" step="any" />
                  <button onClick={() => handleUseGps('start')} disabled={!!useGps} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> {useGps === 'start' ? 'Getting...' : 'Use my location'}
                  </button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">End</p>
                  <Input placeholder="Label" value={form.end_label} onChange={(e) => setForm({ ...form, end_label: e.target.value })} />
                  <Input placeholder="Latitude" value={form.end_lat} onChange={(e) => setForm({ ...form, end_lat: e.target.value })} type="number" step="any" />
                  <Input placeholder="Longitude" value={form.end_lng} onChange={(e) => setForm({ ...form, end_lng: e.target.value })} type="number" step="any" />
                  <button onClick={() => handleUseGps('end')} disabled={!!useGps} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> {useGps === 'end' ? 'Getting...' : 'Use my location'}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} size="sm" className="flex-1">Save Route</Button>
                <Button onClick={() => setAdding(false)} variant="outline" size="sm">Cancel</Button>
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
                        {r.start_label || `${r.start_lat?.toFixed(4)}, ${r.start_lng?.toFixed(4)}`}
                        <span>→</span>
                        {r.end_label || `${r.end_lat?.toFixed(4)}, ${r.end_lng?.toFixed(4)}`}
                      </div>
                    </button>

                    {selectedRoute?.id === r.id && (
                      <div className="border-t p-3 space-y-3">
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
                              <Polyline positions={[[r.start_lat, r.start_lng], [r.end_lat, r.end_lng]]} color="#f97316" weight={3} />
                            ) : (
                              <>
                                <Polyline positions={[[r.start_lat, r.start_lng], [r.end_lat, r.end_lng]]} color="#f97316" weight={2} opacity={0.4} dashArray="8 8" />
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
                            <FitBounds positions={showAlt && routeAnalysis?.alternate ? routeAnalysis.alternate.geometry.coordinates.map(c => [c[1], c[0]]) : [[r.start_lat, r.start_lng], [r.end_lat, r.end_lng], ...nearbyPotholes.map((p) => [Number(p.latitude), Number(p.longitude)])]} />
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