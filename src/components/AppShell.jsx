import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import BottomNav from './BottomNav';
import Home from '@/pages/Home';
import Leaderboard from '@/pages/Leaderboard';
import HallOfShame from '@/pages/HallOfShame';
import BureaucracyTracker from '@/pages/BureaucracyTracker';
import WatchZones from '@/pages/WatchZones';
import Settings from '@/pages/Settings';
import ManageSponsors from '@/pages/ManageSponsors';

const TABS = [
  { path: '/', Page: Home },
  { path: '/leaderboard', Page: Leaderboard },
  { path: '/hall-of-shame', Page: HallOfShame },
  { path: '/bureaucracy', Page: BureaucracyTracker },
  { path: '/watch-zones', Page: WatchZones },
  { path: '/settings', Page: Settings },
  { path: '/manage-sponsors', Page: ManageSponsors },
];

export default function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {TABS.map(({ path, Page }) => {
            const isActive = location.pathname === path;
            return (
              <div key={path} className={isActive ? '' : 'hidden'}>
                <Page />
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}