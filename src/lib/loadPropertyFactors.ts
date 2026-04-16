/**
 * Loads property intelligence factors from approved documents linked to a session.
 * Gracefully returns [] when Supabase is unavailable.
 */
import type { PropertyFactor } from '@/types';
import type { PropertyFactor as ParserPropertyFactor } from '@/lib/mlspinParser';
import { parseMLSPINText } from '@/lib/mlspinParser';
import { supabase } from '@/integrations/supabase/client';

export async function loadPropertyFactorsForSession(sessionId: string): Promise<PropertyFactor[]> {
  try {
  const { data: docs } = await supabase
    .from('property_documents')
    .select('raw_text, extracted_fields, status')
    .eq('session_id', sessionId)
    .in('status', ['approved', 'reviewed']);

  if (!docs || docs.length === 0) return [];

  const allFactors: PropertyFactor[] = [];

  for (const doc of docs) {
    if (doc.raw_text) {
      const extraction = parseMLSPINText(doc.raw_text);
      for (const f of extraction.factors) {
        allFactors.push({
          label: f.label,
          weight: f.weight,
          explanation: f.explanation,
          evidence: f.evidence,
          confidence: f.confidence,
          source: f.source,
        });
      }
    }
  }

  // Deduplicate by label, keeping highest-confidence version
  const deduped = new Map<string, PropertyFactor>();
  for (const f of allFactors) {
    const existing = deduped.get(f.label);
    if (!existing || confidenceRank(f.confidence) > confidenceRank(existing.confidence)) {
      deduped.set(f.label, f);
    }
  }

  return Array.from(deduped.values());
  } catch {
    // Supabase unavailable — return empty factors rather than crashing the report
    return [];
  }
}

function confidenceRank(c: 'high' | 'medium' | 'low'): number {
  return c === 'high' ? 3 : c === 'medium' ? 2 : 1;
}
