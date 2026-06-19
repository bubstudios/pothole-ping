import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from './BottomNav';

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
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}