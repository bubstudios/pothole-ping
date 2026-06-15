import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bug, Lightbulb, Send, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function FeedbackModal({ open, onClose }) {
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    try {
      await base44.functions.invoke('sendFeedback', { type, message: message.trim() });
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setSent(false);
    setError('');
    setType('bug');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-heading font-semibold text-sm">Send Feedback</h3>
          <button onClick={handleClose} className="p-1 hover:bg-muted rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          <div className="p-6 text-center space-y-3">
            <div className="text-3xl">✅</div>
            <p className="font-heading font-semibold">Thanks for your feedback!</p>
            <p className="text-sm text-muted-foreground">We'll review it and make improvements.</p>
            <Button onClick={handleClose} size="sm" className="mt-2">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === 'bug'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                <Bug className="w-4 h-4" />
                Bug
              </button>
              <button
                type="button"
                onClick={() => setType('suggestion')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === 'suggestion'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                Suggestion
              </button>
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={type === 'bug' ? "What's broken? What should happen instead?" : "What would make PotholePing better?"}
              rows={4}
              className="resize-none"
              autoFocus
            />

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}

            <Button
              type="submit"
              disabled={!message.trim() || sending}
              className="w-full gap-2"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? 'Sending...' : 'Send Feedback'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}