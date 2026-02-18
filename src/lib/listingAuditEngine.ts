/**
 * Listing Navigator — Deterministic Rule-Based Audit Engine
 * No AI. No external APIs. Pure regex + keyword + numeric heuristics.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PropertyHint {
  price?: number;
  yearBuilt?: number;
  beds?: number;
  fullBaths?: number;
  halfBaths?: number;
  sqft?: number;
  garage?: number;
  dom?: number;
  assessedValue?: number;
}

export interface AuditFlag {
  rule_key: string;
  category: 'critical' | 'moderate' | 'presentation' | 'positive';
  severity: number;
  title: string;
  why_it_matters: string;
  evidence: Record<string, unknown>;
  suggested_angles: string[];
  addressed: boolean;
}

export interface AuditResult {
  score: number;
  flags: AuditFlag[];
  propertyHint: PropertyHint;
  summary: {
    critical: number;
    moderate: number;
    presentation: number;
    positive: number;
    total: number;
  };
}

// ─── Text Normalization ────────────────────────────────────────────────────────

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// ─── Property Hint Extraction ─────────────────────────────────────────────────

export function extractPropertyHints(text: string): PropertyHint {
  const lower = text.toLowerCase();
  const hint: PropertyHint = {};

  // Price: $1,250,000 or $850K or $1.2M
  const priceMatch =
    text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*[Mm]/i) ||
    text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*[Kk]/i) ||
    text.match(/list(?:ed|ing)?\s+(?:price|at)?\s*:?\s*\$\s*([\d,]+)/i) ||
    text.match(/\$\s*([\d,]{6,})/);
  if (priceMatch) {
    const raw = priceMatch[1].replace(/,/g, '');
    let val = parseFloat(raw);
    if (/[Mm]/.test(priceMatch[0])) val *= 1_000_000;
    else if (/[Kk]/.test(priceMatch[0])) val *= 1_000;
    if (val > 50_000 && val < 100_000_000) hint.price = val;
  }

  // Year built
  const yrMatch = text.match(/(?:built|year\s+built|constructed)[:\s]+(\d{4})/i) ||
    text.match(/(\d{4})\s+(?:build|built|construction)/i);
  if (yrMatch) {
    const yr = parseInt(yrMatch[1]);
    if (yr >= 1800 && yr <= new Date().getFullYear()) hint.yearBuilt = yr;
  }

  // Beds
  const bedMatch = lower.match(/(\d+)\s*(?:bed(?:room)?s?|br\b)/);
  if (bedMatch) hint.beds = parseInt(bedMatch[1]);

  // Full baths
  const fullBathMatch =
    lower.match(/(\d+)\s*full\s*bath/) ||
    lower.match(/(\d+)(?:\.\d+)?\s*bath/);
  if (fullBathMatch) {
    const val = parseFloat(fullBathMatch[1]);
    hint.fullBaths = Math.floor(val);
    if (fullBathMatch[0].includes('.5') || lower.includes('half bath') || lower.includes('half-bath')) {
      hint.halfBaths = 1;
    }
  }

  // Sqft
  const sqftMatch = text.match(/([\d,]+)\s*(?:sq\.?\s*ft|square\s*feet)/i);
  if (sqftMatch) hint.sqft = parseInt(sqftMatch[1].replace(/,/g, ''));

  // Garage spaces
  const garageMatch = lower.match(/(\d+)\s*(?:car\s+)?garage/);
  if (garageMatch) hint.garage = parseInt(garageMatch[1]);
  if (/no garage|0.?car garage|zero garage/i.test(lower)) hint.garage = 0;

  // DOM
  const domMatch = text.match(/(\d+)\s*(?:days?\s+on\s+market|dom)/i);
  if (domMatch) hint.dom = parseInt(domMatch[1]);

  // Assessed value
  const assessMatch =
    text.match(/assessed\s+(?:value|at)?\s*:?\s*\$?\s*([\d,]+)/i) ||
    text.match(/tax\s+assessed\s*:?\s*\$?\s*([\d,]+)/i);
  if (assessMatch) {
    const val = parseInt(assessMatch[1].replace(/,/g, ''));
    if (val > 10_000) hint.assessedValue = val;
  }

  return hint;
}

// ─── Keyword Helper ───────────────────────────────────────────────────────────

function hasAnyKeyword(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) return kw;
  }
  return null;
}

function countKeywordMatches(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw.toLowerCase()));
}

// ─── Rule Definitions ─────────────────────────────────────────────────────────

interface RuleDef {
  key: string;
  category: 'critical' | 'moderate' | 'presentation' | 'positive';
  severity: number;
  title: string;
  whyItMatters: string;
  suggestedAngles: string[];
  check: (text: string, hint: PropertyHint) => { triggered: boolean; evidence: Record<string, unknown> };
}

const RULES: RuleDef[] = [
  // ── CRITICAL ──────────────────────────────────────────────────────────────
  {
    key: 'price_improvement_language',
    category: 'critical',
    severity: 5,
    title: 'Price Improvement Language Detected',
    whyItMatters: 'Price improvement language signals to buyers that the seller is under pressure, weakening negotiating leverage and potentially anchoring expectations of further reductions.',
    suggestedAngles: [
      'Remove all price-reduction references from the MLS remarks',
      'Let the price history speak — do not call it out in text',
      'Reframe the value story: highlight what the buyer gets at current price',
      'Use neutral language like "priced to reflect current market conditions"',
    ],
    check: (text) => {
      const keywords = ['price improvement', 'price reduced', 'reduced price', 'seller motivated', 'bring all offers', 'price drop', 'just reduced'];
      const found = countKeywordMatches(text, keywords);
      return { triggered: found.length > 0, evidence: { matched_phrases: found } };
    },
  },
  {
    key: 'deferred_repairs_disclosed',
    category: 'critical',
    severity: 5,
    title: 'Deferred Repairs or Future Work Disclosed',
    whyItMatters: 'Disclosing deferred repairs invites lowball offers and inspection renegotiations. Buyers mentally add a discount larger than the actual repair cost.',
    suggestedAngles: [
      'Address repairs before listing if possible and remove from remarks',
      'If disclosed by necessity, frame around the post-repair state: what the home will look like at closing',
      'Quantify completed improvements nearby to balance the narrative',
      'Consult seller on pre-listing credits vs. reduced price — credits feel cleaner',
    ],
    check: (text) => {
      const keywords = ['will be fixed', 'to be repaired', 'seller will replace', 'prior to closing', 'as-is', 'as is', 'needs work', 'in need of', 'shingles will', 'furnace will', 'needs updating', 'sold as-is'];
      const found = countKeywordMatches(text, keywords);
      return { triggered: found.length > 0, evidence: { matched_phrases: found } };
    },
  },
  {
    key: 'lead_paint_unknown',
    category: 'critical',
    severity: 4,
    title: 'Lead Paint Status Unknown (Pre-1978)',
    whyItMatters: 'Lead paint "unknown" disclosures cause buyers to budget for expensive testing and remediation, eroding confidence and sometimes killing deals post-inspection.',
    suggestedAngles: [
      'Order a lead paint inspection upfront — inexpensive and removes uncertainty',
      'If clear, state "lead paint inspection completed, no hazards identified" in remarks',
      'Highlight any recent renovations that replaced pre-1978 surfaces (new windows, floors, walls)',
    ],
    check: (text, hint) => {
      const isPreWar = hint.yearBuilt !== undefined && hint.yearBuilt < 1978;
      const hasUnknown = hasAnyKeyword(text, ['lead paint unknown', 'lead paint: unknown', 'lead based paint unknown', 'unknown lead', 'lead: unknown']) !== null;
      // Also flag if year built pre-1978 and no positive lead paint statement
      const hasPositiveStatement = hasAnyKeyword(text, ['lead paint not present', 'lead free', 'no lead', 'lead paint inspection']) !== null;
      const triggered = (isPreWar || hasUnknown) && !hasPositiveStatement && hasUnknown;
      return { triggered, evidence: { year_built: hint.yearBuilt, has_unknown_statement: hasUnknown } };
    },
  },
  {
    key: 'window_ac_high_price',
    category: 'critical',
    severity: 4,
    title: 'Window AC Units at High Price Point',
    whyItMatters: 'At premium price points, buyers expect central HVAC as a baseline. Window units suggest dated systems and signal deferred investment, causing luxury buyers to walk.',
    suggestedAngles: [
      'Highlight cross-ventilation and any newer insulated windows that reduce cooling needs',
      'If a mini-split system is feasible, mention the ease of upgrade without claiming it exists',
      'Emphasize any recent insulation improvements or energy efficiency upgrades',
      'Note any ceiling fans, smart thermostats, or other comfort features',
    ],
    check: (text, hint) => {
      const hasWindowAC = hasAnyKeyword(text, ['window ac', 'window unit', 'window a/c', 'no central air', 'wall unit ac', 'wall ac', 'window air']) !== null;
      const highPrice = hint.price !== undefined && hint.price >= 800_000;
      return {
        triggered: hasWindowAC && (highPrice || hint.price === undefined),
        evidence: { price: hint.price, has_window_ac: hasWindowAC },
      };
    },
  },

  // ── MODERATE ──────────────────────────────────────────────────────────────
  {
    key: 'long_dom',
    category: 'moderate',
    severity: 4,
    title: 'Extended Days on Market (21+)',
    whyItMatters: 'Extended DOM is a yellow flag for buyers who assume something is wrong. Each additional week compounds negotiation pressure and perceived stigma.',
    suggestedAngles: [
      'Refresh the listing with new photos and updated remarks — a re-list resets the DOM clock in many MLSs',
      'Address the most common buyer objection head-on in agent remarks',
      'Consider a strategic price adjustment paired with a narrative refresh',
      'Highlight any improvements made since original listing',
    ],
    check: (text, hint) => {
      const dom = hint.dom;
      if (dom === undefined) return { triggered: false, evidence: {} };
      return { triggered: dom > 21, evidence: { days_on_market: dom } };
    },
  },
  {
    key: 'no_garage',
    category: 'moderate',
    severity: 3,
    title: 'No Garage Mentioned',
    whyItMatters: 'Garage absence is a top buyer objection in most markets. Without proactive addressing, buyers assume limited storage and resale risk.',
    suggestedAngles: [
      'Emphasize off-street parking count prominently: "2 dedicated off-street spaces"',
      'Highlight any heated outbuilding, shed, or carport as storage/workshop alternative',
      'Note proximity to public transit if applicable to reduce parking objection weight',
      'Mention oversized driveway or tandem parking if available',
    ],
    check: (text, hint) => {
      const mentionsGarage = hasAnyKeyword(text, ['garage', 'carport']) !== null;
      const explicitlyNone = hasAnyKeyword(text, ['no garage', '0 garage', 'zero garage', 'street parking']) !== null;
      const garageIsZero = hint.garage === 0;
      return {
        triggered: explicitlyNone || garageIsZero || !mentionsGarage,
        evidence: { garage_count: hint.garage, mentions_garage: mentionsGarage },
      };
    },
  },
  {
    key: 'electrical_100amp',
    category: 'moderate',
    severity: 4,
    title: '100-Amp Electrical Service',
    whyItMatters: 'Modern buyers — especially those planning EV chargers or home offices — flag 100-amp service as an immediate upgrade need ($3,000–$8,000), which they price into their offer.',
    suggestedAngles: [
      'If upgrade is feasible before listing, complete it and lead with "200-amp service"',
      'Note any recent electrical panel upgrades or sub-panels that extend capacity',
      'Highlight that the home is otherwise move-in ready — frame electrical as a simple, known upgrade',
      'Quantify: "All wiring updated 2019, panel upgrade straightforward"',
    ],
    check: (text) => {
      const found = hasAnyKeyword(text, ['100 amp', '100-amp', '100amp', '60 amp', '60-amp', '60amp']);
      return { triggered: found !== null, evidence: { matched: found } };
    },
  },
  {
    key: 'slab_foundation_high_price',
    category: 'moderate',
    severity: 3,
    title: 'Slab Foundation at High Price Point',
    whyItMatters: 'In markets where basements or crawl spaces are common, slab foundations raise concerns about storage, moisture intrusion, and plumbing access.',
    suggestedAngles: [
      'Address the slab proactively: "poured slab construction — no moisture, no settling"',
      'Highlight storage solutions (attached garage, outbuildings, attic)',
      'Note energy efficiency benefits of slab construction in relevant climates',
      'Mention any warranty or structural engineer inspection if available',
    ],
    check: (text, hint) => {
      const hasSlab = hasAnyKeyword(text, ['slab', 'slab foundation', 'on slab', 'concrete slab']) !== null;
      const highPrice = hint.price !== undefined && hint.price >= 800_000;
      return { triggered: hasSlab && (highPrice || hint.price === undefined), evidence: { price: hint.price, has_slab: hasSlab } };
    },
  },
  {
    key: 'generic_marketing_phrases',
    category: 'moderate',
    severity: 3,
    title: 'Generic Marketing Phrases Detected',
    whyItMatters: 'Generic phrases are invisible to buyers who see them in every listing. They reduce credibility and waste valuable character space that could carry real value signals.',
    suggestedAngles: [
      'Replace each generic phrase with a specific, verifiable detail: instead of "sun-filled" use "south-facing great room with 6 windows"',
      'Use measurements and directions: "14x18 primary suite with ensuite bath and dual closets"',
      'Lead with the home\'s strongest unique differentiator in the first sentence',
      'Eliminate superlatives — let the facts do the selling',
    ],
    check: (text) => {
      const keywords = ['sun-filled', 'sun filled', 'great flow', 'must see', "won't last", 'wont last', 'priced to sell', 'nestled', 'tucked away', 'pride of ownership', 'charming home', 'cozy retreat', 'dream home', 'your personal oasis', 'loads of potential', 'handyman special'];
      const found = countKeywordMatches(text, keywords);
      return { triggered: found.length >= 2, evidence: { matched_phrases: found, count: found.length } };
    },
  },
  {
    key: 'single_long_paragraph',
    category: 'moderate',
    severity: 2,
    title: 'Listing Description Lacks Structure',
    whyItMatters: 'Wall-of-text descriptions get skimmed or skipped. Structured remarks with clear topic sentences perform better in attention-limited mobile browsing environments.',
    suggestedAngles: [
      'Break description into 3-4 focused paragraphs: property overview, interior highlights, outdoor features, neighborhood/lifestyle',
      'Lead each paragraph with the strongest detail in that section',
      'Use specific numbers to anchor each section (beds, baths, sq ft, year renovated)',
      'End with a clear lifestyle or use case: "ideal for entertaining, commuter-friendly, or multigenerational living"',
    ],
    check: (text) => {
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
      const isSingleBlock = paragraphs.length <= 1 && text.replace(/\s+/g, ' ').trim().length > 400;
      return { triggered: isSingleBlock, evidence: { char_length: text.length, paragraph_count: paragraphs.length } };
    },
  },
  {
    key: 'high_assessed_value_gap',
    category: 'moderate',
    severity: 3,
    title: 'Price Significantly Above Assessed Value',
    whyItMatters: 'When listing price far exceeds assessed value, buyers use this as a negotiation anchor — even when assessments lag market reality. The gap invites challenge.',
    suggestedAngles: [
      'Proactively pull recent comparable sales and include an agent remarks reference: "Priced in line with recent comparable sales in [neighborhood]"',
      'Note any features not captured in assessment (addition, full renovation, new systems)',
      'Consider including a pre-listing appraisal reference if available',
      'Frame assessed value as a tax artifact rather than market value',
    ],
    check: (text, hint) => {
      if (!hint.price || !hint.assessedValue) return { triggered: false, evidence: {} };
      const gap = (hint.price - hint.assessedValue) / hint.assessedValue;
      return { triggered: gap > 0.25, evidence: { price: hint.price, assessed_value: hint.assessedValue, gap_pct: Math.round(gap * 100) } };
    },
  },

  // ── PRESENTATION ──────────────────────────────────────────────────────────
  {
    key: 'missing_bath_count_elevation',
    category: 'presentation',
    severity: 2,
    title: 'Full Bath Count Not Prominently Featured',
    whyItMatters: 'Three or more full baths is a significant differentiator that filters buyers searching for specific configurations. Burying this detail loses qualified traffic.',
    suggestedAngles: [
      'Move full bath count to the first or second sentence of the listing description',
      'Specify each bath location: "Primary ensuite, guest bath on main, and full bath in finished lower level"',
      'Note any recent bath renovations or luxury fixtures to add perceived value',
      'In MLS fields, ensure all baths are correctly entered — description should mirror structured data',
    ],
    check: (text, hint) => {
      const hasThreePlus = hint.fullBaths !== undefined && hint.fullBaths >= 3;
      const mentionedInText = hasAnyKeyword(text, ['3 full', '3 full bath', 'three full bath', '4 full', 'four full', '5 full', '3.5 bath', '4 bath', '4.5 bath']) !== null;
      // Flag if 3+ baths are present BUT not mentioned prominently in first 300 chars
      const first300 = text.slice(0, 300);
      const prominentMention = hasAnyKeyword(first300, ['full bath', 'bathroom', '3 bath', '4 bath']) !== null;
      return {
        triggered: hasThreePlus && (!mentionedInText || !prominentMention),
        evidence: { full_baths: hint.fullBaths, mentioned_in_text: mentionedInText, prominent: prominentMention },
      };
    },
  },
  {
    key: 'missing_heated_outbuilding',
    category: 'presentation',
    severity: 2,
    title: 'Heated Outbuilding Not Highlighted',
    whyItMatters: 'A heated, wired outbuilding is a premium feature that appeals to hobbyists, remote workers, and buyers needing flex space. Mentioning it casually wastes a powerful differentiator.',
    suggestedAngles: [
      'Lead with the outbuilding\'s use cases: "heated workshop/home office, wired with 240V"',
      'Specify dimensions if known: "16x24 heated workshop with electricity and insulation"',
      'Position as a value-add few comparables can match',
      'In agent remarks, call it out separately from main home description',
    ],
    check: (text) => {
      const hasOutbuilding = hasAnyKeyword(text, ['heated shed', 'heated garage', 'heated barn', 'heated workshop', 'electric shed', 'electricity shed', 'wired shed', 'insulated shed', 'wired barn']) !== null;
      if (!hasOutbuilding) return { triggered: false, evidence: {} };
      // Check if it's in first 200 chars (prominent) or just buried
      const first200 = text.slice(0, 200);
      const isProminent = hasAnyKeyword(first200, ['heated shed', 'heated workshop', 'wired shed']) !== null;
      return { triggered: !isProminent, evidence: { has_outbuilding: true, is_prominent: isProminent } };
    },
  },
  {
    key: 'missing_kitchen_upgrade',
    category: 'presentation',
    severity: 2,
    title: 'Kitchen/Bath Upgrades Not Elevated',
    whyItMatters: 'Kitchen and bath updates are the highest-ROI renovations. If present, they should lead the listing narrative — not appear in a list of features.',
    suggestedAngles: [
      'Open the listing description with the renovation: "Fully renovated kitchen (2023) with quartz countertops, new cabinetry, and stainless appliances"',
      'Include the renovation year — recency matters to buyers',
      'Specify materials: quartz vs. laminate, hardwood vs. vinyl, tile vs. fiberglass',
      'Connect the renovation to a lifestyle: "designed for entertaining with open concept flow to dining room"',
    ],
    check: (text) => {
      const hasUpgrade = hasAnyKeyword(text, ['updated kitchen', 'renovated kitchen', 'new kitchen', 'updated bath', 'renovated bath', 'remodeled kitchen', 'quartz', 'granite counters', 'stainless appliances', 'new appliances']) !== null;
      if (!hasUpgrade) return { triggered: false, evidence: {} };
      const first250 = text.slice(0, 250);
      const isProminent = hasAnyKeyword(first250, ['kitchen', 'bath', 'quartz', 'granite', 'appliance']) !== null;
      return { triggered: !isProminent, evidence: { has_upgrade: true, is_prominent: isProminent } };
    },
  },
  {
    key: 'missing_energy_features',
    category: 'presentation',
    severity: 2,
    title: 'Energy Efficiency Features Not Highlighted',
    whyItMatters: 'Energy-efficient features directly reduce monthly carrying costs — a major factor for interest-rate-sensitive buyers. Quantifying savings increases perceived value.',
    suggestedAngles: [
      'Lead with the energy feature and its benefit: "Anderson replacement windows throughout reduce heating costs significantly"',
      'If solar is present, note ownership vs. lease and estimated annual production/savings',
      'Connect energy features to monthly cost: "high-efficiency mini-splits provide year-round comfort at lower utility cost"',
      'Note any recent Energy Star certifications or HERS ratings if available',
    ],
    check: (text) => {
      const keywords = ['insulated windows', 'energy efficient', 'solar panels', 'solar', 'triple pane', 'double pane', 'new windows', 'heat pump', 'mini split', 'mini-split', 'energy star'];
      const found = hasAnyKeyword(text, keywords);
      if (!found) return { triggered: false, evidence: {} };
      const first250 = text.slice(0, 250);
      const isProminent = hasAnyKeyword(first250, keywords) !== null;
      return { triggered: !isProminent, evidence: { matched: found, is_prominent: isProminent } };
    },
  },
  {
    key: 'missing_outdoor_features',
    category: 'presentation',
    severity: 1,
    title: 'Outdoor Living Features Not Positioned',
    whyItMatters: 'Outdoor living space is a top buyer priority. Concrete features like fire pits and screened porches should be positioned as extensions of the home\'s livable square footage.',
    suggestedAngles: [
      'Open with outdoor living: "Entertain on the 400 sqft composite deck with built-in fire pit and privacy fence"',
      'Include dimensions when known — "16x20 patio" reads better than "spacious patio"',
      'Connect outdoor space to seasons: "Screened porch extends the entertaining season April–October"',
      'Note any recent landscaping or hardscaping investments with approximate year',
    ],
    check: (text) => {
      const keywords = ['patio', 'deck', 'fire pit', 'pergola', 'outdoor kitchen', 'screened porch', 'wraparound porch', 'fenced yard', 'privacy fence'];
      const found = hasAnyKeyword(text, keywords);
      if (!found) return { triggered: false, evidence: {} };
      const first250 = text.slice(0, 250);
      const isProminent = hasAnyKeyword(first250, keywords) !== null;
      return { triggered: !isProminent, evidence: { matched: found, is_prominent: isProminent } };
    },
  },

  // ── POSITIVE SIGNALS ──────────────────────────────────────────────────────
  {
    key: 'has_three_full_baths',
    category: 'positive',
    severity: 1,
    title: '3+ Full Baths — Strong Filter Signal',
    whyItMatters: 'Three or more full baths is a key search filter for growing families and remote workers. This significantly expands your qualified buyer pool.',
    suggestedAngles: [
      'Lead with bath count prominently',
      'Specify each bath\'s location and features',
      'Note any ensuite configurations',
    ],
    check: (text, hint) => {
      const found = hasAnyKeyword(text, ['3 full bath', '3 full baths', 'three full bath', '4 full bath', '5 full bath', '3.5 bath', '4 bath', '4.5 bath', '5 bath']);
      const fromHint = hint.fullBaths !== undefined && hint.fullBaths >= 3;
      return { triggered: found !== null || fromHint, evidence: { matched: found, full_baths: hint.fullBaths } };
    },
  },
  {
    key: 'has_heated_outbuilding',
    category: 'positive',
    severity: 1,
    title: 'Heated Outbuilding Present',
    whyItMatters: 'A heated, wired outbuilding is rare in most markets and highly sought after by hobbyists, remote workers, small business owners, and car enthusiasts.',
    suggestedAngles: [
      'Position as the headline differentiator',
      'Specify power capacity (120V vs 240V)',
      'Suggest use cases: workshop, home office, studio, gym',
    ],
    check: (text) => {
      const found = hasAnyKeyword(text, ['heated shed', 'heated garage', 'heated barn', 'heated workshop', 'wired shed', 'electric shed', 'wired barn']);
      return { triggered: found !== null, evidence: { matched: found } };
    },
  },
  {
    key: 'has_updated_systems',
    category: 'positive',
    severity: 1,
    title: 'Updated Major Systems Detected',
    whyItMatters: 'Updated major systems dramatically reduce buyer fear of hidden costs and typically translate to 3–7% buyer confidence premiums.',
    suggestedAngles: [
      'List systems with approximate years: "Roof 2022, Furnace 2021, Water Heater 2023"',
      'Group system updates for maximum visual impact',
      'Quantify remaining life where possible: "30-year architectural shingles installed 2022"',
    ],
    check: (text) => {
      const found = countKeywordMatches(text, ['new roof', 'roof replaced', 'new hvac', 'new furnace', 'new water heater', 'new boiler', 'updated electrical', '200 amp', '200-amp', 'new windows', 'new siding', 'new driveway']);
      return { triggered: found.length >= 1, evidence: { matched: found } };
    },
  },
  {
    key: 'has_patio_or_fire_pit',
    category: 'positive',
    severity: 1,
    title: 'Outdoor Entertaining Space Present',
    whyItMatters: 'Outdoor entertaining space consistently ranks in top buyer wish lists. Properties with defined outdoor living areas command premium pricing and sell faster.',
    suggestedAngles: [
      'Highlight dimensions and materials',
      'Connect to lifestyle use cases',
      'Note proximity to interior entertaining space for flow',
    ],
    check: (text) => {
      const found = hasAnyKeyword(text, ['fire pit', 'screened porch', 'pergola', 'outdoor kitchen', 'wraparound porch', 'composite deck', 'bluestone patio']);
      return { triggered: found !== null, evidence: { matched: found } };
    },
  },
  {
    key: 'has_recent_renovation',
    category: 'positive',
    severity: 1,
    title: 'Recent Renovation Detected',
    whyItMatters: 'Recent renovations signal turnkey condition and reduce buyer hesitation about deferred maintenance. The more recent, the stronger the buyer confidence signal.',
    suggestedAngles: [
      'Lead with the renovation year and scope',
      'Specify materials and brands where premium',
      'Connect renovation to move-in readiness: no work needed',
    ],
    check: (text) => {
      // Look for renovation + recent year (2018–current)
      const currentYear = new Date().getFullYear();
      const years = Array.from({ length: currentYear - 2017 }, (_, i) => String(2018 + i));
      const renovKeywords = ['renovated', 'remodeled', 'updated', 'replaced', 'upgraded', 'restored', 'new in'];
      const hasRenovation = hasAnyKeyword(text, renovKeywords) !== null;
      const hasRecentYear = years.some(yr => text.includes(yr));
      return { triggered: hasRenovation && hasRecentYear, evidence: { has_renovation: hasRenovation, has_recent_year: hasRecentYear } };
    },
  },
  {
    key: 'has_location_advantage',
    category: 'positive',
    severity: 1,
    title: 'Location/Commuter Advantage Mentioned',
    whyItMatters: 'Location context reduces buyer friction around lifestyle trade-offs. Specific proximity data (minutes, miles) outperforms vague references and helps buyers self-qualify.',
    suggestedAngles: [
      'Use specific distances: "0.3 miles to commuter rail"',
      'Name schools and their ratings where permitted',
      'Include drive time to major employment centers',
    ],
    check: (text) => {
      const found = hasAnyKeyword(text, ['walk to', 'minutes to', 'close to transit', 'commuter rail', 't stop', 'mbta', 'metro north', 'highway access', 'top rated school', 'top-rated school', 'award winning school']);
      return { triggered: found !== null, evidence: { matched: found } };
    },
  },
];

// ─── Scoring Engine ───────────────────────────────────────────────────────────

export function runAudit(text: string): AuditResult {
  const normalized = normalizeText(text);
  const hint = extractPropertyHints(normalized);
  const flags: AuditFlag[] = [];

  for (const rule of RULES) {
    const { triggered, evidence } = rule.check(normalized, hint);
    if (triggered) {
      flags.push({
        rule_key: rule.key,
        category: rule.category,
        severity: rule.severity,
        title: rule.title,
        why_it_matters: rule.whyItMatters,
        evidence,
        suggested_angles: rule.suggestedAngles,
        addressed: false,
      });
    }
  }

  // Scoring: start at 100
  // Subtract: critical * severity * 6, moderate * severity * 4, presentation * severity * 2
  // Add: positive signals small bonus (+3 each)
  let score = 100;
  const critical = flags.filter(f => f.category === 'critical');
  const moderate = flags.filter(f => f.category === 'moderate');
  const presentation = flags.filter(f => f.category === 'presentation');
  const positive = flags.filter(f => f.category === 'positive');

  for (const f of critical) score -= f.severity * 6;
  for (const f of moderate) score -= f.severity * 4;
  for (const f of presentation) score -= f.severity * 2;
  for (const _f of positive) score += 3;

  score = Math.min(100, Math.max(0, Math.round(score)));

  return {
    score,
    flags,
    propertyHint: hint,
    summary: {
      critical: critical.length,
      moderate: moderate.length,
      presentation: presentation.length,
      positive: positive.length,
      total: flags.length,
    },
  };
}
