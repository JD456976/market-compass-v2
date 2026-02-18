
-- ─── Listing Navigator Tables ────────────────────────────────────────────────

-- 1. listing_navigator_runs
CREATE TABLE IF NOT EXISTS public.listing_navigator_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  input_type text NOT NULL DEFAULT 'paste' CHECK (input_type IN ('paste', 'pdf')),
  raw_text text NOT NULL DEFAULT '',
  parsed_text text NOT NULL DEFAULT '',
  score integer DEFAULT NULL,
  summary jsonb DEFAULT '{}'::jsonb,
  property_hint jsonb DEFAULT '{}'::jsonb,
  improved_description text DEFAULT NULL,
  status text NOT NULL DEFAULT 'active'
);

ALTER TABLE public.listing_navigator_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own runs"
  ON public.listing_navigator_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own runs"
  ON public.listing_navigator_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own runs"
  ON public.listing_navigator_runs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own runs"
  ON public.listing_navigator_runs FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all runs"
  ON public.listing_navigator_runs FOR SELECT
  USING (public.is_admin_user());

-- 2. listing_navigator_flags
CREATE TABLE IF NOT EXISTS public.listing_navigator_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.listing_navigator_runs(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  category text NOT NULL DEFAULT 'moderate' CHECK (category IN ('critical', 'moderate', 'presentation', 'positive')),
  severity integer NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  title text NOT NULL,
  why_it_matters text NOT NULL DEFAULT '',
  evidence jsonb DEFAULT '{}'::jsonb,
  suggested_angles jsonb DEFAULT '[]'::jsonb,
  addressed boolean NOT NULL DEFAULT false,
  addressed_at timestamptz DEFAULT NULL
);

ALTER TABLE public.listing_navigator_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flags"
  ON public.listing_navigator_flags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.listing_navigator_runs r
    WHERE r.id = listing_navigator_flags.run_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own flags"
  ON public.listing_navigator_flags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.listing_navigator_runs r
    WHERE r.id = listing_navigator_flags.run_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own flags"
  ON public.listing_navigator_flags FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.listing_navigator_runs r
    WHERE r.id = listing_navigator_flags.run_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own flags"
  ON public.listing_navigator_flags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.listing_navigator_runs r
    WHERE r.id = listing_navigator_flags.run_id AND r.user_id = auth.uid()
  ));

