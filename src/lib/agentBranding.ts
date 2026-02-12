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

// Load branding for a shared report (by session owner)
export async function loadBrandingForSession(sessionOwnerId: string): Promise<AgentBranding | null> {
  const { data, error } = await supabase
    .from('agent_branding')
    .select('*')
    .eq('user_id', sessionOwnerId)
    .maybeSingle();

  if (error || !data) return null;

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
