export interface AgentProfile {
  agent_name: string;
  brokerage_name: string;
  phone: string;
  email: string;
  website?: string;
  license?: string;
  custom_cta?: string;
}

const AGENT_PROFILE_KEY = 'reality_engine_agent_profile';

const DEFAULT_PROFILE: AgentProfile = {
  agent_name: 'Jason Craig',
  brokerage_name: 'Chinatti Realty Group',
  phone: '774-256-2089',
  email: 'jason.craig@chinattirealty.com',
  website: 'bostonsuburbliving.com',
  license: '9628503-RE-S',
  custom_cta: '',
};

export function loadAgentProfile(): AgentProfile {
  try {
    const data = localStorage.getItem(AGENT_PROFILE_KEY);
    if (!data) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveAgentProfile(profile: AgentProfile): void {
  localStorage.setItem(AGENT_PROFILE_KEY, JSON.stringify(profile));
}