-- 3. listing_rules (seeded library — admin-managed)
CREATE TABLE IF NOT EXISTS public.listing_rules (
  rule_key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'moderate' CHECK (category IN ('critical', 'moderate', 'presentation', 'positive')),
  severity_default integer NOT NULL DEFAULT 3 CHECK (severity_default BETWEEN 1 AND 5),
  enabled boolean NOT NULL DEFAULT true,
  logic jsonb DEFAULT '{}'::jsonb,
  why_it_matters_template text NOT NULL DEFAULT '',
  suggested_angles jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE public.listing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read enabled rules"
  ON public.listing_rules FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins can manage rules"
  ON public.listing_rules FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Trigger: update updated_at on runs
CREATE OR REPLACE FUNCTION public.update_listing_run_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_listing_run_updated_at
  BEFORE UPDATE ON public.listing_navigator_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_listing_run_updated_at();

-- ─── Seed Rule Library (20+ rules) ───────────────────────────────────────────
INSERT INTO public.listing_rules (rule_key, name, description, category, severity_default, enabled, logic, why_it_matters_template, suggested_angles) VALUES

-- CRITICAL
('price_improvement_language', 'Price Improvement Language Detected', 'Listing contains phrases like "price improvement" or "reduced" signaling seller concession.', 'critical', 5, true,
  '{"keywords": ["price improvement", "price reduced", "reduced price", "seller motivated", "bring all offers", "price drop"]}',
  'Price improvement language signals to buyers that the seller is under pressure, weakening negotiating leverage and potentially anchoring expectations of further reductions.',
  '["Remove all price-reduction references from the MLS remarks", "If a reduction occurred, let the price history speak — do not call it out in text", "Reframe the value story: highlight what the buyer gets at current price", "Use neutral language like ''priced to reflect current market conditions''"]'::jsonb),

('deferred_repairs_disclosed', 'Deferred Repairs or Future Work Disclosed', 'Listing text mentions repairs promised by closing or known deficiencies (e.g., shingles, furnace).', 'critical', 5, true,
  '{"keywords": ["will be fixed", "to be repaired", "seller will replace", "prior to closing", "as-is", "needs work", "in need of", "shingles will", "furnace will"]}',
  'Disclosing deferred repairs invites lowball offers and inspection renegotiations. Buyers mentally add a discount larger than the actual repair cost.',
  '["Address repairs before listing if possible and remove from remarks", "If disclosed by necessity, frame around the post-repair state: what the home will look like at closing", "Quantify completed improvements nearby to balance the narrative", "Consult seller on pre-listing credits vs. reduced price — credits feel cleaner"]'::jsonb),

('lead_paint_unknown', 'Lead Paint Status Unknown (Pre-1978)', 'Home appears to be pre-1978 and listing text contains ''unknown'' regarding lead paint disclosure.', 'critical', 4, true,
  '{"keywords": ["lead paint unknown", "lead paint: unknown", "lead based paint unknown", "unknown lead"]}',
  'Lead paint ''unknown'' disclosures cause buyers to budget for expensive testing and remediation, eroding confidence and sometimes killing deals post-inspection.',
  '["Order a lead paint inspection upfront — it''s inexpensive and removes uncertainty", "If clear, state ''lead paint inspection completed, no hazards identified'' in remarks", "Highlight any recent renovations that replaced pre-1978 surfaces (new windows, floors, walls)"]'::jsonb),

('window_ac_high_price', 'Window AC Units at High Price Point', 'Listing mentions window AC units or no central air on a property priced above $800K.', 'critical', 4, true,
  '{"keywords": ["window ac", "window unit", "window a/c", "no central air", "wall unit ac"], "price_threshold": 800000}',
  'At premium price points, buyers expect central HVAC as a baseline. Window units suggest dated systems and signal deferred investment, causing luxury buyers to walk.',
  '["Highlight cross-ventilation and any newer insulated windows that reduce cooling needs", "If a mini-split system is feasible, mention the ease of upgrade without claiming it exists", "Emphasize any recent insulation improvements or energy efficiency upgrades", "Note any ceiling fans, smart thermostats, or other comfort features"]'::jsonb),

-- MODERATE  
('long_dom', 'Extended Days on Market', 'Property has been listed for more than 21 days, suggesting buyer resistance.', 'moderate', 4, true,
  '{"keywords": ["days on market", "dom"], "dom_threshold": 21}',
  'Extended DOM is a yellow flag for buyers who assume something is wrong. Each additional week compounds negotiation pressure and perceived stigma.',
  '["Refresh the listing with new photos and updated remarks — a re-list resets the DOM clock in many MLSs", "Address the most common buyer objection head-on in agent remarks", "Consider a strategic price adjustment paired with a narrative refresh", "Highlight any improvements made since original listing"]'::jsonb),

('no_garage', 'No Garage Mentioned', 'Listing does not mention garage or indicates zero garage spaces, which is a common buyer objection.', 'moderate', 3, true,
  '{"keywords": ["no garage", "0 garage", "zero garage", "street parking", "on-street parking"]}',
  'Garage absence is a top buyer objection in most markets. Without proactive addressing, buyers assume limited storage and resale risk.',
  '["Emphasize off-street parking count prominently: ''2 dedicated off-street spaces''", "Highlight any heated outbuilding, shed, or carport as storage/workshop alternative", "Note proximity to public transit if applicable to reduce parking objection weight", "Mention oversized driveway or tandem parking if available"]'::jsonb),

('electrical_100amp', '100-Amp Electrical Service', 'Listing mentions 100-amp electrical service, which is below modern standards.', 'moderate', 4, true,
  '{"keywords": ["100 amp", "100-amp", "100amp", "60 amp", "60-amp"]}',
  'Modern buyers — especially those planning EV chargers or home offices — flag 100-amp service as an immediate upgrade need ($3,000–$8,000), which they price into their offer.',
  '["If upgrade is feasible before listing, complete it and lead with ''200-amp service''", "Note any recent electrical panel upgrades or sub-panels that extend capacity", "Highlight that the home is otherwise move-in ready — frame electrical as a simple, known upgrade", "Quantify: ''All wiring updated 2019, panel upgrade straightforward''"]'::jsonb),

('slab_foundation_high_price', 'Slab Foundation at High Price Point', 'Listing mentions slab foundation on a higher-priced property where crawl space or basement is expected.', 'moderate', 3, true,
  '{"keywords": ["slab", "slab foundation", "on slab", "concrete slab"], "price_threshold": 800000}',
  'In markets where basements or crawl spaces are common, slab foundations raise concerns about storage, moisture intrusion, and plumbing access — often misunderstood but impactful on buyer perception.',
  '["Address the slab proactively: ''poured slab construction — no moisture, no settling''", "Highlight storage solutions (attached garage, outbuildings, attic)", "Note energy efficiency benefits of slab construction in relevant climates", "Mention any warranty or structural engineer inspection if available"]'::jsonb),

('generic_marketing_phrases', 'Generic Marketing Phrases Detected', 'Listing uses overused, unverifiable phrases that add no concrete value signal.', 'moderate', 3, true,
  '{"keywords": ["sun-filled", "sun filled", "great flow", "must see", "won''t last", "wont last", "priced to sell", "charming", "cozy", "loads of potential", "handyman special", "dream home", "your personal oasis", "nestled", "tucked away", "pride of ownership"]}',
  'Generic phrases are invisible to buyers who see them in every listing. They reduce credibility and waste valuable character space that could carry real value signals.',
  '["Replace each generic phrase with a specific, verifiable detail: instead of ''sun-filled'' use ''south-facing great room with 6 windows''", "Use measurements and directions: ''14x18 primary suite with ensuite bath and dual closets''", "Lead with the home''s strongest unique differentiator in the first sentence", "Eliminate superlatives — let the facts do the selling"]'::jsonb),

('single_long_paragraph', 'Listing Description Lacks Structure', 'Listing description is a single long paragraph with no logical visual flow.', 'moderate', 2, true,
  '{"min_char_length": 400, "keywords": []}',
  'Wall-of-text descriptions get skimmed or skipped. Structured remarks with clear topic sentences perform better in attention-limited mobile browsing environments.',
  '["Break description into 3-4 focused paragraphs: property overview, interior highlights, outdoor features, neighborhood/lifestyle", "Lead each paragraph with the strongest detail in that section", "Use specific numbers to anchor each section (beds, baths, sq ft, year renovated)", "End with a clear lifestyle or use case: ''ideal for entertaining, commuter-friendly, or multigenerational living''"]'::jsonb),

('high_assessed_value_gap', 'Price Significantly Above Assessed Value', 'Listing price appears to exceed assessed/assessed value by more than 25%.', 'moderate', 3, true,
  '{"keywords": ["assessed", "assessed value", "tax assessed", "assessment"], "gap_threshold": 0.25}',
  'When listing price far exceeds assessed value, buyers use this as a negotiation anchor — even when assessments lag market reality. The gap invites challenge.',
  '["Proactively pull recent comparable sales and include an agent remarks reference: ''Priced in line with Q1 2025 comparable sales in [neighborhood]''", "Note any features not captured in assessment (addition, full renovation, new systems)", "Consider including a pre-listing appraisal reference if available", "Frame assessed value as a tax artifact rather than market value"]'::jsonb),

-- PRESENTATION
('missing_bath_count_elevation', 'Full Bath Count Not Prominently Featured', 'Listing has 3+ full baths but does not prominently mention this in the description text.', 'presentation', 2, true,
  '{"keywords": ["3 full bath", "3 full baths", "three full bath", "4 full bath", "four full bath", "3.5 bath", "4.5 bath"]}',
  'Three or more full baths is a significant differentiator that filters buyers searching for specific configurations. Burying this detail loses qualified traffic.',
  '["Move full bath count to the first or second sentence of the listing description", "Specify each bath location: ''Primary ensuite, guest bath on main, and full bath in finished lower level''", "Note any recent bath renovations or luxury fixtures to add perceived value", "In MLS fields, ensure all baths are correctly entered — description should mirror structured data"]'::jsonb),

('missing_heated_outbuilding', 'Heated Outbuilding Not Highlighted', 'Listing mentions a heated shed, garage, or outbuilding but does not position it as a selling feature.', 'presentation', 2, true,
  '{"keywords": ["heated shed", "heated garage", "heated barn", "heated workshop", "electric shed", "electricity shed", "wired shed", "insulated shed"]}',
  'A heated, wired outbuilding is a premium feature that appeals to hobbyists, remote workers, and buyers needing flex space. Mentioning it casually wastes a powerful differentiator.',
  '["Lead with the outbuilding''s use cases: ''heated workshop/home office, wired with 240V''", "Specify dimensions if known: ''16x24 heated workshop with electricity and insulation''", "Position as a value-add few comparables can match", "In agent remarks, call it out separately from main home description"]'::jsonb),

('missing_kitchen_upgrade', 'Kitchen/Bath Upgrades Not Elevated', 'Listing mentions updated kitchen or baths but does not position them as headline features.', 'presentation', 2, true,
  '{"keywords": ["updated kitchen", "renovated kitchen", "new kitchen", "updated bath", "renovated bath", "remodeled kitchen", "new appliances", "quartz", "granite counters", "stainless"]}',
  'Kitchen and bath updates are the highest-ROI renovations. If present, they should lead the listing narrative — not appear in a list of features.',
  '["Open the listing description with the kitchen/bath renovation: ''Fully renovated kitchen (2023) with quartz countertops, new cabinetry, and stainless appliances''", "Include the renovation year — recency matters to buyers", "Specify materials: quartz vs. laminate, hardwood vs. vinyl, tile vs. fiberglass", "Connect the renovation to a lifestyle: ''designed for entertaining with open concept flow to dining room''"]'::jsonb),

('missing_energy_features', 'Energy Efficiency Features Not Highlighted', 'Listing mentions insulated windows, solar, or other energy features but does not elevate them.', 'presentation', 2, true,
  '{"keywords": ["insulated windows", "energy efficient", "solar panels", "solar", "triple pane", "double pane", "new windows", "heat pump", "mini split", "mini-split"]}',
  'Energy-efficient features directly reduce monthly carrying costs — a major factor for interest-rate-sensitive buyers. Quantifying savings increases perceived value.',
  '["Lead with the energy feature and its benefit: ''Anderson replacement windows throughout reduce heating costs significantly''", "If solar is present, note ownership vs. lease and estimated annual production/savings", "Connect energy features to monthly cost: ''high-efficiency mini-splits provide year-round comfort at lower utility cost''", "Note any recent Energy Star certifications or HERS ratings if available"]'::jsonb),

('missing_outdoor_features', 'Outdoor Living Features Not Positioned', 'Listing mentions patio, deck, fire pit, or landscaping but does not frame them as lifestyle features.', 'presentation', 1, true,
  '{"keywords": ["patio", "deck", "fire pit", "pergola", "outdoor kitchen", "screened porch", "wraparound porch", "fenced yard", "privacy fence"]}',
  'Outdoor living space is a top buyer priority post-pandemic. Concrete features like fire pits and screened porches should be positioned as extensions of the home''s livable square footage.',
  '["Open with outdoor living: ''Entertain on the 400 sqft composite deck with built-in fire pit and privacy fence''", "Include dimensions when known — ''16x20 patio'' reads better than ''spacious patio''", "Connect outdoor space to seasons: ''Screened porch extends the entertaining season April–October''", "Note any recent landscaping or hardscaping investments with approximate year"]'::jsonb),

-- POSITIVE SIGNALS
('has_three_full_baths', '3+ Full Baths — Strong Filter Signal', 'Property has three or more full bathrooms, which is a significant buyer filter signal.', 'positive', 1, true,
  '{"keywords": ["3 full", "3.5 bath", "4 bath", "4 full", "5 bath", "5 full", "three full"]}',
  'Three or more full baths is a key search filter for growing families and remote workers needing dedicated office/bath configurations. This expands your qualified buyer pool significantly.',
  '["Lead with bath count prominently", "Specify each bath''s location and features", "Note any ensuite configurations"]'::jsonb),

('has_heated_outbuilding', 'Heated Outbuilding Present', 'Property has a heated and/or wired outbuilding — a premium differentiator.', 'positive', 1, true,
  '{"keywords": ["heated shed", "heated garage", "heated barn", "heated workshop", "wired shed", "electric shed"]}',
  'A heated, wired outbuilding is rare in most markets and highly sought after by hobbyists, remote workers, small business owners, and car enthusiasts.',
  '["Position as the headline differentiator", "Specify power capacity (120V vs 240V)", "Suggest use cases: workshop, home office, studio, gym"]'::jsonb),

('has_updated_systems', 'Updated Major Systems Detected', 'Listing mentions new roof, HVAC, water heater, or other major system updates.', 'positive', 1, true,
  '{"keywords": ["new roof", "roof replaced", "new hvac", "new furnace", "new water heater", "new boiler", "updated electrical", "200 amp", "200-amp", "new windows"]}',
  'Updated major systems dramatically reduce buyer fear of hidden costs and typically translate to 3–7% buyer confidence premiums over comparable listings with unknown system ages.',
  '["List systems with approximate years: ''Roof 2022, Furnace 2021, Water Heater 2023''", "Group system updates for maximum visual impact", "Quantify remaining life where possible: ''30-year architectural shingles installed 2022''"]'::jsonb),

('has_patio_or_fire_pit', 'Outdoor Entertaining Space Present', 'Property includes notable outdoor living features like a patio, deck, fire pit, or screened porch.', 'positive', 1, true,
  '{"keywords": ["fire pit", "patio", "deck", "screened porch", "pergola", "outdoor kitchen", "wraparound porch"]}',
  'Outdoor entertaining space consistently ranks in top buyer wish lists. Properties with defined outdoor living areas command premium pricing and sell faster in spring/summer markets.',
  '["Highlight dimensions and materials", "Connect to lifestyle use cases", "Note proximity to interior entertaining space for flow"]'::jsonb),

('has_recent_renovation', 'Recent Renovation Detected', 'Listing mentions renovations or upgrades completed within the last 5 years.', 'positive', 1, true,
  '{"keywords": ["renovated", "remodeled", "updated 20", "new in 20", "replaced 20", "upgraded 20", "restored 20"]}',
  'Recent renovations signal turnkey condition and reduce buyer hesitation about deferred maintenance. The more recent, the stronger the buyer confidence signal.',
  '["Lead with the renovation year and scope", "Specify materials and brands where premium", "Connect renovation to move-in readiness: no work needed"]'::jsonb),

('has_location_advantage', 'Location/Commuter Advantage Mentioned', 'Listing highlights proximity to transit, schools, or employment centers.', 'positive', 1, true,
  '{"keywords": ["walk to", "minutes to", "close to", "near", "commuter rail", "t stop", "mbta", "metro", "highway access", "top rated school", "top-rated school", "school district"]}',
  'Location context reduces buyer friction around lifestyle trade-offs. Specific proximity data (minutes, miles) outperforms vague references and helps buyers self-qualify.',
  '["Use specific distances: ''0.3 miles to commuter rail''", "Name schools and their ratings where permitted", "Include drive time to major employment centers"]'::jsonb);
