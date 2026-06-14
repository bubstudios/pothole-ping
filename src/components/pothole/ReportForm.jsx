import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, AlertTriangle } from 'lucide-react';
import JurisdictionCard from './JurisdictionCard';

export default function ReportForm({ pin, jurisdictionInfo, isLoadingJurisdiction, onSubmit, onCancel }) {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit({ description, severity });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <span>
          {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
        </span>
      </div>

      {isLoadingJurisdiction ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Looking up jurisdiction...
        </div>
      ) : jurisdictionInfo ? (
        <JurisdictionCard report={jurisdictionInfo} />
      ) : null}

      {jurisdictionInfo?.address && (
        <div>
          <Label className="text-xs text-muted-foreground">Detected Address</Label>
          <p className="text-sm font-medium mt-0.5">{jurisdictionInfo.address}</p>
        </div>
      )}

      <div>
        <Label htmlFor="severity">Severity</Label>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minor">Minor — small crack or dip</SelectItem>
            <SelectItem value="moderate">Moderate — noticeable hole</SelectItem>
            <SelectItem value="severe">Severe — large hole, avoid if possible</SelectItem>
            <SelectItem value="dangerous">Dangerous — could damage vehicles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Which lane? Near what intersection? How big is it?"
          className="mt-1 min-h-[80px]"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting || isLoadingJurisdiction}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Report Pothole
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}