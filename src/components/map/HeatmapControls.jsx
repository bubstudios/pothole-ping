import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, X, Filter } from 'lucide-react';

const severityColors = {
  minor: 'bg-yellow-100 text-yellow-700',
  moderate: 'bg-orange-100 text-orange-700',
  severe: 'bg-red-100 text-red-700',
  dangerous: 'bg-red-200 text-red-800',
};

const timeLabels = {
  week: 'Past Week',
  month: 'Past Month',
  '3months': '3 Months',
  all: 'All Time',
};

export default function HeatmapControls({
  enabled,
  onToggle,
  severityFilter,
  onSeverityChange,
  timeRange,
  onTimeRangeChange,
  hotspotCount,
}) {
  if (!enabled) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={onToggle}
        className="absolute top-2 left-2 z-[1000] gap-1.5 text-xs font-medium shadow-md"
      >
        <Flame className="w-3.5 h-3.5" />
        Heatmap
      </Button>
    );
  }

  return (
    <div className="absolute top-2 left-2 z-[1000] bg-card border rounded-lg shadow-lg p-3 space-y-2 w-[220px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-semibold font-heading">Heatmap</span>
        </div>
        <button onClick={onToggle} className="p-0.5 hover:bg-muted rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Severity filter */}
      <div>
        <label className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mb-1">
          <Filter className="w-3 h-3" /> Severity
        </label>
        <div className="flex flex-wrap gap-1">
          <Badge
            onClick={() => onSeverityChange('all')}
            variant={severityFilter === 'all' ? 'default' : 'secondary'}
            className="cursor-pointer text-[10px] px-1.5 py-0"
          >
            All
          </Badge>
          {Object.entries(severityColors).map(([sev, color]) => (
            <Badge
              key={sev}
              onClick={() => onSeverityChange(sev)}
              variant={severityFilter === sev ? 'default' : 'secondary'}
              className={`cursor-pointer text-[10px] px-1.5 py-0 ${severityFilter !== sev ? color : ''}`}
            >
              {sev}
            </Badge>
          ))}
        </div>
      </div>

      {/* Time range */}
      <div>
        <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Time Range</label>
        <div className="flex flex-wrap gap-1">
          {Object.entries(timeLabels).map(([key, label]) => (
            <Badge
              key={key}
              onClick={() => onTimeRangeChange(key)}
              variant={timeRange === key ? 'default' : 'secondary'}
              className="cursor-pointer text-[10px] px-1.5 py-0"
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Hotspot count */}
      {hotspotCount > 0 && (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Potholes in view</span>
            <span className="text-xs font-bold text-orange-600">{hotspotCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}