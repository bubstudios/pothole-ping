# PotholePing App — Complete Codebase

**Last Updated:** June 26, 2026  
**Framework:** React + Vite + Base44 BaaS  
**Stack:** Tailwind CSS, shadcn/ui, Leaflet, React Query, Stripe

---

## Table of Contents

1. [Configuration & Setup](#configuration--setup)
2. [Data Model (Entities)](#data-model-entities)
3. [Backend Functions](#backend-functions)
4. [Core Pages](#core-pages)
5. [Key Components](#key-components)
6. [Architecture Overview](#architecture-overview)

---

## Configuration & Setup

### vite.config.js
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
});
```

### main.jsx
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'
import App from '@/App.jsx'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

### lib/query-client.js
```javascript
import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});
```

### api/base44Client.js
```javascript
import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

console.log('[base44Client] appParams:', { appId, hasToken: !!token, functionsVersion, appBaseUrl });

let clientInstance = null;

//Create a client with authentication required
try {
  clientInstance = createClient({
    appId: appId || 'unknown',
    token,
    functionsVersion,
    serverUrl: '',
    requiresAuth: false,
    appBaseUrl,
  });
} catch (e) {
  console.error('[base44Client] createClient failed:', e);
  clientInstance = { auth: { me: () => Promise.reject(e) }, entities: {}, integrations: {} };
}

export const base44 = clientInstance;
```

### lib/AuthContext.jsx
```javascript
import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      const headers = { 'X-App-Id': appParams.appId };
      if (appParams.token) {
        headers['Authorization'] = `Bearer ${appParams.token}`;
      }
      
      try {
        const res = await fetch(`/api/apps/public/prod/public-settings/by-id/${appParams.appId}`, { headers });
        
        if (!res.ok) {
          let errorData = null;
          try { errorData = await res.json(); } catch (_) {}
          const reason = errorData?.extra_data?.reason;
          
          if (res.status === 403 && reason === 'auth_required') {
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
          } else if (res.status === 403 && reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          } else {
            setAuthError({ type: 'unknown', message: `Failed to load app (${res.status})` });
          }
          setIsLoadingPublicSettings(false);
          setIsLoadingAuth(false);
          return;
        }
        
        const publicSettings = await res.json();
        setAppPublicSettings(publicSettings);
        
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        setAuthError({
          type: 'unknown',
          message: appError.message || 'Failed to load app'
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

---

## Data Model (Entities)

### PotholeReport
Primary entity for pothole reports with location, severity, jurisdiction lookup, and submission tracking.

```json
{
  "name": "PotholeReport",
  "type": "object",
  "properties": {
    "latitude": { "type": "number" },
    "longitude": { "type": "number" },
    "address": { "type": "string" },
    "description": { "type": "string" },
    "severity": {
      "type": "string",
      "enum": ["minor", "moderate", "severe", "dangerous"],
      "default": "moderate"
    },
    "status": {
      "type": "string",
      "enum": ["reported", "acknowledged", "in_progress", "fixed", "disputed"],
      "default": "reported"
    },
    "jurisdiction_name": { "type": "string" },
    "jurisdiction_type": {
      "type": "string",
      "enum": ["city", "county", "state", "federal", "unknown"],
      "default": "unknown"
    },
    "jurisdiction_phone": { "type": "string" },
    "jurisdiction_website": { "type": "string" },
    "jurisdiction_details": { "type": "string" },
    "photo_url": { "type": "string" },
    "upvotes": { "type": "number", "default": 0 },
    "last_confirmed_date": { "type": "string" },
    "fixed_by": { "type": "string" },
    "disputed_by": { "type": "string" },
    "submission_status": {
      "type": "string",
      "enum": ["none", "email_sent", "open311_submitted", "open311_acknowledged", "open311_closed", "failed"],
      "default": "none"
    },
    "submission_email": { "type": "string" },
    "open311_endpoint": { "type": "string" },
    "open311_service_code": { "type": "string" },
    "submission_details": { "type": "string" },
    "last_reminded_date": { "type": "string" }
  },
  "required": ["latitude", "longitude"],
  "rls": {
    "create": { "user_condition": { "role": "user" } },
    "read": {},
    "update": {
      "$or": [
        { "created_by_id": "{{user.id}}" },
        { "user_condition": { "role": "admin" } }
      ]
    },
    "delete": {
      "$or": [
        { "created_by_id": "{{user.id}}" },
        { "user_condition": { "role": "admin" } }
      ]
    }
  }
}
```

### UserReputation
Tracks user karma and participation metrics.

```json
{
  "name": "UserReputation",
  "type": "object",
  "properties": {
    "karma": { "type": "number", "default": 0 },
    "reports_count": { "type": "number", "default": 0 },
    "confirmations_given": { "type": "number", "default": 0 },
    "fixes_marked": { "type": "number", "default": 0 },
    "fixes_disputed": { "type": "number", "default": 0 }
  },
  "required": []
}
```

### UserRoute
Saved commute routes with GPS coordinates and pre-trip alert hours.

```json
{
  "name": "UserRoute",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "start_lat": { "type": "number" },
    "start_lng": { "type": "number" },
    "start_label": { "type": "string" },
    "end_lat": { "type": "number" },
    "end_lng": { "type": "number" },
    "end_label": { "type": "string" },
    "is_active": { "type": "boolean", "default": true },
    "commute_hour": { "type": "number", "minimum": 0, "maximum": 23 }
  },
  "required": ["name", "start_lat", "start_lng", "end_lat", "end_lng"]
}
```

### PotholeAvoidance
Tracks avoided pothole encounters with estimated repair cost savings.

```json
{
  "name": "PotholeAvoidance",
  "type": "object",
  "properties": {
    "pothole_id": { "type": "string" },
    "distance_meters": { "type": "number" },
    "estimated_savings": { "type": "number" },
    "severity": {
      "type": "string",
      "enum": ["minor", "moderate", "severe", "dangerous"]
    }
  },
  "required": ["pothole_id", "estimated_savings"]
}
```

### VehicleDamage
Damage claims associated with potholes.

```json
{
  "name": "VehicleDamage",
  "type": "object",
  "properties": {
    "pothole_id": { "type": "string" },
    "damage_type": {
      "type": "string",
      "enum": ["tire", "rim", "alignment", "suspension", "body", "other"]
    },
    "cost_estimate": { "type": "number" },
    "description": { "type": "string" },
    "photo_url": { "type": "string" },
    "damage_date": { "type": "string" },
    "claim_status": {
      "type": "string",
      "enum": ["none", "packet_generated", "filed", "reimbursed", "denied"],
      "default": "none"
    }
  },
  "required": ["pothole_id", "damage_type", "cost_estimate"]
}
```

### WatchZone
Geographic zones for neighborhood-based notifications.

```json
{
  "name": "WatchZone",
  "type": "object",
  "properties": {
    "zip_code": { "type": "string" },
    "city": { "type": "string" },
    "state": { "type": "string" },
    "member_count": { "type": "number", "default": 0 }
  },
  "required": ["zip_code"]
}
```

### SponsoredBusiness
Auto repair shops and services for damage claims.

```json
{
  "name": "SponsoredBusiness",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "category": {
      "type": "string",
      "enum": ["tire_shop", "alignment", "auto_repair", "towing", "auto_body", "insurance", "other"]
    },
    "phone": { "type": "string" },
    "email": { "type": "string" },
    "website": { "type": "string" },
    "address": { "type": "string" },
    "latitude": { "type": "number" },
    "longitude": { "type": "number" },
    "description": { "type": "string" },
    "discount_text": { "type": "string" },
    "is_active": { "type": "boolean", "default": true },
    "priority": { "type": "number", "default": 0 }
  },
  "required": ["name", "category", "phone", "latitude", "longitude"]
}
```

---

## Backend Functions

### analyzeRoute.js
OSRM-based route analysis with pothole detection and alternate route generation.

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALERT_RADIUS_FT = 300;
const FEET_PER_METER = 3.28084;

function distanceFt(lat1, lng1, lat2, lng2) {
  const R = 20903520;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentDistFt(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distanceFt(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distanceFt(px, py, x1 + t * dx, y1 + t * dy);
}

async function getOSRMRoute(lng1, lat1, lng2, lat2) {
  const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes?.length) return null;

  const steps = (data.routes[0].legs?.[0]?.steps || []).map(s => ({
    distance: s.distance,
    duration: s.duration,
    name: s.name || '',
    maneuver: s.maneuver ? { type: s.maneuver.type, modifier: s.maneuver.modifier } : null,
    coordinates: s.geometry?.coordinates?.map(c => [c[1], c[0]]) || [],
  }));

  return {
    distanceMeters: data.routes[0].distance,
    durationSeconds: data.routes[0].duration,
    geometry: data.routes[0].geometry,
    steps,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { start_lat, start_lng, end_lat, end_lng } = body;

    if (!start_lat || !start_lng || !end_lat || !end_lng) {
      return Response.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    // Get direct route
    const directRoute = await getOSRMRoute(start_lng, start_lat, end_lng, end_lat);
    if (!directRoute) return Response.json({ error: 'No route found' }, { status: 404 });

    // Fetch all active potholes
    const potholes = await base44.asServiceRole.entities.PotholeReport.filter(
      { status: { $in: ['reported', 'acknowledged', 'in_progress'] } },
      '-created_date',
      200
    );

    // Find potholes on route
    const onRoute = [];
    const coords = directRoute.geometry.coordinates;
    for (const p of potholes) {
      const plat = Number(p.latitude);
      const plng = Number(p.longitude);
      if (isNaN(plat) || isNaN(plng)) continue;

      let minDist = Infinity;
      for (let i = 0; i < coords.length - 1; i++) {
        const d = pointToSegmentDistFt(plat, plng, coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
        if (d < minDist) minDist = d;
      }

      if (minDist <= ALERT_RADIUS_FT) {
        onRoute.push({ id: p.id, latitude: plat, longitude: plng, severity: p.severity, address: p.address, distance_ft: Math.round(minDist) });
      }
    }

    // Generate alternate route that avoids potholes
    let alternateRoute = null;
    if (onRoute.length > 0) {
      // Pothole center calculation and alternate routing logic...
      // (See full function in codebase for complete implementation)
    }

    const result = {
      direct: {
        distance_miles: Math.round(directRoute.distanceMeters / 1609.34 * 10) / 10,
        duration_minutes: Math.round(directRoute.durationSeconds / 60),
        geometry: directRoute.geometry,
        steps: directRoute.steps || [],
      },
      potholes: onRoute,
      pothole_count: onRoute.length,
    };

    if (alternateRoute) {
      const timeDiff = alternateRoute.durationSeconds - directRoute.durationSeconds;
      result.alternate = {
        distance_miles: Math.round(alternateRoute.distanceMeters / 1609.34 * 10) / 10,
        duration_minutes: Math.round(alternateRoute.durationSeconds / 60),
        extra_minutes: Math.round(timeDiff / 60),
        geometry: alternateRoute.geometry,
        waypoint: alternateRoute.waypoint,
        steps: alternateRoute.steps || [],
        pothole_free: true,
      };
    }

    return Response.json(result);
  } catch (error) {
    console.error('analyzeRoute error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

### submitPotholeReport.js
Automated submission to jurisdiction via email and Open311 API.

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportId } = await req.json();
    if (!reportId) return Response.json({ error: 'reportId required' }, { status: 400 });

    const report = await base44.entities.PotholeReport.get(reportId);
    if (!report) return Response.json({ error: 'Report not found' }, { status: 404 });

    const results = { email: null, open311: null };

    // Email submission
    if (report.submission_email) {
      try {
        const body = [
          `POTHOLE REPORT — Please Fix`,
          ``,
          `Location: ${report.address || `${report.latitude}, ${report.longitude}`}`,
          `Coordinates: ${report.latitude}, ${report.longitude}`,
          `Severity: ${report.severity?.toUpperCase()}`,
          `Description: ${report.description || 'No description provided'}`,
          `Photo: ${report.photo_url || 'None'}`,
          `Reported via: PotholePing app`,
          ``,
          `Google Maps: https://www.google.com/maps?q=${report.latitude},${report.longitude}`,
        ].join('\n');

        await base44.integrations.Core.SendEmail({
          to: report.submission_email,
          subject: `Pothole Report — ${report.address || 'Unnamed Location'} — ${report.severity?.toUpperCase()}`,
          body,
        });

        results.email = 'sent';
      } catch (e) {
        results.email = 'failed: ' + e.message;
      }
    }

    // Open311 submission
    if (report.open311_endpoint && report.open311_service_code) {
      try {
        const baseUrl = report.open311_endpoint.replace(/\/$/, '');
        const apiUrl = `${baseUrl}/requests.json`;

        const formData = new URLSearchParams();
        formData.append('service_code', report.open311_service_code);
        formData.append('lat', String(report.latitude));
        formData.append('long', String(report.longitude));
        formData.append('address_string', report.address || '');
        formData.append('description', [
          report.description || 'Pothole needs repair',
          `Severity: ${report.severity?.toUpperCase() || 'MODERATE'}`,
          `Reported via PotholePing`,
        ].filter(Boolean).join(' | '));
        if (report.photo_url) {
          formData.append('media_url', report.photo_url);
        }

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });

        if (res.ok) {
          const data = await res.json();
          const serviceRequestId = data?.[0]?.service_request_id || data?.service_request_id || 'unknown';
          results.open311 = { status: 'submitted', id: serviceRequestId };

          await base44.entities.PotholeReport.update(reportId, {
            submission_status: 'open311_submitted',
            submission_details: `Open311 request ${serviceRequestId} submitted to ${report.open311_endpoint}`,
          });
        } else {
          const errText = await res.text();
          results.open311 = { status: 'failed', error: errText };
        }
      } catch (e) {
        results.open311 = { status: 'failed', error: e.message };
      }
    }

    if (results.email === 'sent' && !results.open311) {
      await base44.entities.PotholeReport.update(reportId, {
        submission_status: 'email_sent',
        submission_details: `Email sent to ${report.submission_email}`,
      });
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

### createDonationCheckout.js
Stripe checkout for one-time and recurring donations.

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.25.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { amount, recurring, successUrl, cancelUrl, donorName, message } = await req.json();

    if (!amount || amount < 1) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const session = await stripe.checkout.sessions.create({
      mode: recurring ? 'subscription' : 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: recurring ? 'PotholePing Monthly' : 'PotholePing Donation',
            description: recurring
              ? `Monthly donation of $${amount} to support pothole-free roads`
              : `$${amount} donation to support PotholePing`,
          },
          unit_amount: amount * 100,
          ...(recurring ? { recurring: { interval: 'month' } } : {}),
        },
        quantity: 1,
      }],
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        ...(donorName ? { donor_name: donorName } : {}),
        ...(message ? { message } : {}),
      },
      success_url: successUrl || 'https://potholeping.com/donate?success=true',
      cancel_url: cancelUrl || 'https://potholeping.com/donate?canceled=true',
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

### sendWatchZoneNotifications.js
OneSignal push notifications for neighborhood watch zones.

```javascript
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { pothole_id, pothole_address, pothole_severity, zip_code } = body;

    if (!pothole_id || !zip_code) {
      return Response.json({ error: 'Missing pothole_id or zip_code' }, { status: 400 });
    }

    const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const appId = Deno.env.get('ONESIGNAL_APP_ID');

    if (!apiKey || !appId) {
      return Response.json({ error: 'OneSignal credentials not configured' }, { status: 500 });
    }

    const notificationPayload = {
      app_id: appId,
      include_external_user_ids: [`watch_zone_${zip_code}`],
      headings: { en: '🚨 New Pothole Report' },
      contents: { 
        en: `Pothole reported at ${pothole_address || 'your area'} (${pothole_severity} severity)` 
      },
      big_picture: 'https://cdn.onesignal.com/icons/alert.png',
      data: {
        pothole_id,
        zip_code,
        type: 'pothole_alert'
      }
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(apiKey)}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(notificationPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal error:', result);
      return Response.json({ error: 'Failed to send notification', details: result }, { status: 500 });
    }

    return Response.json({ success: true, notification_id: result.body?.notification_id });
  } catch (error) {
    console.error('sendWatchZoneNotifications error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

---

## Core Pages

### pages/Home.jsx
Main application hub with map view, pothole list, and voice reporting.

**Key Features:**
- Real-time pothole map with clustering and filtering
- Dual view: map and list
- Voice-based reporting with pending pins
- Jurisdiction lookup via LLM
- Proximity alerts for nearby potholes
- Savings widget tracking repair cost avoidance
- Watch zones integration
- Heatmap visualization of pothole density

### pages/PotholeDetailPage.jsx
Individual pothole detail view with upvoting, status updates, and community comments.

```javascript
// Full implementation in codebase
// Manages reputation scoring, fix marking, dispute handling
```

### pages/CommuteSaver.jsx
Route planning and commute pothole analysis with alternate routing.

**Key Features:**
- Saved route management
- Address geocoding with suggestions
- OSRM-based route analysis
- Alternate route generation to avoid potholes
- Mini-map preview of routes
- Turn-by-turn navigation integration
- Pre-trip alert scheduling

---

## Key Components

### components/map/PotholeMap.jsx
Leaflet-based interactive map with marker clustering, custom icons, and gesture handling.

```javascript
// Manages:
// - Marker clustering via react-leaflet-cluster
// - Custom severity-based icons
// - Voice pin placement and deletion
// - Map click events for new report placement
// - User location tracking (blue dot)
// - Follow-me mode with auto-pan
// - Real-time subscription updates
```

### components/map/CommuterRouteOverlay.jsx
Renders direct and alternate routes on the map with step-by-step navigation guidance.

```javascript
// Features:
// - Route polyline rendering
// - Waypoint markers
// - Bounds fitting for visual coverage
// - Navigation guide with turn-by-turn instructions
// - Follow route positioning
```

### components/pothole/ReportForm.jsx
Multi-step form for submitting new pothole reports.

```javascript
// Manages:
// - Severity selection (4-level scale)
// - Description input
// - Photo upload and preview
// - Jurisdiction display
// - Submit and cancel handlers
```

### components/pothole/VoiceReport.jsx
Web Speech API integration for hands-free reporting.

```javascript
// Features:
// - Wake word detection ("hey maps", etc.)
// - Automatic geolocation on voice trigger
// - Visual feedback (listening, processing states)
// - Fallback to manual button if permission denied
// - Background noise filtering
```

### components/pothole/ProximityAlert.jsx
GPS-based proximity detection with real-time pothole warnings.

```javascript
// Tracks:
// - User location via Geolocation API
// - Nearest potholes within range
// - Distance calculations
// - Visual/audio alerts
// - Avoidance logging for savings calculation
```

### components/map/HeatmapLayer.jsx
Custom canvas-based heatmap visualization for pothole density.

```javascript
// Renders:
// - Intensity-based gradients
// - Severity-based color coding
// - Temporal filtering (week, month, all)
// - Custom spatial indexing
```

---

## Architecture Overview

### Authentication Flow
1. App initializes → checks public settings
2. If token exists → validates user with `base44.auth.me()`
3. On failure → redirects to `/login`
4. AuthContext provides user state to all pages

### Report Submission Flow
1. User selects location on map (manual or voice)
2. Frontend calls LLM to lookup jurisdiction
3. Override system applies verified contact info
4. User completes form with photo and description
5. Report saved to database
6. Backend automation triggers `submitPotholeReport`
7. Notification sent to watch zone members
8. Email sent to reporter
9. Optional: Email/Open311 submission to agency

### Real-time Updates
- Entity subscriptions listen for changes via WebSocket
- Updates propagate to PotholeMap and lists automatically
- Comments and reputation changes sync in real-time

### Reputation System
- **Confirmations:** +2 karma, +1 confirmations_given
- **Fix marking:** +5 karma, +1 fixes_marked
- **Fix disputes:** +3 karma, -3 karma (fixer), +1 confirmations_given
- **Upvote weight:** karma-weighted (1x base + up to 2x multiplier)

### Stripe Integration
- Donation checkout via `createDonationCheckout`
- Webhook handling in `stripeWebhook`
- Metadata tracking for analytics

### Data Persistence
- All potholes, routes, watch zones stored in Base44 entities
- Pagination for large queries (30 records per batch)
- User-scoped queries respect RLS permissions
- Service role for admin operations

---

**Last Compiled:** June 26, 2026  
**Total Lines of Code:** ~8,000+  
**Key Dependencies:** React 18, Leaflet, Stripe, OneSignal, OSRM, Nominatim