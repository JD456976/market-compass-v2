import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { isAllowedAdmin } from '@/lib/adminConfig';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { getBetaAccessSession, clearBetaAccessSession } from '@/lib/betaAccess';

type AuthState = 'loading' | 'unauthorized' | 'authorized';

const Admin = () => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const session = getBetaAccessSession();
      
      if (!session) {
        // No session - redirect to beta access
        navigate('/beta', { replace: true });
        return;
      }

      const email = session.email;
      setUserEmail(email);

      // Check if admin
      if (session.role === 'admin' && isAllowedAdmin(email)) {
        setAuthState('authorized');
      } else {
        // Not an admin - redirect to home
        setAuthState('unauthorized');
        setTimeout(() => navigate('/', { replace: true }), 2000);
      }
    };

    checkAuth();
  }, [navigate]);

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
          <h1 className="text-2xl font-serif font-semibold">Not Authorized</h1>
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
