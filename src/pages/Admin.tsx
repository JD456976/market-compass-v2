import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isAllowedAdmin } from '@/lib/adminConfig';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AuthState = 'loading' | 'unauthenticated' | 'unauthorized' | 'authorized';

const Admin = () => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setAuthState('unauthenticated');
        return;
      }

      const email = session.user.email;
      setUserEmail(email || null);

      if (isAllowedAdmin(email)) {
        setAuthState('authorized');
      } else {
        setAuthState('unauthorized');
        toast({
          title: 'Not authorized',
          description: 'Your account is not authorized to access admin.',
          variant: 'destructive',
        });
        // Sign out unauthorized users
        await supabase.auth.signOut();
        setTimeout(() => setAuthState('unauthenticated'), 2000);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const email = session.user.email;
        setUserEmail(email || null);
        
        if (isAllowedAdmin(email)) {
          setAuthState('authorized');
        } else {
          setAuthState('unauthorized');
          toast({
            title: 'Not authorized',
            description: 'Your account is not authorized to access admin.',
            variant: 'destructive',
          });
          await supabase.auth.signOut();
          setTimeout(() => setAuthState('unauthenticated'), 2000);
        }
      } else if (event === 'SIGNED_OUT') {
        setAuthState('unauthenticated');
        setUserEmail(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthState('unauthenticated');
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
          <p className="text-sm text-muted-foreground">Signing out...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <AdminLogin />;
  }

  return <AdminDashboard userEmail={userEmail} onSignOut={handleSignOut} />;
};

export default Admin;
