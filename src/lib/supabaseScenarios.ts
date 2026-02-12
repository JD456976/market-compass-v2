import { supabase } from '@/integrations/supabase/client';
import { MarketScenario, DemandLevel, CompetitionLevel, PricingSensitivity, DOMBand, NegotiationLeverage } from './marketScenarios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToScenario(db: any): MarketScenario {
  return {
    id: db.id,
    name: db.name,
    summary: db.summary,
    isBuiltIn: db.is_built_in || false,
    assumptions: {
      demandLevel: db.demand_level as DemandLevel,
      competitionLevel: db.competition_level as CompetitionLevel,
      pricingSensitivity: db.pricing_sensitivity as PricingSensitivity,
      typicalDOMBand: db.typical_dom_band as DOMBand,
      negotiationLeverage: db.negotiation_leverage as NegotiationLeverage,
    },
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}

export async function loadScenariosFromSupabase(): Promise<MarketScenario[]> {
  const { data, error } = await supabase
    .from('market_scenarios')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load scenarios:', error);
    return [];
  }

  return (data || []).map(mapDbToScenario);
}

export async function upsertScenarioToSupabase(scenario: MarketScenario): Promise<MarketScenario | null> {
  const dbScenario = {
    id: scenario.id,
    name: scenario.name,
    summary: scenario.summary,
    is_built_in: false,
    demand_level: scenario.assumptions.demandLevel,
    competition_level: scenario.assumptions.competitionLevel,
    pricing_sensitivity: scenario.assumptions.pricingSensitivity,
    typical_dom_band: scenario.assumptions.typicalDOMBand,
    negotiation_leverage: scenario.assumptions.negotiationLeverage,
  };

  const { data, error } = await supabase
    .from('market_scenarios')
    .upsert(dbScenario, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Failed to upsert scenario:', error);
    return null;
  }

  return data ? mapDbToScenario(data) : null;
}

export async function deleteScenarioFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('market_scenarios')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete scenario:', error);
    return false;
  }

  return true;
}
