import { useState, useEffect, useRef, useCallback } from 'react';
import { Session } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export interface RecallMatch {
  session: Session;
  matchType: 'exact_address' | 'same_location';
}

/**
 * Hook to find previous sessions that match a given address/location.
 * Enables agents to quickly re-load property details for re-analysis.
 */
export function useAddressRecall(
  fullAddress: string,
  location: string,
  currentDraftId: string,
) {
  const [matches, setMatches] = useState<RecallMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (addr: string, loc: string) => {
    if (!addr.trim() && !loc.trim()) {
      setMatches([]);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMatches([]);
        return;
      }

      // Query sessions owned by this user, excluding the current draft
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('owner_user_id', user.id)
        .neq('id', currentDraftId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error || !data) {
        setMatches([]);
        return;
      }

      const normalizedAddr = addr.trim().toLowerCase().replace(/[.,#]/g, '').replace(/\s+/g, ' ');
      const normalizedLoc = loc.trim().toLowerCase();

      const results: RecallMatch[] = [];

      for (const row of data) {
        // Check exact address match via address_fields JSONB
        const dbAddr = (row.address_fields as any)?.address_line;
        if (dbAddr && normalizedAddr.length > 5) {
          const normalizedDbAddr = String(dbAddr).toLowerCase().replace(/[.,#]/g, '').replace(/\s+/g, ' ');
          if (normalizedDbAddr === normalizedAddr || normalizedDbAddr.includes(normalizedAddr) || normalizedAddr.includes(normalizedDbAddr)) {
            results.push({
              session: mapRow(row),
              matchType: 'exact_address',
            });
            continue;
          }
        }

        // Fallback: match on location (town)
        if (normalizedLoc.length > 2) {
          const dbLoc = String(row.location || '').toLowerCase();
          if (dbLoc === normalizedLoc || dbLoc.startsWith(normalizedLoc) || normalizedLoc.startsWith(dbLoc)) {
            results.push({
              session: mapRow(row),
              matchType: 'same_location',
            });
          }
        }
      }

      // Prioritize exact address matches, limit to 3
      const sorted = results
        .sort((a, b) => {
          if (a.matchType === 'exact_address' && b.matchType !== 'exact_address') return -1;
          if (b.matchType === 'exact_address' && a.matchType !== 'exact_address') return 1;
          return new Date(b.session.updated_at).getTime() - new Date(a.session.updated_at).getTime();
        })
        .slice(0, 3);

      setMatches(sorted);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [currentDraftId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(fullAddress, location);
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fullAddress, location, search]);

  const dismiss = useCallback(() => {
    setMatches([]);
  }, []);

  return { matches, loading, dismiss };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Session {
  return {
    id: row.id,
    session_type: row.session_type,
    client_name: row.client_name,
    location: row.location,
    property_type: row.property_type,
    condition: row.condition,
    selected_market_profile_id: row.selected_market_profile_id || undefined,
    market_scenario_id: row.market_scenario_id || undefined,
    market_scenario_overrides: row.market_scenario_overrides,
    market_snapshot_id: row.market_snapshot_id || undefined,
    address_fields: row.address_fields,
    property_factors: row.property_factors,
    seller_inputs: row.seller_inputs,
    buyer_inputs: row.buyer_inputs,
    share_link_created: row.share_link_created || false,
    pdf_exported: row.pdf_exported || false,
    archived: row.archived || false,
    archived_at: row.archived_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
