import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import PotholeDetail from '@/components/pothole/PotholeDetail';

export default function PotholeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pothole, setPothole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRep, setUserRep] = useState(null);

  useEffect(() => {
    loadPothole();
    loadCurrentUser();
    // Listen for scroll-reset from BottomNav
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, [id]);

  const loadCurrentUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const reps = await base44.entities.UserReputation.filter({ created_by_id: user.id });
      setUserRep(reps[0] || null);
    } catch (e) {}
  };

  const loadPothole = async () => {
    setLoading(true);
    try {
      const found = await base44.entities.PotholeReport.list('-created_date', 200);
      const p = found.find(r => r.id === id);
      setPothole(p || null);
    } catch (e) {
      setPothole(null);
    }
    setLoading(false);
  };

  const getOrCreateRep = async () => {
    if (userRep) return userRep;
    if (!currentUser) return null;
    const rep = await base44.entities.UserReputation.create({
      karma: 0, reports_count: 0, confirmations_given: 0, fixes_marked: 0, fixes_disputed: 0,
    });
    setUserRep(rep);
    return rep;
  };

  const getWeight = () => 1 + Math.min((userRep?.karma || 0) / 50, 1);

  const handleUpvote = useCallback(async (potholeId, markFixed = false) => {
    if (!pothole) return;
    const weight = getWeight();

    const optimisticUpdates = markFixed
      ? { status: 'fixed', fixed_by: currentUser?.id || '' }
      : pothole.status === 'fixed'
        ? { status: 'disputed', disputed_by: currentUser?.id || '' }
        : { upvotes: (Number(pothole.upvotes) || 0) + weight, last_confirmed_date: new Date().toISOString() };

    setPothole(prev => prev?.id === potholeId ? { ...prev, ...optimisticUpdates } : prev);

    try {
      const rep = await getOrCreateRep();

      if (markFixed) {
        await base44.entities.PotholeReport.update(potholeId, { status: 'fixed', fixed_by: currentUser?.id || '' });
        if (rep) {
          await base44.entities.UserReputation.update(rep.id, {
            karma: (rep.karma || 0) + 5,
            fixes_marked: (rep.fixes_marked || 0) + 1,
          });
          setUserRep(prev => prev ? { ...prev, karma: (prev.karma || 0) + 5, fixes_marked: (prev.fixes_marked || 0) + 1 } : prev);
        }
        if (pothole.submission_email) {
          try {
            await base44.integrations.Core.SendEmail({
              to: pothole.submission_email,
              subject: `Thank you — Pothole fixed at ${pothole.address || `${pothole.latitude}, ${pothole.longitude}`}`,
              body: `The community has confirmed that the pothole at this location has been filled:\n\n${pothole.address || `${pothole.latitude}, ${pothole.longitude}`}\n\nThank you for your quick response and for keeping our roads safe!\n\n— PotholePing Community`,
            });
          } catch (e) {}
        }
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#22c55e', '#f97316', '#fbbf24', '#3b82f6'] });
      } else if (pothole.status === 'fixed') {
        await base44.entities.PotholeReport.update(potholeId, { status: 'disputed', disputed_by: currentUser?.id || '' });
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
          setUserRep(prev => prev ? { ...prev, karma: (prev.karma || 0) + 3, confirmations_given: (prev.confirmations_given || 0) + 1 } : prev);
        }
      } else {
        await base44.entities.PotholeReport.update(potholeId, {
          upvotes: (Number(pothole.upvotes) || 0) + weight,
          last_confirmed_date: new Date().toISOString(),
        });
        if (rep) {
          await base44.entities.UserReputation.update(rep.id, {
            karma: (rep.karma || 0) + 2,
            confirmations_given: (rep.confirmations_given || 0) + 1,
          });
          setUserRep(prev => prev ? { ...prev, karma: (prev.karma || 0) + 2, confirmations_given: (prev.confirmations_given || 0) + 1 } : prev);
        }
      }
    } catch (e) {
      loadPothole();
    }
  }, [pothole, currentUser, userRep]);

  const handleSeverityChange = useCallback(async (potholeId, newSeverity) => {
    await base44.entities.PotholeReport.update(potholeId, { severity: newSeverity });
    setPothole(prev => prev?.id === potholeId ? { ...prev, severity: newSeverity } : prev);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pothole) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-3 px-4">
        <p className="text-muted-foreground">Pothole not found</p>
        <button onClick={() => navigate('/')} className="text-primary text-sm hover:underline">
          Back to map
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-lg mx-auto p-4 pb-20 sm:pb-4">
        <PotholeDetail
          pothole={pothole}
          currentUserId={currentUser?.id}
          onBack={() => navigate(-1)}
          onUpvote={handleUpvote}
          onSeverityChange={handleSeverityChange}
        />
      </div>
    </div>
  );
}