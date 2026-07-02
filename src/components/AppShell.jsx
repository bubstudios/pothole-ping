import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRef, useEffect, useState, Suspense, lazy } from 'react';
import BottomNav from './BottomNav';

const Home = lazy(() => import('@/pages/Home'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const HallOfShame = lazy(() => import('@/pages/HallOfShame'));
const BureaucracyTracker = lazy(() => import('@/pages/BureaucracyTracker'));
const WatchZones = lazy(() => import('@/pages/WatchZones'));
const Settings = lazy(() => import('@/pages/Settings'));
const ManageSponsors = lazy(() => import('@/pages/ManageSponsors'));
const PhotoGallery = lazy(() => import('@/pages/PhotoGallery'));
const AnalyticsDashboard = lazy(() => import('@/pages/AnalyticsDashboard'));
const CommuteSaver = lazy(() => import('@/pages/CommuteSaver'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const MyReports = lazy(() => import('@/pages/MyReports'));
const StateOfRoads = lazy(() => import('@/pages/StateOfRoads'));

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
  const [mountedTabs, setMountedTabs] = useState(['/']);

  useEffect(() => {
    const prevIdx = TABS.findIndex((t) => t.path === prevPathRef.current);
    const currIdx = TABS.findIndex((t) => t.path === location.pathname);
    // Forward = moving right in tabs array; Back = moving left
    directionRef.current = currIdx >= prevIdx ? 1 : -1;
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.includes(location.pathname)) return prev;
      const next = [...prev, location.pathname];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
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
            aria-hidden={!active}
            style={{
              position: 'absolute',
              inset: 0,
              visibility: active ? 'visible' : 'hidden',
              pointerEvents: active ? 'auto' : 'none',
              zIndex: active ? 10 : 0,
            }}
          >
            <div className="h-full overflow-y-auto">
              <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}>
                {mountedTabs.includes(path) && <Page />}
              </Suspense>
            </div>
          </motion.div>
        );
      })}
      <BottomNav />
    </div>
  );
}