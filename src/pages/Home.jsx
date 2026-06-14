import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, List, Map, Search, AlertTriangle, X } from 'lucide-react';
import PotholeMap from '@/components/map/PotholeMap';
import ReportForm from '@/components/pothole/ReportForm';
import PotholeDetail from '@/components/pothole/PotholeDetail';
import PotholeListItem from '@/components/pothole/PotholeListItem';

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

  useEffect(() => {
    loadPotholes();
  }, []);

  const loadPotholes = async () => {
    const data = await base44.entities.PotholeReport.list('-created_date', 200);
    setPotholes(data);
  };

  const lookupJurisdiction = useCallback(async (lat, lng) => {
    setIsLoadingJurisdiction(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `I need to find the responsible government authority for a pothole at these GPS coordinates: ${lat}, ${lng} (somewhere in the USA).

Please determine:
1. The exact street address or nearest intersection
2. Whether this location is within a city/municipality, in unincorporated county land, or on a state/federal highway
3. The specific government entity responsible for road maintenance at this location
4. The phone number to call to report a pothole at this location

Important context: In many areas (like St. Louis County, MO), some neighborhoods are incorporated cities and some are unincorporated — this matters because different authorities handle road maintenance. State highways running through towns are typically maintained by the state DOT, not the local municipality.

Please be as specific as possible. If this is on a state highway, provide the state DOT number. If it's in an unincorporated area, provide the county public works number.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Street address or nearest intersection',
          },
          jurisdiction_name: {
            type: 'string',
            description: 'Name of responsible authority (e.g., "City of Florissant Public Works", "St. Louis County Transportation")',
          },
          jurisdiction_type: {
            type: 'string',
            enum: ['city', 'county', 'state', 'federal', 'unknown'],
          },
          jurisdiction_phone: {
            type: 'string',
            description: 'Phone number to call',
          },
          jurisdiction_details: {
            type: 'string',
            description: 'Brief explanation of why this entity is responsible and any helpful tips for reporting',
          },
        },
      },
      model: 'gemini_3_flash',
    });
    setJurisdictionInfo(result);
    setIsLoadingJurisdiction(false);
    return result;
  }, []);

  const handleMapClick = useCallback(
    (latlng) => {
      setNewPin(latlng);
      setSelectedPothole(null);
      setSidebarOpen(true);
      lookupJurisdiction(latlng.lat, latlng.lng);
    },
    [lookupJurisdiction]
  );

  const handleSubmitReport = async ({ description, severity }) => {
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
    };
    await base44.entities.PotholeReport.create(report);
    setNewPin(null);
    setJurisdictionInfo(null);
    setIsDropping(false);
    setSidebarOpen(false);
    loadPotholes();
  };

  const handleCancelReport = () => {
    setNewPin(null);
    setJurisdictionInfo(null);
    setIsDropping(false);
    setSidebarOpen(false);
  };

  const handlePotholeClick = (pothole) => {
    setSelectedPothole(pothole);
    setNewPin(null);
    setSidebarOpen(true);
    setFlyToCenter([pothole.latitude, pothole.longitude]);
  };

  const handleUpvote = async (id) => {
    const pothole = potholes.find((p) => p.id === id);
    if (!pothole) return;
    await base44.entities.PotholeReport.update(id, {
      upvotes: (pothole.upvotes || 0) + 1,
    });
    loadPotholes();
    setSelectedPothole((prev) =>
      prev?.id === id ? { ...prev, upvotes: (prev.upvotes || 0) + 1 } : prev
    );
  };

  const startDropping = () => {
    setIsDropping(true);
    setSelectedPothole(null);
    setNewPin(null);
    setSidebarOpen(false);
  };

  const filteredPotholes = potholes.filter((p) => {
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
        {/* Map View */}
        {view === 'map' && (
          <div className="flex-1">
            <PotholeMap
              potholes={potholes}
              onMapClick={handleMapClick}
              newPin={newPin}
              isDropping={isDropping}
              onPotholeClick={handlePotholeClick}
              flyToCenter={flyToCenter}
            />
          </div>
        )}

        {/* List View */}
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
                    <PotholeListItem
                      key={p.id}
                      pothole={p}
                      onClick={handlePotholeClick}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Sidebar / Panel */}
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
                {newPin && (
                  <ReportForm
                    pin={newPin}
                    jurisdictionInfo={jurisdictionInfo}
                    isLoadingJurisdiction={isLoadingJurisdiction}
                    onSubmit={handleSubmitReport}
                    onCancel={handleCancelReport}
                  />
                )}
                {selectedPothole && !newPin && (
                  <PotholeDetail
                    pothole={selectedPothole}
                    onBack={() => {
                      setSelectedPothole(null);
                      setSidebarOpen(false);
                    }}
                    onUpvote={handleUpvote}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Mobile view toggle */}
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