import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, List, Map, Search, AlertTriangle, X, Trophy, Skull, Building2, Menu, MessageCircle, Bug, Camera, TrendingUp, Route, FileText, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import SupportButton from '@/components/SupportButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import MobileSelect from '@/components/ui/mobile-select';
import ErrorBoundary from '@/components/ErrorBoundary';
import PotholeMap from '@/components/map/PotholeMap';
import HeatmapLayer from '@/components/map/HeatmapLayer';
import CommuterRouteOverlay from '@/components/map/CommuterRouteOverlay';
import HeatmapControls from '@/components/map/HeatmapControls';
import ReportForm from '@/components/pothole/ReportForm';
import PotholeListItem from '@/components/pothole/PotholeListItem';
import RecentlyFixed from '@/components/pothole/RecentlyFixed';
import VoiceReport from '@/components/pothole/VoiceReport';
import ProximityAlert from '@/components/pothole/ProximityAlert';
import DuplicateWarning from '@/components/pothole/DuplicateWarning';
import DelayedReportPrompt from '@/components/pothole/DelayedReportPrompt';
import FeedbackModal from '@/components/FeedbackModal';
import PullToRefresh from '@/components/PullToRefresh';
import SavingsWidget, { SEVERITY_COSTS } from '@/components/pothole/SavingsWidget';
import OnboardingTour from '@/components/OnboardingTour';
import QuickConfirmSheet from '@/components/pothole/QuickConfirmSheet';
import { toast } from '@/components/ui/use-toast';

// Verified jurisdiction contact overrides — applied after LLM lookup
const JURISDICTION_OVERRIDES = [
  {
    match: 'Florissant',
    phone: '3148397652',
    email: 'jtimme@florissantmo.com',
  },
  {
    match: 'St. Louis County',
    phone: '3146158538',
    website: 'https://csportal.stlouiscountymo.gov',
  },
];

