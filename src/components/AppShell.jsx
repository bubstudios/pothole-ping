import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRef, useEffect } from 'react';
import BottomNav from './BottomNav';
import Home from '@/pages/Home';
import Leaderboard from '@/pages/Leaderboard';
import HallOfShame from '@/pages/HallOfShame';
import BureaucracyTracker from '@/pages/BureaucracyTracker';
import WatchZones from '@/pages/WatchZones';
import Settings from '@/pages/Settings';
import ManageSponsors from '@/pages/ManageSponsors';
import PhotoGallery from '@/pages/PhotoGallery';
import AnalyticsDashboard from '@/pages/AnalyticsDashboard';
import CommuteSaver from '@/pages/CommuteSaver';
import AdminDashboard from '@/pages/AdminDashboard';
import MyReports from '@/pages/MyReports';
import StateOfRoads from '@/pages/StateOfRoads';

const TABS = [
  { path: '/', Page: Home },
  { path: '/commute', Page: CommuteSaver },
  { path: '/leaderboard', Page: Leaderboard },
  { path: '/hall-of-shame', Page: HallOfShame },
  { path: '/bureaucracy', Page: BureaucracyTracker },
  { path: '/report-card', Page: StateOfRoads },
  { path: '/watch-zones', Page: WatchZones },
  { path: '/photos', Page: PhotoGallery },
  { path: '/analytics', Page: AnalyticsDashboard },
  { path: '/my-reports', Page: MyReports },
  { path: '/admin', Page: AdminDashboard },
  { path: '/settings', Page: Settings },
  { path: '/manage-sponsors', Page: ManageSponsors },
];

export default function AppShell() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const directionRef = useRef(1);

  useEffect(() => {
    const prevIdx = TABS.findIndex((t) => t.path === prevPathRef.current);
    const currIdx = TABS.findIndex((t) => t.path === location.pathname);
    // Forward = moving right in tabs array; Back = moving left
    directionRef.current = currIdx >= prevIdx ? 1 : -1;
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden">
      {TABS.map(({ path, Page }) => {
        const active = location.pathname === path;
        const dir = directionRef.current;
        return (
          <motion.div
            key={path}
            initial={false}
            animate={{
              x: active ? 0 : -dir * 150,
              opacity: active ? 1 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'absolute',
              inset: 0,
              visibility: active ? 'visible' : 'hidden',
              pointerEvents: active ? 'auto' : 'none',
              zIndex: active ? 10 : 0,
            }}
          >
            <div className="h-full overflow-y-auto">
              <Page />
            </div>
          </motion.div>
        );
      })}
      <BottomNav />
    </div>
  );
}