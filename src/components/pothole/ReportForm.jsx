import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import MobileSelect from '@/components/ui/mobile-select';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, AlertTriangle, Camera, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import JurisdictionCard from './JurisdictionCard';

export default function ReportForm({ pin, jurisdictionInfo, isLoadingJurisdiction, onSubmit, onCancel }) {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setIsUploadingPhoto(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit({ description, severity, photo_url: photoUrl });
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
        <MobileSelect
          value={severity}
          onValueChange={setSeverity}
          options={[
            { value: 'minor', label: 'Minor — small crack or dip' },
            { value: 'moderate', label: 'Moderate — noticeable hole' },
            { value: 'severe', label: 'Severe — large hole, avoid if possible' },
            { value: 'dangerous', label: 'Dangerous — could damage vehicles' },
          ]}
          className="mt-1"
          placeholder="Select severity"
        />
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

      {/* Photo Upload */}
      <div>
        <Label>Photo (optional)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />
        {photoUrl ? (
          <div className="mt-1 relative rounded-lg overflow-hidden border">
            <img src={photoUrl} alt="Pothole" className="w-full h-40 object-cover" />
            <button
              type="button"
              onClick={() => { setPhotoUrl(null); fileInputRef.current.value = ''; }}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="mt-1 w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-muted-foreground/30 rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            {isUploadingPhoto ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Add photo
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting}
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