function applyJurisdictionOverrides(info) {
  if (!info?.jurisdiction_name) return info;
  const override = JURISDICTION_OVERRIDES.find(
    (o) => info.jurisdiction_name.toLowerCase().includes(o.match.toLowerCase())
  );
  if (override) {
    return {
      ...info,
      jurisdiction_phone: override.phone || info.jurisdiction_phone,
      submission_email: override.email || info.submission_email,
      jurisdiction_website: override.website || info.jurisdiction_website,
    };
  }
  return info;
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`geocode ${res.status}`);
    const data = await res.json();
    return data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch (e) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function lookupJurisdiction(lat, lng, address) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Find the responsible road maintenance authority for a pothole at this location:\nAddress: ${address}\nCoordinates: ${lat}, ${lng}\n\nDetermine:\n1. Whether this is inside a city/municipality, unincorporated county land, or on a state/federal highway\n2. The specific government entity responsible for road maintenance\n3. A phone number to call to report a pothole\n4. An email address where pothole/service requests can be submitted (public works, 311, or streets department)\n5. A website URL where residents can submit pothole or service requests online (like a 311 portal, SeeClickFix page, or public works form)\n6. If this jurisdiction has an Open311 API, provide the endpoint URL and the service code for pothole requests\n\nBe specific. For state highways, provide the state DOT number. For unincorporated areas, provide the county public works number. If no email or website is publicly listed, leave it empty. The website should be the direct submission/page URL, not just the homepage.`,
    add_context_from_internet: true,
    response_json_schema: {
     type: 'object',
     properties: {
       jurisdiction_name: { type: 'string' },
       jurisdiction_type: { type: 'string', enum: ['city', 'county', 'state', 'federal', 'unknown'] },
       jurisdiction_phone: { type: 'string' },
       jurisdiction_website: { type: 'string' },
       jurisdiction_details: { type: 'string' },
       submission_email: { type: 'string' },
       open311_endpoint: { type: 'string' },
       open311_service_code: { type: 'string' },
     },
    },
    model: 'gemini_3_flash',
  });
  return result;
}

export default function Home() {
  const navigate = useNavigate();
  const [potholes, setPotholes] = useState([]);
  const [potholeOffset, setPotholeOffset] = useState(0);
  const [hasMorePotholes, setHasMorePotholes] = useState(true);
  const [loadingMorePotholes, setLoadingMorePotholes] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  const [newPin, setNewPin] = useState(null);
  const [jurisdictionInfo, setJurisdictionInfo] = useState(null);
  const [isLoadingJurisdiction, setIsLoadingJurisdiction] = useState(false);
  const [view, setView] = useState('map');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flyToCenter, setFlyToCenter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFixed, setShowFixed] = useState(false);
  const [listSortBy, setListSortBy] = useState('newest');
  const [listSeverityFilter, setListSeverityFilter] = useState('all');
  const [mapStatusFilters, setMapStatusFilters] = useState({
    reported: true,
    acknowledged: true,
    in_progress: true,
    fixed: false,
    disputed: false,
  });
  const [mapSeverityFilters, setMapSeverityFilters] = useState({
    minor: true,
    moderate: true,
    severe: true,
    dangerous: true,
  });
  const [isVoiceListening, setIsVoiceListening] = useState(true);
  const [proximityAlertsOn, setProximityAlertsOn] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [dangerNearby, setDangerNearby] = useState(null);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapSeverity, setHeatmapSeverity] = useState('all');
  const [heatmapTimeRange, setHeatmapTimeRange] = useState('all');
  const [hotZonesEnabled, setHotZonesEnabled] = useState(false);
  const [duplicateCandidate, setDuplicateCandidate] = useState(null);
  const [duplicatePin, setDuplicatePin] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRep, setUserRep] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [quickConfirmPothole, setQuickConfirmPothole] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const [avoidanceCount, setAvoidanceCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [followUser, setFollowUser] = useState(true);
  const [commuterRouteData, setCommuterRouteData] = useState(null);
  const [pendingVoicePins, setPendingVoicePins] = useState(() => {
    try {
      const saved = localStorage.getItem('potholeping_voice_pins');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('potholeping_voice_pins', JSON.stringify(pendingVoicePins));
  }, [pendingVoicePins]);

  useEffect(() => {
    setPotholes([]);
    setPotholeOffset(0);
    setHasMorePotholes(true);
    loadPotholes(0);
    loadCurrentUser();
    // Real-time subscription to keep map in sync with detail page updates
    const unsub = base44.entities.PotholeReport.subscribe((event) => {
      if (event.type === 'update') {
        setPotholes(prev => prev.map(p => p.id === event.id ? { ...p, ...event.data } : p));
      } else if (event.type === 'create') {
        setPotholes(prev => [event.data, ...prev]);
      }
    });
    // Scroll-reset listener for BottomNav active-tab click
    const scrollHandler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', scrollHandler);
    return () => {
      unsub();
      window.removeEventListener('potholeping-scroll-reset', scrollHandler);
    };
  }, []);

  useEffect(() => {
    if (currentUser) loadAvoidances();
  }, [currentUser]);

  // Pick up commuter route from sessionStorage (set by Commute Saver's "Show on Map")
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('potholeping_commuter_route');
      if (raw) {
        setCommuterRouteData(JSON.parse(raw));
        sessionStorage.removeItem('potholeping_commuter_route');
      }
    } catch {}
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const reps = await base44.entities.UserReputation.filter({ created_by_id: user.id });
      setUserRep(reps[0] || null);
      // Check per-user onboarding — not browser-wide
      try {
        if (!localStorage.getItem(`potholeping_onboarded_${user.id}`)) {
          setShowOnboarding(true);
        }
      } catch {}
    } catch (e) {}
  };

  const getOrCreateRep = async () => {
    if (userRep) return userRep;
    if (!currentUser) return null;
    const rep = await base44.entities.UserReputation.create({ karma: 0, reports_count: 0, confirmations_given: 0, fixes_marked: 0, fixes_disputed: 0 });
    setUserRep(rep);
    return rep;
  };

  const getWeight = () => {
    const karma = userRep?.karma || 0;
    return 1 + Math.min(karma / 50, 1); // caps at 2x
  };

  const loadingPotholesRef = useRef(false);
  const lastPotholeLoadRef = useRef(0);

  const loadPotholes = async (offset = 0) => {
    if (offset === 0) {
      const now = Date.now();
      if (loadingPotholesRef.current || now - lastPotholeLoadRef.current < 5000) return;
    }
    loadingPotholesRef.current = true;
    try {
      const data = await base44.entities.PotholeReport.filter({}, '-created_date', 30, offset);
      if (offset === 0) {
        setPotholes(data);
        setHasMorePotholes(data.length === 30);
      } else {
        setPotholes(prev => [...prev, ...data]);
        setHasMorePotholes(data.length === 30);
      }
      setPotholeOffset(offset + 30);
    } finally {
      loadingPotholesRef.current = false;
      if (offset === 0) lastPotholeLoadRef.current = Date.now();
      setLoadingMorePotholes(false);
    }
  };

  const loadAvoidances = async () => {
    try {
      if (!currentUser) return;
      const data = await base44.entities.PotholeAvoidance.filter({ created_by_id: currentUser.id }, '-created_date', 100);
      const total = data.reduce((sum, a) => sum + (Number(a.estimated_savings) || 0), 0);
      setTotalSavings(total);
      setAvoidanceCount(data.length);
    } catch (e) {}
  };

  const handleAvoidance = async (pothole, distanceMeters) => {
    const savings = SEVERITY_COSTS[pothole.severity] || 150;
    try {
      await base44.entities.PotholeAvoidance.create({
        pothole_id: pothole.id,
        distance_meters: Math.round(distanceMeters),
        estimated_savings: savings,
        severity: pothole.severity,
      });
      setTotalSavings((prev) => prev + savings);
      setAvoidanceCount((prev) => prev + 1);
    } catch (e) {}
  };

  // Haversine distance in feet
  const distanceFt = (lat1, lng1, lat2, lng2) => {
    const R = 20903520; // Earth radius in feet
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const DUPE_THRESHOLD_FT = 100;

  const openReportAt = useCallback(async (lat, lng) => {
    // Duplicate check: is there an unfixed pothole within 50ft?
    const unfixed = potholes.filter((p) => p.status !== 'fixed');
    const nearby = unfixed.find((p) => distanceFt(lat, lng, Number(p.latitude), Number(p.longitude)) <= DUPE_THRESHOLD_FT);

    if (nearby) {
      setDuplicateCandidate(nearby);
      setDuplicatePin({ lat, lng });
      setNewPin(null);
      setSidebarOpen(true);
      setJurisdictionInfo(null);
      setIsLoadingJurisdiction(false);
      return;
    }

    const pin = { lat, lng };
    setNewPin(pin);
    setDuplicateCandidate(null);
    setSidebarOpen(true);
    setJurisdictionInfo(null);
    setIsLoadingJurisdiction(true);

    const address = await reverseGeocode(lat, lng);
    setJurisdictionInfo({ address });

    try {
      const info = await lookupJurisdiction(lat, lng, address);
      setJurisdictionInfo((prev) => ({ ...prev, ...applyJurisdictionOverrides(info) }));
    } catch (e) {}
    setIsLoadingJurisdiction(false);
  }, [potholes]);

  const handleMapClick = useCallback(async (latlng) => {
    if (!isDropping) return;
    setIsDropping(false);
    openReportAt(latlng.lat, latlng.lng);
  }, [isDropping, openReportAt]);

  const handleVoiceReport = useCallback((lat, lng) => {
    setIsDropping(false);
    setPendingVoicePins((prev) => [...prev, { lat, lng, time: Date.now() }]);
    setDuplicateCandidate(null);
    setSidebarOpen(false);
    setFlyToCenter([lat, lng]);
    setJurisdictionInfo(null);
    setIsLoadingJurisdiction(false);
  }, []);

  const handleNewPinClick = useCallback(() => {
    if (!newPin) return;
    setPendingVoicePins((prev) => prev.filter((p) => p.lat !== newPin.lat || p.lng !== newPin.lng));
    openReportAt(newPin.lat, newPin.lng);
  }, [newPin, openReportAt]);

  const handleSubmitReport = async ({ description, severity, photo_url }) => {
    const report = {
      latitude: newPin.lat,
      longitude: newPin.lng,
      description,
      severity,
      address: jurisdictionInfo?.address || '',
      jurisdiction_name: jurisdictionInfo?.jurisdiction_name || '',
      jurisdiction_type: jurisdictionInfo?.jurisdiction_type || 'unknown',
      jurisdiction_phone: jurisdictionInfo?.jurisdiction_phone || '',
      jurisdiction_website: jurisdictionInfo?.jurisdiction_website || '',
      jurisdiction_details: jurisdictionInfo?.jurisdiction_details || '',
      submission_email: jurisdictionInfo?.submission_email || '',
      open311_endpoint: jurisdictionInfo?.open311_endpoint || '',
      open311_service_code: jurisdictionInfo?.open311_service_code || '',
      photo_url: photo_url || '',
    };
    const created = await base44.entities.PotholeReport.create(report);
    try { await base44.entities.PotholeStatusEvent.create({ pothole_id: created.id, status: 'reported', note: 'Initially reported' }); } catch (e) {}
    setNewPin(null);
    setPendingVoicePins((prev) => prev.filter((p) => p.lat !== newPin.lat || p.lng !== newPin.lng));
    setJurisdictionInfo(null);
    setSidebarOpen(false);
    loadPotholes();
    // Navigate to the detail page so user can leave comments
    navigate(`/pothole/${created.id}`);

    // Auto-submit if any submission method is available
    if (jurisdictionInfo?.submission_email || jurisdictionInfo?.open311_endpoint) {
      try {
        await base44.functions.invoke('submitPotholeReport', { reportId: created.id });
        loadPotholes();
      } catch (e) {}
    }

    // Prompt for push notifications after first successful report
    window.__promptPush?.();

    // Send email receipt to the reporter
    if (currentUser?.email && jurisdictionInfo?.jurisdiction_name) {
      try {
        await base44.integrations.Core.SendEmail({
          to: currentUser.email,
          subject: `PotholePing: Report submitted to ${jurisdictionInfo.jurisdiction_name}`,
          body: `Thanks for reporting a ${severity} pothole!\n\nLocation: ${jurisdictionInfo.address || `${newPin.lat}, ${newPin.lng}`}\nSubmitted to: ${jurisdictionInfo.jurisdiction_name}\n\nYour report helps keep the community safe. Track its status anytime in the PotholePing app.\n\n— The PotholePing Team`,
        });
      } catch (e) {}
    }
  };

  const handleCancelReport = () => {
    setNewPin(null);
    setPendingVoicePins((prev) => prev.filter((p) => p.lat !== newPin?.lat || p.lng !== newPin?.lng));
    setJurisdictionInfo(null);
    setIsLoadingJurisdiction(false);
    setDuplicateCandidate(null);
    setDuplicatePin(null);
    setSidebarOpen(false);
  };

  const handlePotholeClick = (pothole) => {
    setNewPin(null);
    setIsDropping(false);
    setSidebarOpen(false);
    setFlyToCenter(null);
    setQuickConfirmPothole(pothole);
  };

  const handleUpvote = async (id, markFixed = false) => {
    const pothole = potholes.find((p) => p.id === id);
    if (!pothole) return;

    const weight = getWeight();
    const action = markFixed ? 'fixed' : (pothole.status === 'fixed' ? 'disputed' : 'confirm');

    // Block repeats — check if this user already performed this action on this pothole
    if (currentUser) {
      try {
        const existing = await base44.entities.PotholeConfirmation.filter({
          pothole_id: id,
          created_by_id: currentUser.id,
          action,
        });
        if (existing.length > 0) {
          toast({ title: 'You already confirmed this one.' });
          return;
        }
      } catch (e) {}
    }

    // Optimistic UI update — applied only after guard passes
    const optimisticUpdates = markFixed
      ? { status: 'fixed', fixed_by: currentUser?.id || '' }
      : pothole.status === 'fixed'
        ? { status: 'disputed', disputed_by: currentUser?.id || '' }
        : { upvotes: (Number(pothole.upvotes) || 0) + weight, last_confirmed_date: new Date().toISOString() };

    setPotholes(prev => prev.map(p => p.id === id ? { ...p, ...optimisticUpdates } : p));

    try {
      const rep = await getOrCreateRep();

      if (markFixed) {
        await base44.entities.PotholeReport.update(id, {
          status: 'fixed',
          fixed_by: currentUser?.id || '',
        });
        await base44.entities.PotholeConfirmation.create({ pothole_id: id, action });
        try { await base44.entities.PotholeStatusEvent.create({ pothole_id: id, status: 'fixed', note: 'Marked fixed by community' }); } catch (e) {}
        try { await base44.functions.invoke('notifyReportOwner', { reportId: id, newStatus: 'fixed' }); } catch (e) {}
        if (rep) {
          const fresh = (await base44.entities.UserReputation.filter({ id: rep.id }))[0] || rep;
          await base44.entities.UserReputation.update(fresh.id, {
            karma: (fresh.karma || 0) + 5,
            fixes_marked: (fresh.fixes_marked || 0) + 1,
          });
          setUserRep({ ...fresh, karma: (fresh.karma || 0) + 5, fixes_marked: (fresh.fixes_marked || 0) + 1 });
        }
        // Send thank-you email to the agency
        if (pothole.submission_email) {
          try {
            await base44.integrations.Core.SendEmail({
              to: pothole.submission_email,
              subject: `Thank you — Pothole fixed at ${pothole.address || `${pothole.latitude}, ${pothole.longitude}`}`,
              body: `The community has confirmed that the pothole at this location has been filled:\n\n${pothole.address || `${pothole.latitude}, ${pothole.longitude}`}\n\nThank you for your quick response and for keeping our roads safe!\n\n— PotholePing Community`,
            });
          } catch (e) {}
        }
        // Celebrate!
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#22c55e', '#f97316', '#fbbf24', '#3b82f6'] });
      } else if (pothole.status === 'fixed') {
        // Dispute — user says it's still there
        await base44.entities.PotholeReport.update(id, {
          status: 'disputed',
          disputed_by: currentUser?.id || '',
        });
        await base44.entities.PotholeConfirmation.create({ pothole_id: id, action });
        try { await base44.entities.PotholeStatusEvent.create({ pothole_id: id, status: 'disputed', note: 'Reported still there' }); } catch (e) {}
        try { await base44.functions.invoke('notifyReportOwner', { reportId: id, newStatus: 'disputed' }); } catch (e) {}
        // Penalize the fixer (re-read latest)
        if (pothole.fixed_by) {
          const fixerReps = await base44.entities.UserReputation.filter({ created_by_id: pothole.fixed_by });
          if (fixerReps[0]) {
            const freshFixer = (await base44.entities.UserReputation.filter({ id: fixerReps[0].id }))[0] || fixerReps[0];
            await base44.entities.UserReputation.update(freshFixer.id, {
              karma: (freshFixer.karma || 0) - 3,
              fixes_disputed: (freshFixer.fixes_disputed || 0) + 1,
            });
          }
        }
        if (rep) {
          const fresh = (await base44.entities.UserReputation.filter({ id: rep.id }))[0] || rep;
          await base44.entities.UserReputation.update(fresh.id, {
            karma: (fresh.karma || 0) + 3,
            confirmations_given: (fresh.confirmations_given || 0) + 1,
          });
          setUserRep({ ...fresh, karma: (fresh.karma || 0) + 3, confirmations_given: (fresh.confirmations_given || 0) + 1 });
        }
      } else {
        await base44.entities.PotholeReport.update(id, {
          upvotes: (Number(pothole.upvotes) || 0) + weight,
          last_confirmed_date: new Date().toISOString(),
        });
        await base44.entities.PotholeConfirmation.create({ pothole_id: id, action });
        if (rep) {
          const fresh = (await base44.entities.UserReputation.filter({ id: rep.id }))[0] || rep;
          await base44.entities.UserReputation.update(fresh.id, {
            karma: (fresh.karma || 0) + 2,
            confirmations_given: (fresh.confirmations_given || 0) + 1,
          });
          setUserRep({ ...fresh, karma: (fresh.karma || 0) + 2, confirmations_given: (fresh.confirmations_given || 0) + 1 });
        }
      }
    } catch (e) {
      // Revert on failure
      loadPotholes();
    }
  };

  const handleDelayedPrompt = useCallback((pin) => {
    if (!pin) return;
    setFlyToCenter([pin.lat, pin.lng]);
    setPendingVoicePins((prev) => prev.filter((p) => p.lat !== pin.lat || p.lng !== pin.lng));
    openReportAt(pin.lat, pin.lng);
  }, [openReportAt]);

  // Auto-enable proximity alerts when voice listening starts (user is driving)
  useEffect(() => {
    if (isVoiceListening) {
      setProximityAlertsOn(true);
    }
  }, [isVoiceListening]);

  const startDropping = () => {
    setIsDropping(true);
    setIsVoiceListening(false);
    setNewPin(null);
    setDuplicateCandidate(null);
    setSidebarOpen(false);
  };

  const mapFilteredPotholes = potholes.filter((p) => mapStatusFilters[p.status] && mapSeverityFilters[p.severity]);
  const displayPotholes = potholes.filter((p) => showFixed || p.status !== 'fixed');
  const filteredPotholes = displayPotholes.filter((p) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = p.address?.toLowerCase().includes(q) || p.jurisdiction_name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    // Severity filter
    if (listSeverityFilter !== 'all' && p.severity !== listSeverityFilter) return false;
    return true;
  }).sort((a, b) => {
    if (listSortBy === 'newest') return new Date(b.created_date) - new Date(a.created_date);
    if (listSortBy === 'oldest') return new Date(a.created_date) - new Date(b.created_date);
    if (listSortBy === 'most_confirmed') return (Number(b.upvotes) || 0) - (Number(a.upvotes) || 0);
    return 0;
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b z-10 flex-shrink-0" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-base leading-tight">PotholePing</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Crowdsourced pothole reporting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFixed(!showFixed)}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showFixed ? 'bg-green-50 border-green-300 text-green-700' : 'text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {showFixed ? '✅ Including Fixed' : 'Hide Fixed'}
          </button>
          <ProximityAlert
            potholes={displayPotholes}
            isActive={proximityAlertsOn}
            onToggle={() => setProximityAlertsOn(!proximityAlertsOn)}
            onLocationChange={(loc) => {
              setUserPosition(loc);
            }}
            onDangerNearby={setDangerNearby}
            onAvoidance={handleAvoidance}
          />
          <Link
            to="/leaderboard"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-muted-foreground border-border hover:bg-muted transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" />
            Ranks
          </Link>
          <Link
            to="/hall-of-shame"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-red-500 border-red-200 hover:bg-red-50 transition-colors"
          >
            <Skull className="w-3.5 h-3.5" />
            Shame
          </Link>
          <Link
            to="/bureaucracy"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-amber-600 border-amber-200 hover:bg-amber-50 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5" />
            Bureaucracy
          </Link>
          <Link
            to="/commute"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-green-600 border-green-200 hover:bg-green-50 transition-colors"
          >
            <Route className="w-3.5 h-3.5" />
            Commute
          </Link>
          <Link
            to="/watch-zones"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Neighborhoods
          </Link>
          <Link
            to="/photos"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-purple-600 border-purple-200 hover:bg-purple-50 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            Photos
          </Link>
          <Link
            to="/analytics"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-teal-600 border-teal-200 hover:bg-teal-50 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Analytics
          </Link>
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('map')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'map' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <Map className="w-3.5 h-3.5 inline mr-1" />
              Map
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <List className="w-3.5 h-3.5 inline mr-1" />
              List
            </button>
          </div>

          {/* Mobile nav menu */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Menu className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/leaderboard" className="flex items-center gap-2 cursor-pointer">
                    <Trophy className="w-4 h-4" />
                    Leaderboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/hall-of-shame" className="flex items-center gap-2 cursor-pointer">
                    <Skull className="w-4 h-4" />
                    Hall of Shame
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/bureaucracy" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="w-4 h-4" />
                    Bureaucracy Tracker
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/commute" className="flex items-center gap-2 cursor-pointer">
                    <Route className="w-4 h-4" />
                    Commute Saver
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/watch-zones" className="flex items-center gap-2 cursor-pointer">
                    <MessageCircle className="w-4 h-4" />
                    Neighborhood Watch
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/photos" className="flex items-center gap-2 cursor-pointer">
                    <Camera className="w-4 h-4" />
                    Photo Gallery
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-reports" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="w-4 h-4" />
                    My Reports
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/report-card" className="flex items-center gap-2 cursor-pointer">
                    <Award className="w-4 h-4" />
                    State of the Roads
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/analytics" className="flex items-center gap-2 cursor-pointer">
                    <TrendingUp className="w-4 h-4" />
                    Analytics
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowFixed(!showFixed)} className="flex items-center gap-2 cursor-pointer">
                  {showFixed ? '✅' : '👁️'}
                  {showFixed ? 'Hide Fixed' : 'Show Fixed'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            onClick={startDropping}
            size="sm"
            className="gap-1.5 font-heading"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Report Pothole</span>
            <span className="sm:hidden">Report</span>
          </Button>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            title="Report a bug or suggest a feature"
          >
            <Bug className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {view === 'map' && (
          <div className="flex-1 relative">
            <ErrorBoundary label="Map" onRetry={() => loadPotholes(0)}>
            <PotholeMap
              potholes={mapFilteredPotholes}
              onMapClick={handleMapClick}
              newPin={newPin}
              isDropping={isDropping}
              onPotholeClick={handlePotholeClick}
              onNewPinClick={handleNewPinClick}
              onVoicePinClick={(pin) => {
                setPendingVoicePins((prev) => prev.filter((p) => p.lat !== pin.lat || p.lng !== pin.lng));
                openReportAt(pin.lat, pin.lng);
              }}
              onVoicePinDelete={(pin) => {
                setPendingVoicePins((prev) => prev.filter((p) => p.lat !== pin.lat || p.lng !== pin.lng));
              }}
              flyToCenter={flyToCenter}
              userPosition={userPosition}
              followUser={followUser}
              onToggleFollow={() => setFollowUser(f => !f)}
              sidebarOpen={sidebarOpen}
              pendingVoicePins={pendingVoicePins}
              hotZonesEnabled={hotZonesEnabled}
            >
              <HeatmapLayer
                potholes={displayPotholes}
                enabled={heatmapEnabled}
                severityFilter={heatmapSeverity}
                timeRange={heatmapTimeRange}
              />
              <CommuterRouteOverlay routeData={commuterRouteData} userPosition={userPosition} followRoute={followUser} />
            </PotholeMap>
            </ErrorBoundary>
            {dangerNearby && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none">
                <div className="bg-red-600/90 text-white rounded-2xl px-5 py-3 shadow-2xl animate-pulse flex items-center gap-3 backdrop-blur">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <p className="font-heading font-bold text-sm leading-tight">Pothole Ahead!</p>
                    <p className="text-xs opacity-90">
                      {dangerNearby.pothole?.severity || 'Unknown'} · {Math.round(dangerNearby.distance * 3.28084)}ft
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!sidebarOpen && <SavingsWidget totalSavings={totalSavings} avoidanceCount={avoidanceCount} />}
            {!sidebarOpen && <SupportButton />}
            {!sidebarOpen && <HeatmapControls
              enabled={heatmapEnabled}
              onToggle={() => setHeatmapEnabled(!heatmapEnabled)}
              severityFilter={heatmapSeverity}
              onSeverityChange={setHeatmapSeverity}
              timeRange={heatmapTimeRange}
              onTimeRangeChange={setHeatmapTimeRange}
              hotspotCount={heatmapEnabled ? displayPotholes.filter(p => {
                if (p.status === 'fixed') return false;
                if (heatmapSeverity !== 'all' && p.severity !== heatmapSeverity) return false;
                const timeCutoffs = { week: 7, month: 30, '3months': 90, all: Infinity };
                const age = (Date.now() - new Date(p.created_date).getTime()) / (24*60*60*1000);
                return age <= timeCutoffs[heatmapTimeRange];
              }).length : 0}
            />}
            {!sidebarOpen && commuterRouteData && (
              <button
                onClick={() => setCommuterRouteData(null)}
                className="absolute top-4 left-4 z-[1000] px-3 py-1.5 rounded-full text-xs font-heading font-semibold border shadow-lg bg-green-600 text-white border-green-500 transition-all"
              >
                🛣️ Clear Route
              </button>
            )}
            {!sidebarOpen && !commuterRouteData && (
              <button
                onClick={() => setHotZonesEnabled(!hotZonesEnabled)}
                className={`absolute top-4 left-4 z-[1000] px-3 py-1.5 rounded-full text-xs font-heading font-semibold border shadow-lg transition-all ${
                  hotZonesEnabled
                    ? 'bg-red-600 text-white border-red-500'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {hotZonesEnabled ? '🔥 Hot Zones ON' : '🔥 Hot Zones'}
              </button>
            )}
            {!sidebarOpen && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="absolute top-4 right-4 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading font-semibold border shadow-lg bg-card text-foreground border-border hover:bg-muted transition-colors">
                    <span className="capitalize">Filters</span>
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {mapFilteredPotholes.length}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 space-y-3" align="end" sideOffset={8}>
                  <div>
                    <p className="text-xs font-heading font-semibold text-muted-foreground mb-1.5">Status</p>
                    <div className="space-y-0.5">
                      {['reported', 'acknowledged', 'in_progress', 'fixed', 'disputed'].map((status) => (
                        <label key={status} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted p-1.5 rounded transition-colors">
                          <input
                            type="checkbox"
                            checked={mapStatusFilters[status]}
                            onChange={(e) => setMapStatusFilters(prev => ({ ...prev, [status]: e.target.checked }))}
                            className="w-4 h-4 rounded border"
                          />
                          <span className="capitalize">{status.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <p className="text-xs font-heading font-semibold text-muted-foreground mb-1.5">Severity</p>
                    <div className="space-y-0.5">
                      {['minor', 'moderate', 'severe', 'dangerous'].map((severity) => (
                        <label key={severity} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted p-1.5 rounded transition-colors">
                          <input
                            type="checkbox"
                            checked={mapSeverityFilters[severity]}
                            onChange={(e) => setMapSeverityFilters(prev => ({ ...prev, [severity]: e.target.checked }))}
                            className="w-4 h-4 rounded border"
                          />
                          <span className="capitalize">{severity}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {view === 'list' && (
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by address, city, or description..."
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 text-xs">
                <MobileSelect value={listSortBy} onValueChange={setListSortBy} options={[{value:'newest',label:'Newest First'},{value:'oldest',label:'Oldest First'},{value:'most_confirmed',label:'Most Confirmed'}]} placeholder="Sort by" className="flex-1" />
                <MobileSelect value={listSeverityFilter} onValueChange={setListSeverityFilter} options={[{value:'all',label:'All Severities'},{value:'minor',label:'Minor'},{value:'moderate',label:'Moderate'},{value:'severe',label:'Severe'},{value:'dangerous',label:'Dangerous'}]} placeholder="All Severities" className="flex-1" />
              </div>
            </div>
            <PullToRefresh onRefresh={() => loadPotholes(0)} className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-2 pb-14 sm:pb-0">
                <RecentlyFixed potholes={potholes} />
                {filteredPotholes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No potholes found</p>
                  </div>
                ) : (
                  <>
                    {filteredPotholes.map((p) => (
                      <PotholeListItem key={p.id} pothole={p} onClick={handlePotholeClick} />
                    ))}
                    {hasMorePotholes && (
                      <button
                        onClick={() => {
                          setLoadingMorePotholes(true);
                          loadPotholes(potholeOffset);
                        }}
                        disabled={loadingMorePotholes}
                        className="w-full py-3 mt-2 text-sm font-medium text-primary hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingMorePotholes ? 'Loading...' : 'Load More'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </PullToRefresh>
          </div>
        )}

        {sidebarOpen && (
          <div className="absolute sm:relative right-0 top-0 bottom-0 w-full sm:w-[380px] bg-card border-l z-[500] flex flex-col shadow-xl sm:shadow-none">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-heading font-semibold text-sm">
                {newPin ? 'New Report' : 'Pothole Details'}
              </h3>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  if (newPin) handleCancelReport();
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                {duplicateCandidate && !newPin && (
                  <DuplicateWarning
                    candidate={duplicateCandidate}
                    pin={duplicatePin}
                    distanceFt={distanceFt}
                    onConfirm={(pothole) => {
                      handleUpvote(pothole.id);
                      setDuplicateCandidate(null);
                      setDuplicatePin(null);
                      setSidebarOpen(false);
                      navigate(`/pothole/${pothole.id}`);
                    }}
                    onReportAnyway={() => {
                      const lat = Number(duplicateCandidate.latitude);
                      const lng = Number(duplicateCandidate.longitude);
                      const offset = 0.00015;
                      const pin = { lat: lat + offset, lng: lng + offset };
                      setDuplicateCandidate(null);
                      setDuplicatePin(null);
                      setNewPin(pin);
                      setIsLoadingJurisdiction(true);
                      (async () => {
                        const address = await reverseGeocode(pin.lat, pin.lng);
                        setJurisdictionInfo({ address });
                        try {
                          const info = await lookupJurisdiction(pin.lat, pin.lng, address);
                          setJurisdictionInfo((prev) => ({ ...prev, ...applyJurisdictionOverrides(info) }));
                        } catch (e) {}
                        setIsLoadingJurisdiction(false);
                      })();
                    }}
                    onDismiss={() => {
                      setDuplicateCandidate(null);
                      setDuplicatePin(null);
                      setSidebarOpen(false);
                    }}
                  />
                )}
                {newPin && !duplicateCandidate && (
                  <ReportForm
                    pin={newPin}
                    jurisdictionInfo={jurisdictionInfo}
                    isLoadingJurisdiction={isLoadingJurisdiction}
                    onSubmit={handleSubmitReport}
                    onCancel={handleCancelReport}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {!sidebarOpen && (
        <VoiceReport
          onVoiceReport={handleVoiceReport}
          isListening={isVoiceListening}
          onToggleListening={setIsVoiceListening}
        />
      )}

      <DelayedReportPrompt
        pendingPins={pendingVoicePins}
        onPrompt={handleDelayedPrompt}
      />

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      <QuickConfirmSheet
        pothole={quickConfirmPothole}
        onConfirm={() => {
          handleUpvote(quickConfirmPothole.id);
          setQuickConfirmPothole(null);
        }}
        onViewDetails={() => {
          const p = quickConfirmPothole;
          setQuickConfirmPothole(null);
          navigate(`/pothole/${p.id}`);
        }}
        onDismiss={() => setQuickConfirmPothole(null)}
      />

      {showOnboarding && (
        <OnboardingTour
          onClose={() => {
            setShowOnboarding(false);
            if (currentUser) {
              localStorage.setItem(`potholeping_onboarded_${currentUser.id}`, '1');
            }
          }}
        />
      )}

    </div>
  );
}