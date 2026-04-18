import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { isAllowedAdmin } from '@/lib/adminConfig';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { getBetaAccessSession, clearBetaAccessSession } from '@/lib/betaAccess';
import { useAuth } from '@/contexts/AuthContext';

type AuthState = 'loading' | 'unauthorized' | 'authorized';

const Admin = () => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    // Priority 1: Supabase-authenticated admin (no beta code needed)
    if (user?.email && isAllowedAdmin(user.email)) {
      setUserEmail(user.email);
      setAuthState('authorized');
      return;
    }

    // Priority 2: Legacy beta access session with admin role
    const session = getBetaAccessSession();
    if (session?.role === 'admin' && isAllowedAdmin(session.email)) {
      setUserEmail(session.email);
      setAuthState('authorized');
      return;
    }

    // No valid admin access
    setAuthState('unauthorized');
    setTimeout(() => navigate(user ? '/' : '/beta', { replace: true }), 1500);
  }, [user, authLoading, navigate]);

  const handleSignOut = () => {
    clearBetaAccessSession();
    navigate('/beta', { replace: true });
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthorized') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-sans font-semibold">Not Authorized</h1>
          <p className="text-muted-foreground">
            {userEmail} is not authorized to access admin.
          </p>
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <AdminDashboard userEmail={userEmail} onSignOut={handleSignOut} />;
};

export default Admin;
