import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Moon, Sun, AlertTriangle, FileText } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function Settings() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('potholeping-scroll-reset', handler);
    return () => window.removeEventListener('potholeping-scroll-reset', handler);
  }, []);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await base44.functions.invoke('deleteAccount');
      base44.auth.logout('/login');
    } catch (e) {
      setDeleteError(e?.response?.data?.error || 'Failed to delete account. Try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background sm:pb-0 pb-14">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <Link to="/" className="p-1 -ml-1 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-heading font-bold text-lg">Settings</h1>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* My Reports */}
        <Link to="/my-reports" className="bg-card rounded-xl border p-4 flex items-center gap-3 hover:border-primary/30 transition-colors">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-sm">My Reports</p>
            <p className="text-xs text-muted-foreground">Track your reported potholes</p>
          </div>
        </Link>

        {/* Dark Mode Toggle */}
        <div className="bg-card rounded-xl border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Moon className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <p className="font-medium text-sm">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Toggle dark appearance</p>
            </div>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        </div>

        {/* Delete Account */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full bg-card rounded-xl border border-red-200 p-4 flex items-center gap-3 hover:bg-red-50 transition-colors text-left"
          >
            <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm text-red-600">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and data</p>
            </div>
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="font-heading font-semibold text-sm text-red-700">Delete your account?</p>
            </div>
            <p className="text-xs text-red-600">
              This will permanently delete your account, all reports, comments, reputation, and associated data. This cannot be undone.
            </p>
            {deleteError && (
              <p className="text-xs text-red-500 font-medium">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}