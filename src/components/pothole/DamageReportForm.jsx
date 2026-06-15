import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUp, Loader2, FileText, Download, Car, X, CheckCircle } from 'lucide-react';
import moment from 'moment';

const DAMAGE_LABELS = {
  tire: 'Tire',
  rim: 'Rim / Wheel',
  alignment: 'Alignment',
  suspension: 'Suspension',
  body: 'Body / Undercarriage',
  other: 'Other',
};

export default function DamageReportForm({ potholeId, reportCreatedDate }) {
  const [damages, setDamages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [damageType, setDamageType] = useState('');
  const [costEstimate, setCostEstimate] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(null); // damage id being generated
  const [genSuccess, setGenSuccess] = useState(null);

  useEffect(() => {
    loadDamages();
  }, [potholeId]);

  const loadDamages = async () => {
    const data = await base44.entities.VehicleDamage.filter({ pothole_id: potholeId }, '-created_date');
    setDamages(data);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(result.file_url);
    } catch {}
    setIsUploading(false);
  };

  const handleSubmit = async () => {
    if (!damageType || !costEstimate) return;
    setIsSubmitting(true);
    await base44.entities.VehicleDamage.create({
      pothole_id: potholeId,
      damage_type: damageType,
      cost_estimate: parseFloat(costEstimate),
      description: description.trim(),
      photo_url: photoUrl || '',
      damage_date: new Date().toISOString(),
    });
    setIsSubmitting(false);
    setShowForm(false);
    setDamageType('');
    setCostEstimate('');
    setDescription('');
    setPhotoUrl('');
    loadDamages();
  };

  const handleGeneratePacket = async (damageId) => {
    setIsGenerating(damageId);
    setGenSuccess(null);
    try {
      const res = await base44.functions.invoke('generateClaimPacket', {
        reportId: potholeId,
        damageId,
      });
      const { pdf_base64, filename } = res.data;
      if (pdf_base64) {
        const byteChars = atob(pdf_base64);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNums[i] = byteChars.charCodeAt(i);
        }
        const pdfBlob = new Blob([new Uint8Array(byteNums)], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `pothole-damage-claim-${potholeId.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setGenSuccess(damageId);
      }
    } catch (e) {
      // ignore
    }
    setIsGenerating(null);
    loadDamages();
  };

  const reportWasBefore = reportCreatedDate
    ? new Date(reportCreatedDate) <= new Date()
    : null;

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-heading font-semibold text-sm flex items-center gap-1.5">
          <Car className="w-4 h-4" />
          Damage &amp; Claims
        </h4>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1.5 text-xs">
            Log Damage
          </Button>
        )}
      </div>

      {reportWasBefore !== null && (
        <p className="text-xs bg-green-50 border border-green-200 rounded-md px-3 py-2 text-green-700">
          This pothole was reported on {moment(reportCreatedDate).format('MMM D, YYYY [at] h:mm A')}.
          If your damage occurred after this date, the city was on notice — strengthening your claim.
        </p>
      )}

      {/* Existing damages */}
      {damages.length > 0 && (
        <div className="space-y-2">
          {damages.map((d) => (
            <div key={d.id} className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{DAMAGE_LABELS[d.damage_type] || d.damage_type}</span>
                <span className="text-xs text-muted-foreground">${Number(d.cost_estimate).toFixed(2)}</span>
              </div>
              {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{moment(d.created_date).fromNow()}</span>
                <div className="flex items-center gap-2">
                  {d.claim_status === 'packet_generated' && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Ready
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs h-7"
                    onClick={() => handleGeneratePacket(d.id)}
                    disabled={isGenerating === d.id}
                  >
                    {isGenerating === d.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : genSuccess === d.id ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <FileText className="w-3 h-3" />
                    )}
                    {genSuccess === d.id ? 'Downloaded' : 'Claim Packet'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New damage form */}
      {showForm && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-3 border">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium">Log Vehicle Damage</h5>
            <button onClick={() => setShowForm(false)} className="p-0.5 hover:bg-muted rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          <Select value={damageType} onValueChange={setDamageType}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Damage type" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              {Object.entries(DAMAGE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              value={costEstimate}
              onChange={(e) => setCostEstimate(e.target.value)}
              placeholder="Estimated repair cost"
              className="pl-7 text-sm"
              min="0"
              step="0.01"
            />
          </div>

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the damage (e.g., front right tire blowout, bent rim)..."
            className="text-sm min-h-[60px]"
          />

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <FileUp className="w-3.5 h-3.5" />
              {photoUrl ? 'Photo uploaded' : 'Photo of damage'}
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
            {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          </div>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !damageType || !costEstimate}
            className="w-full gap-1.5"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
            {isSubmitting ? 'Saving...' : 'Log Damage'}
          </Button>
        </div>
      )}
    </div>
  );
}