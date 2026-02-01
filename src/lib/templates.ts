import { Session, PropertyType, Condition, DesiredTimeframe, StrategyPreference, FinancingType, DownPaymentPercent, Contingency, ClosingTimeline, BuyerPreference } from '@/types';

const TEMPLATES_KEY = 'reality_engine_templates';

export interface SessionTemplate {
  id: string;
  name: string;
  session_type: 'Seller' | 'Buyer';
  property_type: PropertyType;
  condition: Condition;
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
  const existingIndex = templates.findIndex(t => t.id === template.id);
  
  if (existingIndex >= 0) {
    templates[existingIndex] = template;
  } else {
    templates.push(template);
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

// Create a template from a session (strips client-specific data)
export function createTemplateFromSession(session: Session, templateName: string): SessionTemplate {
  const template: SessionTemplate = {
    id: crypto.randomUUID(),
    name: templateName,
    session_type: session.session_type,
    property_type: session.property_type,
    condition: session.condition,
    created_at: new Date().toISOString(),
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
