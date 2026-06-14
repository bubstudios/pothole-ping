import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ThumbsUp, Send, MapPin, Clock, MessageCircle, AlertTriangle, Zap, CheckCircle, Loader2 } from 'lucide-react';
import JurisdictionCard from './JurisdictionCard';
import moment from 'moment';

const severityBadge = {
  minor: 'bg-yellow-400 text-yellow-900',
  moderate: 'bg-orange-400 text-orange-900',
  severe: 'bg-red-400 text-red-900',
  dangerous: 'bg-red-700 text-red-50',
};

const statusBadge = {
  reported: 'bg-red-100 text-red-700',
  acknowledged: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  fixed: 'bg-green-100 text-green-700',
  disputed: 'bg-purple-100 text-purple-700',
};

function isStale(pothole) {
  if (pothole.status === 'fixed' || pothole.status === 'disputed') return false;
  const refDate = pothole.last_confirmed_date || pothole.created_date;
  if (!refDate) return false;
  const daysSince = (Date.now() - new Date(refDate).getTime()) / (24 * 60 * 60 * 1000);
  return daysSince > 30;
}

export default function PotholeDetail({ pothole, currentUserId, onBack, onUpvote, onSeverityChange }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  useEffect(() => {
    loadComments();
  }, [pothole.id]);

  const loadComments = async () => {
    const data = await base44.entities.PotholeComment.filter(
      { pothole_id: pothole.id },
      '-created_date'
    );
    setComments(data);
  };

  const handleSeverityChange = async (newSeverity) => {
    onSeverityChange(pothole.id, newSeverity);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    await base44.entities.PotholeComment.create({
      pothole_id: pothole.id,
      text: newComment.trim(),
    });
    setNewComment('');
    setIsSubmitting(false);
    loadComments();
  };

  const handleSubmitToAgency = async () => {
    setIsSendingReport(true);
    setSendResult(null);
    try {
      const res = await base44.functions.invoke('submitPotholeReport', { reportId: pothole.id });
      if (res.data?.email === 'sent') {
        setSendResult('sent');
      } else {
        setSendResult('failed');
      }
    } catch {
      setSendResult('failed');
    }
    setIsSendingReport(false);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to map
      </button>

      <div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-heading font-bold text-lg leading-tight">
            {pothole.address || 'Unknown Location'}
          </h2>
        </div>

        <div className="flex gap-2 mt-2 flex-wrap items-center">
          <Select value={pothole.severity} onValueChange={handleSeverityChange}>
            <SelectTrigger className={`h-auto py-0.5 px-2 text-xs rounded-full font-medium capitalize border-0 w-auto gap-1 ${severityBadge[pothole.severity]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="severe">Severe</SelectItem>
              <SelectItem value="dangerous">Dangerous</SelectItem>
            </SelectContent>
          </Select>
          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusBadge[pothole.status] || 'bg-purple-100 text-purple-700'}`}>
            {pothole.status?.replace('_', ' ')}
          </span>
          {isStale(pothole) && (
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Needs Re-Verification
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
          <Clock className="w-3 h-3" />
          {moment(pothole.created_date).fromNow()}
        </div>
      </div>

      <JurisdictionCard report={pothole} />

      {pothole.photo_url && (
        <div className="rounded-lg overflow-hidden border">
          <img src={pothole.photo_url} alt="Pothole" className="w-full max-h-56 object-cover" />
        </div>
      )}

      {pothole.description && (
        <div className="bg-muted rounded-lg p-3">
          <p className="text-sm">{pothole.description}</p>
        </div>
      )}

      {pothole.status === 'disputed' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
          <p className="font-medium flex items-center gap-1"><Zap className="w-4 h-4" /> Disputed</p>
          <p className="text-xs mt-1">Someone reported this pothole still exists after being marked fixed. The community is split — please verify in person.</p>
        </div>
      )}

      {isStale(pothole) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <p className="font-medium">⚠️ Confirmation Decayed</p>
          <p className="text-xs mt-1">No one has confirmed this report in over 30 days. Please verify and confirm if it still exists.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpvote(pothole.id)}
          className="gap-1.5"
        >
          <ThumbsUp className="w-4 h-4" />
          {pothole.status === 'fixed' ? 'Still There? Dispute' : `Confirm (${Math.round(pothole.upvotes || 0)})`}
        </Button>
        {pothole.jurisdiction_phone && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(`tel:${pothole.jurisdiction_phone}`)}
          >
            Call to Report
          </Button>
        )}
        {pothole.status !== 'fixed' && pothole.status !== 'disputed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpvote(pothole.id, true)}
            className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50"
          >
            ✅ Mark as Fixed
          </Button>
        )}
        {(pothole.status === 'fixed' || pothole.status === 'disputed') && pothole.fixed_by !== currentUserId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpvote(pothole.id)}
            className="gap-1.5 text-purple-600 border-purple-300 hover:bg-purple-50"
          >
            <Zap className="w-4 h-4" />
            Dispute — Still There!
          </Button>
        )}
        {pothole.status === 'disputed' && pothole.fixed_by !== currentUserId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpvote(pothole.id, true)}
            className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50"
          >
            ✅ No, It's Fixed
          </Button>
        )}
      </div>

      {/* Submit to Agency */}
      {(pothole.submission_email || pothole.open311_endpoint) && (
        <div className="border rounded-lg p-3 space-y-2">
          <h4 className="font-heading font-semibold text-sm flex items-center gap-1.5">
            <Send className="w-4 h-4" />
            Submit to Agency
          </h4>
          {pothole.submission_status === 'email_sent' || pothole.submission_status === 'open311_submitted' ? (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {pothole.submission_status === 'open311_submitted'
                ? `Submitted via Open311 to ${pothole.jurisdiction_name}`
                : `Report emailed to ${pothole.submission_email}`}
            </p>
          ) : sendResult === 'failed' ? (
            <p className="text-xs text-red-500">Failed to send. Try again or call instead.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {pothole.open311_endpoint && pothole.submission_email
                  ? `Can submit via Open311 API or email (${pothole.submission_email})`
                  : pothole.open311_endpoint
                    ? 'Open311 API submission available'
                    : `Email submission to ${pothole.submission_email}`}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 w-full"
                onClick={handleSubmitToAgency}
                disabled={isSendingReport}
              >
                {isSendingReport ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSendingReport ? 'Sending...' : 'Submit Report to Agency'}
              </Button>
            </>
          )}
        </div>
      )}

      <div className="border-t pt-4">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5 mb-3">
          <MessageCircle className="w-4 h-4" />
          Comments ({comments.length})
        </h3>

        <div className="flex gap-2 mb-4">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add details — which lane, nearby landmarks..."
            className="min-h-[60px] text-sm"
          />
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={isSubmitting || !newComment.trim()}
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-muted rounded-lg p-3">
              <p className="text-sm">{c.text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {moment(c.created_date).fromNow()}
              </p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No comments yet. Be the first to add details!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}