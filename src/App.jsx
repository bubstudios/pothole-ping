import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Home from '@/pages/Home';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-red-100 gap-2">
        <div className="w-12 h-12 border-8 border-blue-500 border-t-yellow-500 rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-red-600">Loading app... (auth check)</p>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
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

  // Render the main app
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 bg-green-500 text-white font-bold">App Loaded Successfully</div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </div>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App