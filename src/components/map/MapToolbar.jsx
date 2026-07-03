import React, { Suspense } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
const HeatmapControls = React.lazy(() => import('@/components/map/HeatmapControls'));
import SavingsWidget from '@/components/pothole/SavingsWidget';
import SupportButton from '@/components/SupportButton';

function MapToolbar({
  sidebarOpen,
  heatmapEnabled,
  setHeatmapEnabled,
  heatmapSeverity,
  setHeatmapSeverity,
  heatmapTimeRange,
  setHeatmapTimeRange,
  displayPotholes,
  totalSavings,
  avoidanceCount,
  commuterRouteData,
  setCommuterRouteData,
  hotZonesEnabled,
  setHotZonesEnabled,
  mapStatusFilters,
  setMapStatusFilters,
  mapSeverityFilters,
  setMapSeverityFilters,
  mapFilteredPotholes,
}) {
  if (sidebarOpen) return null;

  return (
    <>
      <SavingsWidget totalSavings={totalSavings} avoidanceCount={avoidanceCount} />
      <SupportButton />
      <Suspense fallback={null}>
        <HeatmapControls
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
        />
      </Suspense>
      {commuterRouteData && (
        <button
          onClick={() => setCommuterRouteData(null)}
          className="absolute top-4 left-4 z-[1000] px-3 py-1.5 rounded-full text-xs font-heading font-semibold border shadow-lg bg-green-600 text-white border-green-500 transition-all"
        >
          🛣️ Clear Route
        </button>
      )}
      {!commuterRouteData && (
        <button
          aria-label={hotZonesEnabled ? 'Hide hot zones' : 'Show hot zones'}
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
      <Popover>
        <PopoverTrigger asChild>
          <button aria-label="Toggle map filters" className="absolute top-4 right-4 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading font-semibold border shadow-lg bg-card text-foreground border-border hover:bg-muted transition-colors">
            <span className="capitalize">Filters</span>
            <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {mapFilteredPotholes.length}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-3" align="end" sideOffset={8}>
          <fieldset>
            <legend className="sr-only">Filter by status</legend>
            <p className="text-xs font-heading font-semibold text-muted-foreground mb-1.5">Status</p>
            <div className="space-y-0.5">
              {['reported', 'acknowledged', 'in_progress', 'fixed', 'disputed'].map((status) => (
                <label key={status} htmlFor={`filter-status-${status}`} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted p-1.5 rounded transition-colors">
                  <input
                    id={`filter-status-${status}`}
                    type="checkbox"
                    checked={mapStatusFilters[status]}
                    onChange={(e) => setMapStatusFilters(prev => ({ ...prev, [status]: e.target.checked }))}
                    className="w-4 h-4 rounded border"
                  />
                  <span className="capitalize">{status.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="border-t pt-2">
            <legend className="sr-only">Filter by severity</legend>
            <p className="text-xs font-heading font-semibold text-muted-foreground mb-1.5">Severity</p>
            <div className="space-y-0.5">
              {['minor', 'moderate', 'severe', 'dangerous'].map((severity) => (
                <label key={severity} htmlFor={`filter-severity-${severity}`} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted p-1.5 rounded transition-colors">
                  <input
                    id={`filter-severity-${severity}`}
                    type="checkbox"
                    checked={mapSeverityFilters[severity]}
                    onChange={(e) => setMapSeverityFilters(prev => ({ ...prev, [severity]: e.target.checked }))}
                    className="w-4 h-4 rounded border"
                  />
                  <span className="capitalize">{severity}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </PopoverContent>
      </Popover>
    </>
  );
}

export default React.memo(MapToolbar);