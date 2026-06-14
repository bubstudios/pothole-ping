// PotholePing App Router v3
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import Leaderboard from '@/pages/Leaderboard';
import HallOfShame from '@/pages/HallOfShame';
import BureaucracyTracker from '@/pages/BureaucracyTracker';
import WatchZones from '@/pages/WatchZones';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <div style={{ padding: 40, background: '#ff0' }}><h2>Loading...</h2></div>;
  }

  if (authError) {
    if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<Home />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/hall-of-shame" element={<HallOfShame />} />
        <Route path="/bureaucracy" element={<BureaucracyTracker />} />
        <Route path="/watch-zones" element={<WatchZones />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App