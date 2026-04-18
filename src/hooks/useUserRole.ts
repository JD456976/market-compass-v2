import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'agent' | 'client' | 'admin' | 'moderator' | 'user' | 'reviewer';

// Module-level cache — survives remounts caused by route-key transitions.
// Cleared on sign-out (userId changes to undefined).
const _roleCache: Record<string, UserRole> = {};

export function useUserRole() {
  const { user } = useAuth();
  const cached = user?.id ? _roleCache[user.id] : undefined;
  const [role, setRole] = useState<UserRole | null>(cached ?? null);
  const [loading, setLoading] = useState(cached === undefined && !!user);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    // Cache hit — no network call needed
    if (_roleCache[user.id]) {
      setRole(_roleCache[user.id]);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const resolved: UserRole = error ? 'agent' : ((data?.role as UserRole) ?? 'agent');
      if (error) console.error('Error fetching user role:', error);
      _roleCache[user.id] = resolved;
      setRole(resolved);
      setLoading(false);
    };

    fetchRole();
  }, [user?.id]);

  return {
    role,
    loading,
    isAgent: role === 'agent' || role === 'admin' || role === 'reviewer',
    isClient: role === 'client',
    isAdmin: role === 'admin',
    isReviewer: role === 'reviewer',
  };
}
