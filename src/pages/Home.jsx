import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, List, Map, Search, AlertTriangle, X, Trophy, Skull, Building2, Menu, MessageCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PotholeMap from '@/components/map/PotholeMap';
import HeatmapLayer from '@/components/map/HeatmapLayer';
import HeatmapControls from '@/components/map/HeatmapControls';
import ReportForm from '@/components/pothole/ReportForm';
import PotholeDetail from '@/components/pothole/PotholeDetail';
import PotholeListItem from '@/components/pothole/PotholeListItem';
import VoiceReport from '@/components/pothole/VoiceReport';
import ProximityAlert from '@/components/pothole/ProximityAlert';
import DuplicateWarning from '@/components/pothole/DuplicateWarning';

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

async function lookupJurisdiction(lat, lng, address) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Find the responsible road maintenance authority for a pothole at this location:\nAddress: ${address}\nCoordinates: ${lat}, ${lng}\n\nDetermine:\n1. Whether this is inside a city/municipality, unincorporated county land, or on a state/federal highway\n2. The specific government entity responsible for road maintenance\n3. A phone number to call to report a pothole\n4. An email address where pothole/service requests can be submitted (public works, 311, or streets department)\n5. If this jurisdiction has an Open311 API, provide the endpoint URL and the service code for pothole requests\n\nBe specific. For state highways, provide the state DOT number. For unincorporated areas, provide the county public works number. If no email is publicly listed, leave it empty.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        jurisdiction_name: { type: 'string' },
        jurisdiction_type: { type: 'string', enum: ['city', 'county', 'state', 'federal', 'unknown'] },
        jurisdiction_phone: { type: 'string' },
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
  const [potholes, setPotholes] = useState([]);
  const [isDropping, setIsDropping] = useState(false);
  const [newPin, setNewPin] = useState(null);
  const [jurisdictionInfo, setJurisdictionInfo] = useState(null);
  const [isLoadingJurisdiction, setIsLoadingJurisdiction] = useState(false);
  const [selectedPothole, setSelectedPothole] = useState(null);
  const [view, setView] = useState('map');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flyToCenter, setFlyToCenter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFixed, setShowFixed] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [proximityAlertsOn, setProximityAlertsOn] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapSeverity, setHeatmapSeverity] = useState('all');
  const [heatmapTimeRange, setHeatmapTimeRange] = useState('all');
  const [duplicateCandidate, setDuplicateCandidate] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRep, setUserRep] = useState(null);

  useEffect(() => {
    loadPotholes();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const reps = await base44.entities.UserReputation.filter({ created_by_id: user.id });
      setUserRep(reps[0] || null);
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

  const loadPotholes = async () => {
    const data = await base44.entities.PotholeReport.list('-created_date', 200);
    setPotholes(data);
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
      setNewPin(null);
      setSelectedPothole(null);
      setSidebarOpen(true);
      setJurisdictionInfo(null);
      setIsLoadingJurisdiction(false);
      return;
    }

    const pin = { lat, lng };
    setNewPin(pin);
    setSelectedPothole(null);
    setDuplicateCandidate(null);
    setSidebarOpen(true);
    setJurisdictionInfo(null);
    setIsLoadingJurisdiction(true);

    const address = await reverseGeocode(lat, lng);
    setJurisdictionInfo({ address });

    try {
      const info = await lookupJurisdiction(lat, lng, address);
      setJurisdictionInfo((prev) => ({ ...prev, ...info }));
    } catch (e) {}
    setIsLoadingJurisdiction(false);
  }, [potholes]);

  const handleMapClick = useCallback(async (latlng) => {
    if (!isDropping) return;
    setIsDropping(false);
    openReportAt(latlng.lat, latlng.lng);
  }, [isDropping, openReportAt]);

  const handleVoiceReport = useCallback((lat, lng) => {
    setIsVoiceListening(false);
    setIsDropping(false);
    setNewPin({ lat, lng });
    setSelectedPothole(null);
    setDuplicateCandidate(null);
    setSidebarOpen(false);
    setFlyToCenter([lat, lng]);
    setJurisdictionInfo(null);
    setIsLoadingJurisdiction(false);
  }, []);

  const handleNewPinClick = useCallback(() => {
    if (!newPin) return;
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
      jurisdiction_details: jurisdictionInfo?.jurisdiction_details || '',
      submission_email: jurisdictionInfo?.submission_email || '',
      open311_endpoint: jurisdictionInfo?.open311_endpoint || '',
      open311_service_code: jurisdictionInfo?.open311_service_code || '',
      photo_url: photo_url || '',
    };
    const created = await base44.entities.PotholeReport.create(report);
    setNewPin(null);
    setJurisdictionInfo(null);
    setSidebarOpen(false);
    loadPotholes();

    // Auto-submit if any submission method is available
    if (jurisdictionInfo?.submission_email || jurisdictionInfo?.open311_endpoint) {
      try {
        await base44.functions.invoke('submitPotholeReport', { reportId: created.id });
        loadPotholes();
      } catch (e) {}
    }
  };

  const handleCancelReport = () => {
    setNewPin(null);
    setJurisdictionInfo(null);
    setIsLoadingJurisdiction(false);
    setDuplicateCandidate(null);
    setSidebarOpen(false);
  };

  const handlePotholeClick = (pothole) => {
    setSelectedPothole(pothole);
    setNewPin(null);
    setIsDropping(false);
    setSidebarOpen(true);
    setFlyToCenter([pothole.latitude, pothole.longitude]);
  };

  const handleUpvote = async (id, markFixed = false) => {
    const pothole = potholes.find((p) => p.id === id);
    if (!pothole) return;
    const rep = await getOrCreateRep();

    if (markFixed) {
      await base44.entities.PotholeReport.update(id, {
        status: 'fixed',
        fixed_by: currentUser?.id || '',
      });
      if (rep) {
        await base44.entities.UserReputation.update(rep.id, {
          karma: (rep.karma || 0) + 5,
          fixes_marked: (rep.fixes_marked || 0) + 1,
        });
      }
    } else if (pothole.status === 'fixed') {
      // Dispute — user says it's still there
      await base44.entities.PotholeReport.update(id, {
        status: 'disputed',
        disputed_by: currentUser?.id || '',
      });
      // Penalize the fixer
      if (pothole.fixed_by) {
        const fixerReps = await base44.entities.UserReputation.filter({ created_by_id: pothole.fixed_by });
        if (fixerReps[0]) {
          await base44.entities.UserReputation.update(fixerReps[0].id, {
            karma: (fixerReps[0].karma || 0) - 3,
            fixes_disputed: (fixerReps[0].fixes_disputed || 0) + 1,
          });
        }
      }
      if (rep) {
        await base44.entities.UserReputation.update(rep.id, {
          karma: (rep.karma || 0) + 3,
          confirmations_given: (rep.confirmations_given || 0) + 1,
        });
      }
    } else {
      const weight = getWeight();
      const previousUpvotes = Number(pothole.upvotes) || 0;
      const newUpvotes = previousUpvotes + weight;
      await base44.entities.PotholeReport.update(id, {
        upvotes: newUpvotes,
        last_confirmed_date: new Date().toISOString(),
      });
      if (rep) {
        await base44.entities.UserReputation.update(rep.id, {
          karma: (rep.karma || 0) + 2,
          confirmations_given: (rep.confirmations_given || 0) + 1,
        });
      }
    }

    loadPotholes();
    setSelectedPothole((prev) => {
      if (prev?.id !== id) return prev;
      const updates = markFixed
        ? { status: 'fixed', fixed_by: currentUser?.id || '' }
        : pothole.status === 'fixed'
          ? { status: 'disputed', disputed_by: currentUser?.id || '' }
          : { upvotes: (prev.upvotes || 0) + getWeight(), last_confirmed_date: new Date().toISOString() };
      return { ...prev, ...updates };
    });
  };

  const handleSeverityChange = async (id, newSeverity) => {
    await base44.entities.PotholeReport.update(id, { severity: newSeverity });
    loadPotholes();
    setSelectedPothole((prev) => {
      if (prev?.id !== id) return prev;
      return { ...prev, severity: newSeverity };
    });
  };

  const startDropping = () => {
    setIsDropping(true);
    setIsVoiceListening(false);
    setSelectedPothole(null);
    setNewPin(null);
    setDuplicateCandidate(null);
    setSidebarOpen(false);
  };

  const displayPotholes = potholes.filter((p) => showFixed || p.status !== 'fixed');
  const filteredPotholes = displayPotholes.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.address?.toLowerCase().includes(q) ||
      p.jurisdiction_name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b z-10 flex-shrink-0">
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
            to="/watch-zones"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Neighborhoods
          </Link>
          <div className="hidden sm:flex border rounded-lg overflow-hidden">
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
                  <Link to="/watch-zones" className="flex items-center gap-2 cursor-pointer">
                    <MessageCircle className="w-4 h-4" />
                    Neighborhood Watch
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
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {view === 'map' && (
          <div className="flex-1 relative">
            <PotholeMap
              potholes={displayPotholes}
              onMapClick={handleMapClick}
              newPin={newPin}
              isDropping={isDropping}
              onPotholeClick={handlePotholeClick}
              onNewPinClick={handleNewPinClick}
              flyToCenter={flyToCenter}
            >
              <HeatmapLayer
                potholes={displayPotholes}
                enabled={heatmapEnabled}
                severityFilter={heatmapSeverity}
                timeRange={heatmapTimeRange}
              />
            </PotholeMap>
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
          </div>
        )}

        {view === 'list' && (
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by address, city, or description..."
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {filteredPotholes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No potholes found</p>
                  </div>
                ) : (
                  filteredPotholes.map((p) => (
                    <PotholeListItem key={p.id} pothole={p} onClick={handlePotholeClick} />
                  ))
                )}
              </div>
            </ScrollArea>
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
            <ScrollArea className="flex-1">
              <div className="p-4">
                {duplicateCandidate && !newPin && !selectedPothole && (
                  <DuplicateWarning
                    candidate={duplicateCandidate}
                    distanceFt={distanceFt}
                    onConfirm={(pothole) => {
                      handleUpvote(pothole.id);
                      setSelectedPothole(pothole);
                      setDuplicateCandidate(null);
                      setFlyToCenter([pothole.latitude, pothole.longitude]);
                    }}
                    onReportAnyway={() => {
                      const lat = Number(duplicateCandidate.latitude);
                      const lng = Number(duplicateCandidate.longitude);
                      // Adjust slightly so it's a new pin near the original
                      const offset = 0.00015; // ~50ft in lat
                      const pin = { lat: lat + offset, lng: lng + offset };
                      setDuplicateCandidate(null);
                      setNewPin(pin);
                      setIsLoadingJurisdiction(true);
                      (async () => {
                        const address = await reverseGeocode(pin.lat, pin.lng);
                        setJurisdictionInfo({ address });
                        try {
                          const info = await lookupJurisdiction(pin.lat, pin.lng, address);
                          setJurisdictionInfo((prev) => ({ ...prev, ...info }));
                        } catch (e) {}
                        setIsLoadingJurisdiction(false);
                      })();
                    }}
                    onDismiss={() => {
                      setDuplicateCandidate(null);
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
                {selectedPothole && !newPin && !duplicateCandidate && (
                  <PotholeDetail
                    pothole={selectedPothole}
                    currentUserId={currentUser?.id}
                    onBack={() => {
                      setSelectedPothole(null);
                      setSidebarOpen(false);
                    }}
                    onUpvote={handleUpvote}
                    onSeverityChange={handleSeverityChange}
                  />
                )}
              </div>
            </ScrollArea>
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

      <div className="sm:hidden flex border-t bg-card">
        <button
          onClick={() => setView('map')}
          className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${
            view === 'map' ? 'text-primary border-t-2 border-primary' : 'text-muted-foreground'
          }`}
        >
          <Map className="w-4 h-4 mx-auto mb-0.5" />
          Map
        </button>
        <button
          onClick={() => setView('list')}
          className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${
            view === 'list' ? 'text-primary border-t-2 border-primary' : 'text-muted-foreground'
          }`}
        >
          <List className="w-4 h-4 mx-auto mb-0.5" />
          List
        </button>
      </div>
    </div>
  );
}