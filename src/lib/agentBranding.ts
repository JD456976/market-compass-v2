import { supabase } from '@/integrations/supabase/client';

export interface AgentBranding {
  id?: string;
  user_id: string;
  logo_url?: string | null;
  headshot_url?: string | null;
  primary_color: string;
  accent_color: string;
  footer_text?: string | null;
  social_links?: Record<string, string>;
  report_template: string;
  // Profile fields — populated when loading for a shared report
  agent_name?: string | null;
  brokerage?: string | null;
  phone?: string | null;
  email?: string | null;
  license?: string | null;
}

const DEFAULT_BRANDING: Omit<AgentBranding, 'user_id'> = {
  primary_color: '#2d3a4a',
  accent_color: '#c8842e',
  report_template: 'modern',
  social_links: {},
};

export async function loadAgentBranding(userId: string): Promise<AgentBranding> {
  const { data, error } = await supabase
    .from('agent_branding')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_BRANDING, user_id: userId };
  }

  return {
    id: data.id,
    user_id: data.user_id,
    logo_url: data.logo_url,
    headshot_url: data.headshot_url,
    primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
    accent_color: data.accent_color || DEFAULT_BRANDING.accent_color,
    footer_text: data.footer_text,
    social_links: (data.social_links as Record<string, string>) || {},
    report_template: data.report_template || 'modern',
  };
}

export async function saveAgentBranding(branding: AgentBranding): Promise<void> {
  const { error } = await supabase
    .from('agent_branding')
    .upsert({
      user_id: branding.user_id,
      logo_url: branding.logo_url,
      headshot_url: branding.headshot_url,
      primary_color: branding.primary_color,
      accent_color: branding.accent_color,
      footer_text: branding.footer_text,
      social_links: branding.social_links,
      report_template: branding.report_template,
    }, { onConflict: 'user_id' });

  if (error) throw error;
}

export async function uploadAgentAsset(
  userId: string,
  file: File,
  type: 'logo' | 'headshot'
): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${type}.${ext}`;

  const { error } = await supabase.storage
    .from('agent-assets')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('agent-assets').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Load branding + profile data for a shared report (by session owner).
 * Fetches agent_branding (headshot, logo, colors) AND profiles (name, contact)
 * so shared reports show real, personalised agent information.
 */
export async function loadBrandingForSession(sessionOwnerId: string): Promise<AgentBranding | null> {
  const [brandingRes, profileRes] = await Promise.all([
    supabase
      .from('agent_branding')
      .select('*')
      .eq('user_id', sessionOwnerId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('full_name, brokerage, phone, email, license, avatar_url')
      .eq('user_id', sessionOwnerId)
      .maybeSingle(),
  ]);

  const b = brandingRes.data;
  const p = profileRes.data;

  if (!b && !p) return null;

  return {
    id: b?.id,
    user_id: sessionOwnerId,
    logo_url: b?.logo_url ?? null,
    // Prefer branding headshot; fall back to profile avatar
    headshot_url: b?.headshot_url ?? p?.avatar_url ?? null,
    primary_color: b?.primary_color || DEFAULT_BRANDING.primary_color,
    accent_color: b?.accent_color || DEFAULT_BRANDING.accent_color,
    footer_text: b?.footer_text ?? null,
    social_links: (b?.social_links as Record<string, string>) || {},
    report_template: b?.report_template || 'modern',
    // Live profile identity fields
    agent_name: p?.full_name ?? null,
    brokerage: p?.brokerage ?? null,
    phone: p?.phone ?? null,
    email: p?.email ?? null,
    license: p?.license ?? null,
  };
}
