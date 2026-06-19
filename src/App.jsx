// PotholePing App Router
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
      <Routes>
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
    </ThemeProvider>
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