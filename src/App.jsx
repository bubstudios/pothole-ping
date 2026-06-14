import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import Home from '@/pages/Home';
import Leaderboard from '@/pages/Leaderboard';
import HallOfShame from '@/pages/HallOfShame';
import BureaucracyTracker from '@/pages/BureaucracyTracker';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-3">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <p className="text-muted-foreground text-sm">Redirecting to login...</p>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Error: {authError.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fee', color: '#c00', fontFamily: 'monospace', fontSize: 14, whiteSpace: 'pre-wrap' }}>
          <h3>React Error Boundary</h3>
          <p>{this.state.error?.message || 'Unknown error'}</p>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App