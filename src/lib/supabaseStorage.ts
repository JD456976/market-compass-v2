import { supabase } from '@/integrations/supabase/client';
import { Session, MarketProfile } from '@/types';

// Generate a share token for public links
function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

// ============================================
// SESSIONS - Supabase CRUD
// ============================================

export async function loadSessionsFromSupabase(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load sessions:', error);
    return [];
  }

  return (data || []).map(mapDbSessionToSession);
}

export async function getSessionByIdFromSupabase(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to get session:', error);
    return null;
  }

  return data ? mapDbSessionToSession(data) : null;
}

export async function getSessionByShareToken(shareToken: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('share_token', shareToken)
    .eq('share_link_created', true)
    .eq('share_token_revoked', false)
    .maybeSingle();

  if (error) {
    console.error('Failed to get session by share token:', error);
    return null;
  }

  return data ? mapDbSessionToSession(data) : null;
}

export async function upsertSessionToSupabase(session: Session): Promise<Session | null> {
  const now = new Date().toISOString();
  
  // Check if session exists to preserve share_token
  const { data: existing } = await supabase
    .from('sessions')
    .select('id, share_token, created_at')
    .eq('id', session.id)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbSession: any = {
    id: session.id,
    session_type: session.session_type,
    client_name: session.client_name,
    location: session.location,
    property_type: session.property_type,
    condition: session.condition,
    selected_market_profile_id: session.selected_market_profile_id || null,
    market_scenario_id: session.market_scenario_id || null,
    market_scenario_overrides: session.market_scenario_overrides || null,
    market_snapshot_id: session.market_snapshot_id || null,
    seller_inputs: session.seller_inputs || null,
    buyer_inputs: session.buyer_inputs || null,
    share_link_created: session.share_link_created || false,
    share_token: existing?.share_token || (session.share_link_created ? generateShareToken() : null),
    pdf_exported: session.pdf_exported || false,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('sessions')
    .upsert(dbSession, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Failed to upsert session:', error);
    return null;
  }

  return data ? mapDbSessionToSession(data) : null;
}

export async function deleteSessionFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete session:', error);
    return false;
  }

  return true;
}

export async function createShareLink(sessionId: string): Promise<string | null> {
  const shareToken = generateShareToken();
  
  const { data, error } = await supabase
    .from('sessions')
    .update({ 
      share_link_created: true, 
      share_token: shareToken 
    })
    .eq('id', sessionId)
    .select('share_token')
    .single();

  if (error) {
    console.error('Failed to create share link:', error);
    return null;
  }

  return data?.share_token || null;
}

// ============================================
// MARKET PROFILES - Supabase CRUD
// ============================================

export async function loadMarketProfilesFromSupabase(): Promise<MarketProfile[]> {
  const { data, error } = await supabase
    .from('market_profiles')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load market profiles:', error);
    return [];
  }

  return (data || []).map(mapDbProfileToProfile);
}

export async function getMarketProfileByIdFromSupabase(id: string): Promise<MarketProfile | null> {
  const { data, error } = await supabase
    .from('market_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to get market profile:', error);
    return null;
  }

  return data ? mapDbProfileToProfile(data) : null;
}

export async function upsertMarketProfileToSupabase(profile: MarketProfile): Promise<MarketProfile | null> {
  const now = new Date().toISOString();

  const dbProfile = {
    id: profile.id,
    label: profile.label,
    location: profile.location,
    property_type: profile.property_type,
    typical_sale_to_list: profile.typical_sale_to_list,
    typical_dom: profile.typical_dom,
    multiple_offers_frequency: profile.multiple_offers_frequency,
    contingency_tolerance: profile.contingency_tolerance,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('market_profiles')
    .upsert(dbProfile, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Failed to upsert market profile:', error);
    return null;
  }

  return data ? mapDbProfileToProfile(data) : null;
}

export async function deleteMarketProfileFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('market_profiles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete market profile:', error);
    return false;
  }

  return true;
}

// ============================================
// TYPE MAPPERS
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbSessionToSession(db: any): Session {
  return {
    id: db.id,
    session_type: db.session_type as Session['session_type'],
    client_name: db.client_name,
    location: db.location,
    property_type: db.property_type as Session['property_type'],
    condition: db.condition as Session['condition'],
    selected_market_profile_id: db.selected_market_profile_id || undefined,
    market_scenario_id: db.market_scenario_id || undefined,
    market_scenario_overrides: db.market_scenario_overrides as Session['market_scenario_overrides'],
    market_snapshot_id: db.market_snapshot_id || undefined,
    seller_inputs: db.seller_inputs as Session['seller_inputs'],
    buyer_inputs: db.buyer_inputs as Session['buyer_inputs'],
    share_link_created: db.share_link_created || false,
    pdf_exported: db.pdf_exported || false,
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbProfileToProfile(db: any): MarketProfile {
  return {
    id: db.id,
    label: db.label,
    location: db.location,
    property_type: db.property_type as MarketProfile['property_type'],
    typical_sale_to_list: db.typical_sale_to_list as MarketProfile['typical_sale_to_list'],
    typical_dom: db.typical_dom as MarketProfile['typical_dom'],
    multiple_offers_frequency: db.multiple_offers_frequency as MarketProfile['multiple_offers_frequency'],
    contingency_tolerance: db.contingency_tolerance as MarketProfile['contingency_tolerance'],
    updated_at: db.updated_at,
  };
}

// ============================================
// ERROR TYPES for better UX
// ============================================

export type ReportError = 
  | { type: 'not_found'; message: string }
  | { type: 'access_denied'; message: string }
  | { type: 'revoked'; message: string }
  | { type: 'unknown'; message: string };

export function getReportErrorMessage(error: ReportError): string {
  switch (error.type) {
    case 'not_found':
      return 'This report no longer exists.';
    case 'access_denied':
      return 'You do not have access to this report.';
    case 'revoked':
      return 'This shared report is no longer available.';
    default:
      return 'An error occurred loading this report.';
  }
}
