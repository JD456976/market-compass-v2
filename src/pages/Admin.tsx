import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { isAllowedAdmin } from '@/lib/adminConfig';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

type AuthState = 'loading' | 'unauthorized' | 'authorized';

const Admin = () => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (user?.email && isAllowedAdmin(user.email)) {
      setUserEmail(user.email);
      setAuthState('authorized');
      return;
    }

    setAuthState('unauthorized');
  }, [user, authLoading]);

  const handleSignOut = async () => {
    await signOut();
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
            {user?.email
              ? `${user.email} is not in the admin list.`
              : 'You must be signed in as an admin to access this page.'}
          </p>
          <Button onClick={() => navigate('/beta', { replace: true })} variant="outline">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return <AdminDashboard userEmail={userEmail} onSignOut={handleSignOut} />;
};

export default Admin;
