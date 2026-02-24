import { Session, PropertyType, Condition, DesiredTimeframe, StrategyPreference, FinancingType, DownPaymentPercent, Contingency, ClosingTimeline, BuyerPreference } from '@/types';

const TEMPLATES_KEY = 'reality_engine_templates';

export type ExplanatoryStyle = 'concise' | 'standard' | 'detailed';

export interface SessionTemplate {
  id: string;
  name: string;
  session_type: 'Seller' | 'Buyer';
  // Common defaults
  property_type: PropertyType;
  condition: Condition;
  // Market scenario reference
  market_scenario_id?: string;
  // Agent info defaults
  agent_defaults?: {
    agent_name?: string;
    agent_email?: string;
    agent_phone?: string;
    brokerage?: string;
  };
  // Explanatory style preference
  explanatory_style?: ExplanatoryStyle;
  // Notes boilerplate (optional)
  notes_boilerplate?: string;
  // Seller-specific defaults
  seller_defaults?: {
    desired_timeframe: DesiredTimeframe;
    strategy_preference: StrategyPreference;
  };
  // Buyer-specific defaults
  buyer_defaults?: {
    financing_type: FinancingType;
    down_payment_percent: DownPaymentPercent;
    contingencies: Contingency[];
    closing_timeline: ClosingTimeline;
    buyer_preference: BuyerPreference;
  };
  created_at: string;
  updated_at: string;
}

function safeParseArray<T>(data: string | null): T[] {
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadTemplates(): SessionTemplate[] {
  return safeParseArray<SessionTemplate>(localStorage.getItem(TEMPLATES_KEY));
}

export function saveTemplate(template: SessionTemplate): void {
  const templates = loadTemplates();
  const now = new Date().toISOString();
  const existingIndex = templates.findIndex(t => t.id === template.id);
  
  const templateToSave: SessionTemplate = {
    ...template,
    updated_at: now,
    created_at: existingIndex >= 0 ? templates[existingIndex].created_at : (template.created_at || now),
  };
  
  if (existingIndex >= 0) {
    templates[existingIndex] = templateToSave;
  } else {
    templates.push(templateToSave);
  }
  
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function deleteTemplate(id: string): void {
  const templates = loadTemplates().filter(t => t.id !== id);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function getTemplateById(id: string): SessionTemplate | undefined {
  return loadTemplates().find(t => t.id === id);
}

// Create a template from a session (strips client-specific data like name, address)
export function createTemplateFromSession(session: Session, templateName: string, options?: {
  market_scenario_id?: string;
  explanatory_style?: ExplanatoryStyle;
  notes_boilerplate?: string;
  agent_defaults?: SessionTemplate['agent_defaults'];
}): SessionTemplate {
  const now = new Date().toISOString();
  
  const template: SessionTemplate = {
    id: crypto.randomUUID(),
    name: templateName,
    session_type: session.session_type === 'touring_brief' ? 'Buyer' : session.session_type,
    property_type: session.property_type,
    condition: session.condition,
    market_scenario_id: options?.market_scenario_id || session.selected_market_profile_id,
    explanatory_style: options?.explanatory_style || 'standard',
    notes_boilerplate: options?.notes_boilerplate,
    agent_defaults: options?.agent_defaults,
    created_at: now,
    updated_at: now,
  };

  if (session.session_type === 'Seller' && session.seller_inputs) {
    template.seller_defaults = {
      desired_timeframe: session.seller_inputs.desired_timeframe,
      strategy_preference: session.seller_inputs.strategy_preference,
    };
  }

  if (session.session_type === 'Buyer' && session.buyer_inputs) {
    template.buyer_defaults = {
      financing_type: session.buyer_inputs.financing_type,
      down_payment_percent: session.buyer_inputs.down_payment_percent,
      contingencies: session.buyer_inputs.contingencies,
      closing_timeline: session.buyer_inputs.closing_timeline,
      buyer_preference: session.buyer_inputs.buyer_preference,
    };
  }

  return template;
}

// Create a blank template (not from a session)
export function createBlankTemplate(type: 'Seller' | 'Buyer', name: string): SessionTemplate {
  const now = new Date().toISOString();
  
  const template: SessionTemplate = {
    id: crypto.randomUUID(),
    name,
    session_type: type,
    property_type: 'SFH',
    condition: 'Maintained',
    explanatory_style: 'standard',
    created_at: now,
    updated_at: now,
  };

  if (type === 'Seller') {
    template.seller_defaults = {
      desired_timeframe: '60',
      strategy_preference: 'Balanced',
    };
  } else {
    template.buyer_defaults = {
      financing_type: 'Conventional',
      down_payment_percent: '20+',
      contingencies: ['Inspection', 'Financing'],
      closing_timeline: '21-30',
      buyer_preference: 'Balanced',
    };
  }

  return template;
}
