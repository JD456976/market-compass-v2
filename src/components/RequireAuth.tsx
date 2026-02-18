import { ReactNode } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlement } from '@/contexts/EntitlementContext';
import { useUserRole } from '@/hooks/useUserRole';
import { BetaCodeRedemption } from '@/components/BetaCodeRedemption';
import { Loader2 } from 'lucide-react';

// Routes that bypass entitlement gating (auth-only, no subscription required)
const ENTITLEMENT_FREE_ROUTES = [
  '/settings',
  '/subscription',
  '/pricing',
  '/my-reports',
  '/invite',
];

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading: authLoading } = useAuth();
  const { entitlementState, loading: entLoading, refresh } = useEntitlement();
  const { role, loading: roleLoading } = useUserRole();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const claim = searchParams.get('claim');

  const isLoadingAny = authLoading || entLoading || roleLoading;

  if (isLoadingAny) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user) {
    const loginPath = claim ? `/login?claim=${claim}` : '/login';
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  // Clients (role=client) skip entitlement gate — they access their own reports
  const isClient = role === 'client';
  const isReviewer = role === 'reviewer' || role === 'admin';

  // Skip entitlement gate for specific routes
  const skipGating = ENTITLEMENT_FREE_ROUTES.some(r => location.pathname.startsWith(r));

  if (!skipGating && !isClient && !isReviewer) {
    const { betaActive, betaExpired, betaExpiresAt, isPro, isTrial } = entitlementState;
    const hasAccess = betaActive || isPro || isTrial;

    if (!hasAccess) {
      // Show beta code entry / paywall screen
      return (
        <BetaCodeRedemption
          onSuccess={() => refresh()}
          betaExpired={betaExpired}
          expiresAt={betaExpiresAt}
        />
      );
    }
  }

  return <>{children}</>;
}
