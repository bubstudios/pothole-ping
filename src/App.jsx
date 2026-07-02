// PotholePing App Router
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import ThemeProvider from '@/components/ThemeProvider';
import AppShell from '@/components/AppShell';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import PotholeDetailPage from '@/pages/PotholeDetailPage';
import PublicMap from '@/pages/PublicMap';
import Donate from '@/pages/Donate';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import OneSignalInit from '@/components/OneSignalInit';

const pageVariants = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: '-30%', opacity: 0, transition: { duration: 0.15 } },
};

const STANDALONE_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/map', '/donate'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <div style={{ padding: 40 }} className="bg-background"><h2>Loading...</h2></div>;
  }

  if (authError) {
    if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
    return <UserNotRegisteredError />;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AnimatePresence mode="wait">
        <motion.div
          key={STANDALONE_ROUTES.includes(location.pathname) || location.pathname.startsWith('/pothole/') ? location.pathname : '__app__'}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}
        >
          <Routes location={location}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/map" element={<PublicMap />} />
            <Route path="/donate" element={<Donate />} />
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              <Route path="/pothole/:id" element={<PotholeDetailPage />} />
              <Route path="/*" element={<AppShell />} />
            </Route>
          </Routes>
        </motion.div>
      </AnimatePresence>
    </ThemeProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
          <OneSignalInit />
        </Router>
        <PwaInstallPrompt />
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App