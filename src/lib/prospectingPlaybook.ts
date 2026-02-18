/**
 * prospectingPlaybook.ts
 * Deterministic, free, zero-API template engine for generating market-grounded
 * prospecting copy from live FRED signals. No AI. No cost. Every word is
 * justified by a real data point.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaybookMetrics {
  mortgage: { current: number | null; trend: string; flagged: boolean };
  inventory: { current: number | null; trend: string; flagged: boolean };
  daysOnMarket: { current: number | null; trend: string; flagged: boolean };
  hpi: { current: number | null; trend: string; change90d?: number | null; flagged: boolean };
  unemployment: { current: number | null; trend: string; flagged: boolean };
}

export interface PlaybookInput {
  zip: string;
  cityState: string;
  opportunityScore: number;
  leadType: 'seller' | 'transitional' | 'buyer';
  metrics: PlaybookMetrics;
}

export type PlaybookPlatform = 'instagram' | 'facebook' | 'linkedin' | 'mailer' | 'community' | 'sphere';

export interface PlaybookItem {
  platform: PlaybookPlatform;
  label: string;
  headline: string;
  body: string;
  hook: string; // the data signal that drives this piece
  emoji?: string;
}

export interface Playbook {
  input: PlaybookInput;
  items: PlaybookItem[];
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtRate(v: number | null) {
  return v != null ? `${v.toFixed(2)}%` : 'current rates';
}

function fmtDom(v: number | null) {
  return v != null ? `${Math.round(v)} days` : 'typical pace';
}

function fmtInv(v: number | null) {
  return v != null ? v.toLocaleString() : 'limited';
}

function fmtHpiChange(v: number | null | undefined) {
  if (v == null) return null;
  const abs = Math.abs(v).toFixed(1);
  return v > 0 ? `up ${abs}%` : `down ${abs}%`;
}

function location(cityState: string, zip: string) {
  return cityState?.trim() ? cityState.trim() : `the ${zip} market`;
}

// ─── Seller market playbook ───────────────────────────────────────────────────

function sellerPlaybook(p: PlaybookInput): PlaybookItem[] {
  const loc = location(p.cityState, p.zip);
  const rate = fmtRate(p.metrics.mortgage.current);
  const dom = fmtDom(p.metrics.daysOnMarket.current);
  const inv = fmtInv(p.metrics.inventory.current);
  const hpiDir = fmtHpiChange(p.metrics.hpi.change90d);
  const rateRising = p.metrics.mortgage.trend === 'rising';
  const inventoryTight = p.metrics.inventory.trend === 'falling' || p.metrics.inventory.flagged;

  return [
    {
      platform: 'instagram',
      label: 'Instagram / Facebook',
      emoji: '🏡',
      headline: 'The equity window is open — and data backs it up.',
      hook: `Rates at ${rate} + inventory falling`,
      body: `🏡 If you own a home in ${loc}, the numbers are working in your favor right now.\n\nHere's what the federal data shows:\n📊 30-yr mortgage rate: ${rate}${rateRising ? ' and rising' : ''}\n🏠 Active listings: ${inv} — inventory ${inventoryTight ? 'is tight' : 'is shifting'}\n📅 Median days on market: ${dom}\n\nWhen inventory is low and rates are ${rateRising ? 'climbing' : 'elevated'}, sellers with equity have real leverage. That window doesn't stay open forever.\n\nCurious what your home could do in this market? Drop a 💬 or DM me — no pressure, just data.\n\n#RealEstate #${loc.replace(/[^a-zA-Z]/g, '')} #HomeValues #MarketUpdate`,
    },
    {
      platform: 'linkedin',
      label: 'LinkedIn',
      emoji: '📊',
      headline: 'Market intelligence update for homeowners.',
      hook: `Opportunity score ${p.opportunityScore}/100 — seller market`,
      body: `I just ran the federal economic data for ${loc} and wanted to share what the numbers say for homeowners thinking about their next move.\n\n🔑 Key signals from FRED (Federal Reserve Economic Data):\n• 30-yr fixed mortgage rate: ${rate}${rateRising ? ' (rising trend)' : ''}\n• Active listings: ${inv}\n• Median days on market: ${dom}\n• Opportunity Score: ${p.opportunityScore}/100 — Seller Market\n\nBottom line: Long-term homeowners with accumulated equity are currently in the strongest negotiating position I've seen in this data cycle.\n\nIf you or someone you know has owned their home for 5+ years and has been wondering "is now the time?" — reach out. The data suggests the answer may be yes.\n\n#RealEstateMarket #MarketIntelligence #HomeEquity`,
    },
    {
      platform: 'mailer',
      label: 'Postcard / Mailer',
      emoji: '✉️',
      headline: 'A data-backed reason to reach out to long-term owners.',
      hook: inventoryTight ? 'Inventory scarcity creates urgency' : 'Rising rates create motivation',
      body: `FRONT:\n"Your equity is growing. The market is moving. Is it time to talk?"\n\n—\n\nBACK:\nHi [Name],\n\nI wanted to share a quick market update for ${loc} based on live federal data:\n\n• Mortgage rates: ${rate}${rateRising ? ' and trending up' : ''}\n• Homes are selling in ${dom} on average\n• Active inventory: ${inv}\n\nFor homeowners who locked in at lower rates and have built equity, the current market creates real options — whether that's upsizing, downsizing, or cashing in.\n\nI'd love to run a no-obligation equity snapshot for your home. Scan the QR code or call/text me at [your number].\n\n[Agent Name] | [Brokerage] | [License #]`,
    },
    {
      platform: 'community',
      label: 'Community Outreach',
      emoji: '🤝',
      headline: 'Host a "Know Your Numbers" neighborhood event.',
      hook: 'Seller market = long-term owners are curious but hesitant',
      body: `Event idea: "Know Your Numbers — A Free Home Equity Night"\n\nFormat: Casual evening at a local coffee shop, library, or community center (10–20 homeowners)\n\nWhat you cover:\n1. Live federal data for ${loc} — show real FRED numbers (rates, DOM, inventory)\n2. What those numbers mean for homeowners who've owned 5+ years\n3. A 5-minute "equity snapshot" — you run comps live for anyone who wants\n4. Q&A — no sales pitch, just data and transparency\n\nWhy it works: You become the agent who shows data, not spin. Attendees leave trusting you before they've ever listed.\n\nPromo line: "Bring your address. Leave knowing exactly where you stand."`,
    },
    {
      platform: 'sphere',
      label: 'Sphere Touchpoint (Call/Text)',
      emoji: '📞',
      headline: 'A data-grounded check-in for past clients or warm contacts.',
      hook: 'Personal and specific beats generic market updates',
      body: `Text template:\n"Hey [Name]! Quick heads-up — I pulled the latest federal market data for ${loc} and the numbers caught my attention. Rates are at ${rate}, inventory is ${inventoryTight ? 'really tight' : 'shifting'}, and homes are moving in ${dom}. Thought of you since you mentioned [they might move / own in that area]. Worth a quick 10-min call if you're curious what it means for your situation? No pressure either way 😊"\n\n—\n\nPhone script version:\n"Hey [Name], quick call — I just updated my market data for ${loc} using live federal sources. Rates hit ${rate}, inventory is ${inventoryTight ? 'down significantly' : 'changing'}, and the Opportunity Score I track came in at ${p.opportunityScore} out of 100 — which lands in Seller Market territory. I know you've been [thinking about / curious about] the market and wanted to give you the real numbers before you see the usual headlines. Do you have 5 minutes?"`,
    },
  ];
}

// ─── Buyer market playbook ────────────────────────────────────────────────────

function buyerPlaybook(p: PlaybookInput): PlaybookItem[] {
  const loc = location(p.cityState, p.zip);
  const rate = fmtRate(p.metrics.mortgage.current);
  const dom = fmtDom(p.metrics.daysOnMarket.current);
  const inv = fmtInv(p.metrics.inventory.current);
  const hpiDir = fmtHpiChange(p.metrics.hpi.change90d);
  const rateFalling = p.metrics.mortgage.trend === 'falling';
  const invExpanding = p.metrics.inventory.trend === 'rising';

  return [
    {
      platform: 'instagram',
      label: 'Instagram / Facebook',
      emoji: '🔑',
      headline: 'The buyers who paused in 2023 may have timed it perfectly.',
      hook: `Inventory ${invExpanding ? 'expanding' : 'stabilizing'} + DOM at ${dom}`,
      body: `🔑 Attention buyers who hit pause — the data in ${loc} has shifted.\n\nHere's what the federal numbers show right now:\n📊 30-yr mortgage rate: ${rate}${rateFalling ? ' and falling' : ''}\n🏠 Active listings: ${inv} — more options to choose from\n📅 Median days on market: ${dom} — sellers are more patient\n${hpiDir ? `📉 Home price index: ${hpiDir} over the last 90 days\n` : ''}\nWhen inventory rises and days on market extend, buyers gain negotiating power they haven't had in years.\n\nIf you've been waiting for the "right time" — the data is worth a conversation. DM me or drop a ❤️ below.\n\n#BuyersMarket #RealEstate #${loc.replace(/[^a-zA-Z]/g, '')} #HomeSearch`,
    },
    {
      platform: 'linkedin',
      label: 'LinkedIn',
      emoji: '📈',
      headline: 'Why buyers in this market have more power than headlines suggest.',
      hook: `Score ${p.opportunityScore}/100 — buyer market signals`,
      body: `The federal economic data for ${loc} tells an interesting story right now — one that's good news for buyers who've been waiting.\n\nFrom FRED (Federal Reserve Economic Data):\n• Mortgage rate: ${rate}${rateFalling ? ' (trending down)' : ''}\n• Active listings: ${inv}${invExpanding ? ' (expanding)' : ''}\n• Median days on market: ${dom}\n• My Opportunity Score for this market: ${p.opportunityScore}/100 — Buyer Market\n\nExtended DOM means sellers are more willing to negotiate. Expanding inventory means buyers have real choices. These conditions historically favor those who act while the shift is early.\n\nKnow a buyer who's been on the sideline? Tag them or share this — the data might be worth their attention.\n\n#BuyersMarket #RealEstateData #MarketUpdate`,
    },
    {
      platform: 'mailer',
      label: 'Postcard / Mailer',
      emoji: '✉️',
      headline: 'Target renters or known buyers who went quiet.',
      hook: 'Buyer market = soft-sell re-engagement works',
      body: `FRONT:\n"The market shifted. Your timing might be better than you think."\n\n—\n\nBACK:\nHi [Name],\n\nI wanted to reach out with a data update for ${loc} from live federal sources:\n\n• Mortgage rates: ${rate}${rateFalling ? ' and declining' : ''}\n• Active listings: ${inv}\n• Homes averaging ${dom} on market — sellers have more flexibility\n\nIf you've been holding off on buying, these numbers suggest this period may offer more negotiating room than the last few years. I'd love to share a no-pressure market snapshot.\n\nText or call me at [your number] — happy to pull the numbers for any area you're watching.\n\n[Agent Name] | [Brokerage] | [License #]`,
    },
    {
      platform: 'community',
      label: 'Community Outreach',
      emoji: '🤝',
      headline: '"First Look" homebuyer workshop at a local venue.',
      hook: 'Expanding inventory = new buyers entering consideration',
      body: `Event idea: "First Look — A Free Homebuyer Data Night"\n\nFormat: Casual workshop at a coffee shop, library, or apartment complex community room (great for renter audiences)\n\nWhat you cover:\n1. Live FRED data for ${loc} — show real rates, inventory, and DOM\n2. What a Buyer Market means in plain English\n3. The math on rent vs. own at current rates\n4. A 5-minute "budget snapshot" — pre-qualification basics\n5. Q&A — bring your real questions, get real answers\n\nWhy it works: Renters who are "thinking about it" convert to buyers when they feel educated, not sold to.\n\nPromo line: "Come curious. Leave with a plan."`,
    },
    {
      platform: 'sphere',
      label: 'Sphere Touchpoint (Call/Text)',
      emoji: '📞',
      headline: 'Re-engage buyers who went quiet in 2022–2023.',
      hook: 'Softening market = right time to follow up on cold leads',
      body: `Text template:\n"Hey [Name]! I pulled the latest federal data for ${loc} and thought of you — rates are at ${rate}${rateFalling ? ' and dropping' : ''}, inventory has expanded to ${inv}, and homes are sitting ${dom} on average. That's a very different picture than when we last talked. Worth a quick catch-up? I can share the full data breakdown — totally no pressure 😊"\n\n—\n\nPhone script version:\n"Hey [Name], I've been tracking the market data for ${loc} with federal sources, and wanted to personally reach out because the numbers have shifted. Rates are at ${rate}, inventory is ${invExpanding ? 'expanding' : 'stabilizing'}, and sellers are averaging ${dom} — which means buyers have real leverage right now that they didn't have before. I know the timing wasn't right when we last spoke, but this felt worth a call. Do you have a few minutes to look at the data together?"`,
    },
  ];
}

// ─── Transitional market playbook ─────────────────────────────────────────────

function transitionalPlaybook(p: PlaybookInput): PlaybookItem[] {
  const loc = location(p.cityState, p.zip);
  const rate = fmtRate(p.metrics.mortgage.current);
  const dom = fmtDom(p.metrics.daysOnMarket.current);
  const inv = fmtInv(p.metrics.inventory.current);

  return [
    {
      platform: 'instagram',
      label: 'Instagram / Facebook',
      emoji: '📊',
      headline: 'Mixed signals = the right time to get educated.',
      hook: 'Transitional market — relationship-building moment',
      body: `📊 Real talk about the market in ${loc}: the data is mixed right now — and that's actually useful information.\n\nFrom live federal sources:\n📈 30-yr rate: ${rate}\n🏠 Active listings: ${inv}\n📅 Median days on market: ${dom}\n\nWhen signals are split, the agents who stand out are the ones sharing real data, not guesses or headlines.\n\nIf you're thinking about buying or selling in the next 6–12 months, now is the exact right time to get a data briefing — before the market picks a direction. DM me and I'll pull the live numbers for your area.\n\n#MarketUpdate #RealEstate #${loc.replace(/[^a-zA-Z]/g, '')} #HousingMarket`,
    },
    {
      platform: 'linkedin',
      label: 'LinkedIn',
      emoji: '🔍',
      headline: 'What a transitional market means for buyers and sellers right now.',
      hook: `Score ${p.opportunityScore}/100 — market in transition`,
      body: `The federal data for ${loc} is sending mixed signals — and as a real estate professional, I think it's worth naming that directly rather than oversimplifying.\n\nFRED indicators as of today:\n• 30-yr fixed rate: ${rate}\n• Active listings: ${inv}\n• Median DOM: ${dom}\n• Opportunity Score: ${p.opportunityScore}/100 — Transitional Market\n\nIn a transitional market, timing matters more than ever. Sellers need to price right from day one. Buyers need to know which neighborhoods are turning before the data catches up.\n\nI share these data points regularly. If you want to be on my market update list for ${loc}, drop a comment or send me a message.\n\n#RealEstateData #MarketIntelligence #HousingMarket`,
    },
    {
      platform: 'mailer',
      label: 'Postcard / Mailer',
      emoji: '✉️',
      headline: 'Use mixed signals as a trust-building hook.',
      hook: 'Transitional = agents who show data win mindshare',
      body: `FRONT:\n"The market in ${loc} is sending mixed signals. Here's what the federal data actually shows."\n\n—\n\nBACK:\nHi [Name],\n\nI track the live federal economic data for ${loc} every time I analyze a market, and wanted to share an honest update:\n\n• 30-yr mortgage rate: ${rate}\n• Active listings: ${inv}\n• Homes averaging ${dom} on market\n\nRight now the data is mixed — not a clear seller's or buyer's market. That means the agent you work with matters more than ever. Strategy, pricing, and timing all have to be right.\n\nI'd love to walk you through what this means for your specific situation. No cost, no commitment.\n\n[Agent Name] | [Brokerage] | [License #]`,
    },
    {
      platform: 'community',
      label: 'Community Outreach',
      emoji: '🤝',
      headline: '"State of the Market" casual neighborhood series.',
      hook: 'Mixed market = high curiosity, low urgency — perfect for education',
      body: `Event idea: "State of the Market — A Quarterly Data Night for ${loc} Residents"\n\nFormat: Quarterly recurring event (builds audience over time)\nVenue: Coffee shop, library, or neighborhood association meeting\n\nWhat you cover:\n1. The 5 federal indicators you track and what they mean in plain language\n2. Current readings for ${loc} — live FRED data on screen\n3. "What does this mean for you?" — breakout by buyer vs. seller vs. investor\n4. Open Q&A\n\nWhy quarterly?: Mixed markets shift. Being the agent who updates the neighborhood quarterly builds top-of-mind awareness that no postcard can match.\n\nSignature line: "I don't predict the market. I read the data with you."`,
    },
    {
      platform: 'sphere',
      label: 'Sphere Touchpoint (Call/Text)',
      emoji: '📞',
      headline: 'Low-pressure "market check-in" for your top 20 contacts.',
      hook: 'Relationship-building touch during uncertain conditions',
      body: `Text template:\n"Hey [Name]! Just pulled the live federal data for ${loc} — rates at ${rate}, inventory at ${inv}, homes averaging ${dom}. Honestly the signals are mixed right now, which means the next 3–6 months will be telling. Wanted to stay on your radar in case you're starting to think about anything. How are things going?"\n\n—\n\nPhone script version:\n"Hey [Name], quick call — I'm doing market check-ins with my top clients because the data for ${loc} is in a transitional phase right now. Rates are at ${rate}, inventory is at ${inv}, and DOM is ${dom}. Nothing urgent, but I want to make sure you have the real picture if something comes up. Are you thinking about anything in the next 6 months? Even casually?"`,
    },
  ];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generatePlaybook(input: PlaybookInput): Playbook {
  let items: PlaybookItem[];
  if (input.leadType === 'seller') {
    items = sellerPlaybook(input);
  } else if (input.leadType === 'buyer') {
    items = buyerPlaybook(input);
  } else {
    items = transitionalPlaybook(input);
  }
  return { input, items };
}
