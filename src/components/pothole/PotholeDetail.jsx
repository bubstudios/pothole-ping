import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ThumbsUp, Send, MapPin, Clock, MessageCircle } from 'lucide-react';
import JurisdictionCard from './JurisdictionCard';
import moment from 'moment';

const severityBadge = {
  minor: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800',
  dangerous: 'bg-red-200 text-red-900',
};

const statusBadge = {
  reported: 'bg-red-100 text-red-700',
  acknowledged: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  fixed: 'bg-green-100 text-green-700',
};

export default function PotholeDetail({ pothole, onBack, onUpvote }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

        <div className="flex gap-2 mt-2 flex-wrap">
          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${severityBadge[pothole.severity]}`}>
            {pothole.severity}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusBadge[pothole.status]}`}>
            {pothole.status?.replace('_', ' ')}
          </span>
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

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpvote(pothole.id)}
          className="gap-1.5"
        >
          <ThumbsUp className="w-4 h-4" />
          Confirm ({pothole.upvotes || 0})
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
        {pothole.status !== 'fixed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpvote(pothole.id, true)}
            className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50"
          >
            ✅ Mark as Fixed
          </Button>
        )}
      </div>

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