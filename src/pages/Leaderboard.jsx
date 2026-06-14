import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Trophy, Medal, Award, MapPin, ThumbsUp, CheckCircle, Camera, MessageCircle, Star, Flame, Loader2 } from 'lucide-react';

const BADGES = [
  { id: 'first_report', icon: '🥚', label: 'First Report', desc: 'Reported your first pothole', check: (s) => s.reports >= 1 },
  { id: 'citizen', icon: '🐣', label: 'Citizen Reporter', desc: '5 reports submitted', check: (s) => s.reports >= 5 },
  { id: 'inspector', icon: '🐔', label: 'Street Inspector', desc: '25 reports submitted', check: (s) => s.reports >= 25 },
  { id: 'hunter', icon: '🦅', label: 'Pothole Hunter', desc: '50 reports submitted', check: (s) => s.reports >= 50 },
  { id: 'photo', icon: '📸', label: 'Photo Evidence', desc: 'Added a photo to a report', check: (s) => s.photos >= 1 },
  { id: 'fix_witness', icon: '✅', label: 'Fix Witness', desc: 'Had a report marked as fixed', check: (s) => s.fixed >= 1 },
  { id: 'commentator', icon: '💬', label: 'Commentator', desc: 'Added 5 comments', check: (s) => s.comments >= 5 },
  { id: 'hot_report', icon: '🔥', label: 'Hot Report', desc: 'A report reached 10+ upvotes', check: (s) => s.hotReport },
  { id: 'top_three', icon: '🏆', label: 'Top 3', desc: 'Ranked in the top 3 reporters', check: () => false }, // handled separately
  { id: 'century', icon: '💯', label: 'Century Mark', desc: '100 total upvotes received', check: (s) => s.totalUpvotes >= 100 },
];

export default function Leaderboard() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [reports, comments, users] = await Promise.all([
      base44.entities.PotholeReport.list('-created_date', 500),
      base44.entities.PotholeComment.list('-created_date', 500),
      base44.entities.User.list(),
    ]);

    // Build user stats
    const userMap = {};
    for (const u of users) {
      userMap[u.id] = {
        id: u.id,
        name: u.full_name || 'Anonymous',
        email: u.email,
        reports: 0,
        fixed: 0,
        totalUpvotes: 0,
        photos: 0,
        hotReport: false,
        comments: 0,
        badges: [],
      };
    }

    for (const r of reports) {
      const uid = r.created_by_id;
      if (!userMap[uid]) {
        userMap[uid] = { id: uid, name: 'Anonymous', reports: 0, fixed: 0, totalUpvotes: 0, photos: 0, hotReport: false, comments: 0, badges: [] };
      }
      userMap[uid].reports++;
      userMap[uid].totalUpvotes += r.upvotes || 0;
      if (r.status === 'fixed') userMap[uid].fixed++;
      if (r.photo_url) userMap[uid].photos++;
      if ((r.upvotes || 0) >= 10) userMap[uid].hotReport = true;
    }

    for (const c of comments) {
      const uid = c.created_by_id;
      if (uid && userMap[uid]) {
        userMap[uid].comments++;
      }
    }

    // Sort by reports desc
    const sorted = Object.values(userMap).sort((a, b) => b.reports - a.reports);

    // Assign badges
    for (const s of sorted) {
      for (const badge of BADGES) {
        if (badge.id === 'top_three') continue; // handled below
        if (badge.check(s)) {
          s.badges.push(badge);
        }
      }
    }

    // Top 3 badge
    const topThree = sorted.slice(0, 3);
    for (let i = 0; i < topThree.length; i++) {
      const rankBadge = ['🥇', '🥈', '🥉'][i];
      topThree[i].badges.push({
        id: 'top_three',
        icon: rankBadge,
        label: `#${i + 1} Reporter`,
        desc: `Ranked #${i + 1} on the leaderboard`,
        check: () => true,
      });
    }

    setStats(sorted);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-4 bg-card border-b sticky top-0 z-10">
        <Link to="/" className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-heading font-bold text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
          </h1>
          <p className="text-xs text-muted-foreground">Top pothole reporters & achievements</p>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="max-w-2xl mx-auto p-4 space-y-6">

          {/* Top 3 Spotlight */}
          {stats.slice(0, 3).length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {stats.slice(0, 3).map((s, i) => (
                <div
                  key={s.id}
                  className={`rounded-xl p-4 text-center border-2 ${
                    i === 0
                      ? 'border-yellow-400 bg-yellow-50'
                      : i === 1
                      ? 'border-gray-300 bg-gray-50'
                      : 'border-orange-300 bg-orange-50'
                  }`}
                >
                  <p className="text-2xl mb-1">{['🥇', '🥈', '🥉'][i]}</p>
                  <p className="font-heading font-bold text-sm truncate">{s.name}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{s.reports}</p>
                  <p className="text-xs text-muted-foreground">reports</p>
                </div>
              ))}
            </div>
          )}

          {/* Full Leaderboard */}
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="p-4 border-b bg-muted/50">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
                <Medal className="w-4 h-4" />
                All Reporters
              </h2>
            </div>
            <div className="divide-y">
              {stats.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-400 text-yellow-900' :
                    i === 1 ? 'bg-gray-300 text-gray-700' :
                    i === 2 ? 'bg-orange-300 text-orange-800' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.reports}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{s.totalUpvotes}</span>
                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{s.fixed}</span>
                    </div>
                  </div>
                  <div className="flex -space-x-1">
                    {s.badges.slice(0, 4).map((b) => (
                      <span key={b.id} className="text-lg leading-none" title={b.label}>{b.icon}</span>
                    ))}
                    {s.badges.length > 4 && (
                      <span className="text-xs bg-muted rounded-full px-1.5 py-0.5 font-medium">+{s.badges.length - 4}</span>
                    )}
                  </div>
                </div>
              ))}
              {stats.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No reports yet — be the first!</p>
                </div>
              )}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="p-4 border-b bg-muted/50">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
                <Award className="w-4 h-4" />
                Achievements
              </h2>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BADGES.map((badge) => {
                const earners = stats.filter((s) => s.badges.some((b) => b.id === badge.id));
                return (
                  <div
                    key={badge.id}
                    className="bg-muted/50 rounded-lg p-3 text-center hover:bg-muted transition-colors"
                  >
                    <p className="text-2xl mb-1">{badge.icon}</p>
                    <p className="text-xs font-heading font-semibold">{badge.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{badge.desc}</p>
                    <p className="text-xs text-primary font-medium mt-1">
                      {earners.length} earned
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}