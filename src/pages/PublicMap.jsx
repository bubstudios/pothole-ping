import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Code, Copy, Check } from 'lucide-react';
import moment from 'moment';

const severityColors = {
  minor: '#eab308',
  moderate: '#f97316',
  severe: '#ef4444',
  dangerous: '#b91c1c',
};

function createPotholeIcon(severity) {
  const color = severityColors[severity] || '#f97316';
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 24px; height: 24px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

export default function PublicMap() {
  const [potholes, setPotholes] = useState([]);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    base44.entities.PotholeReport.list('-created_date', 300).then(setPotholes);
  }, []);

  const active = potholes.filter((p) => p.status !== 'fixed');

  const embedCode = `<iframe src="${window.location.origin}/map" width="100%" height="500" style="border:0;border-radius:12px;" title="PotholePing Community Map"></iframe>`;

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b z-10 flex-shrink-0 safe-top">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-base leading-tight">PotholePing</h1>
            <p className="text-xs text-muted-foreground">{active.length} active potholes mapped</p>
          </div>
        </div>
      </header>

      <div className="flex-1 relative">
        <MapContainer
          center={[38.7, -90.3]}
          zoom={11}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {potholes
            .filter((p) => !isNaN(p.latitude) && !isNaN(p.longitude))
            .map((p) => (
              <Marker
                key={p.id}
                position={[Number(p.latitude), Number(p.longitude)]}
                icon={createPotholeIcon(p.severity)}
              >
                <Popup>
                  <div className="text-sm min-w-[180px]">
                    <p className="font-semibold">{p.address || 'Unknown location'}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-1">
                      {p.severity} · {p.status?.replace('_', ' ')}
                    </p>
                    {p.jurisdiction_name && (
                      <p className="text-xs mt-1">Managed by {p.jurisdiction_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Reported {moment(p.created_date).fromNow()}
                    </p>
                    {p.status !== 'fixed' && (
                      <p className="text-xs mt-2 text-primary font-medium">
                        Download PotholePing to report and track potholes in your area!
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/95 backdrop-blur border shadow-lg rounded-2xl px-5 py-3 text-center">
          <p className="text-sm font-heading font-semibold">PotholePing</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {active.length} potholes mapped by your community
          </p>
        </div>
      </div>

      <footer className="flex-shrink-0 py-2 px-4 bg-card border-t text-center text-xs text-muted-foreground flex items-center justify-between">
        <span>Public map — view only. Sign up to report and track potholes.</span>
        <button
          onClick={() => setShowEmbed(!showEmbed)}
          className="flex items-center gap-1 text-primary hover:underline text-xs"
        >
          <Code className="w-3.5 h-3.5" />
          {showEmbed ? 'Hide embed' : 'Embed map'}
        </button>
      </footer>

      {showEmbed && (
        <div className="flex-shrink-0 px-4 py-3 bg-muted border-t">
          <p className="text-xs font-medium mb-2">Embed this map on your website:</p>
          <div className="relative">
            <code className="block bg-card border rounded-lg p-3 text-xs whitespace-pre-wrap break-all font-mono text-muted-foreground">
              {embedCode}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(embedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="absolute top-2 right-2 p-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}