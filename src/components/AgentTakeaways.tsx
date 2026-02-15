import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import { Session, LikelihoodBand, ExtendedLikelihoodBand } from '@/types';

interface BuyerTakeawaysProps {
  type: 'buyer';
  session: Session;
  acceptanceLikelihood: ExtendedLikelihoodBand;
  riskOfLosingHome: ExtendedLikelihoodBand;
  riskOfOverpaying: ExtendedLikelihoodBand;
}

interface SellerTakeawaysProps {
  type: 'seller';
  session: Session;
  likelihood30: LikelihoodBand;
}

type AgentTakeawaysProps = BuyerTakeawaysProps | SellerTakeawaysProps;

// Helper to check "high-ish" for extended bands
function isHighOrAbove(band: ExtendedLikelihoodBand): boolean {
  return band === 'High' || band === 'Very High';
}
function isModerateOrAbove(band: ExtendedLikelihoodBand): boolean {
  return band === 'Moderate' || band === 'High' || band === 'Very High';
}

function getBuyerTakeaways(
  session: Session,
  acceptanceLikelihood: ExtendedLikelihoodBand,
  riskOfLosingHome: ExtendedLikelihoodBand,
  riskOfOverpaying: ExtendedLikelihoodBand
): { lever: string; risk: string; framing: string } {
  const inputs = session.buyer_inputs!;
  
  // Determine if signals are the dominant factor
  const hasHeavyTraffic = inputs.showing_traffic === 'Heavy';
  const hasMinimalTraffic = inputs.showing_traffic === 'Minimal';
  const hasOfferDeadline = !!inputs.offer_deadline;
  const priceReduced = inputs.price_change_direction === 'Reduced';
  const priceIncreased = inputs.price_change_direction === 'Increased';
  const signalPressure = (hasHeavyTraffic ? 1 : 0) + (hasOfferDeadline ? 1 : 0) + (priceIncreased ? 1 : 0);
  const signalRelief = (hasMinimalTraffic ? 1 : 0) + (priceReduced ? 1 : 0);

  let lever = '';
  // Signal-dominant lever: competitive pressure from field signals
  if (signalPressure >= 2) {
    lever = 'Field signals indicate strong competition—escalation clauses or contingency removal may be the most effective lever.';
  } else if (hasHeavyTraffic && hasOfferDeadline) {
    lever = 'Heavy traffic with an active deadline creates urgency—speed and clean terms outweigh price adjustments.';
  } else if (priceReduced && !hasHeavyTraffic) {
    lever = 'Price reduction signals seller flexibility—negotiation on terms may yield better results than raising price.';
  } else if (inputs.buyer_preference === 'Price-protective') {
    lever = 'Consider adjusting offer price if competitiveness becomes a priority.';
  } else if (inputs.contingencies.length > 1 || (inputs.contingencies.length === 1 && inputs.contingencies[0] !== 'None')) {
    lever = 'Contingency reduction is likely the highest-impact lever for this offer.';
  } else if (inputs.financing_type !== 'Cash' && inputs.down_payment_percent !== '20+') {
    lever = 'Strengthening financing terms could improve seller confidence.';
  } else if (inputs.closing_timeline === '31-45' || inputs.closing_timeline === '45+') {
    lever = 'A shorter closing timeline may signal stronger buyer readiness.';
  } else {
    lever = 'Offer price positioning is the primary lever for this scenario.';
  }

  let risk = '';
  // Signal-dominant risk warnings
  if (hasHeavyTraffic && hasOfferDeadline) {
    risk = 'High competitive pressure from field signals—client risks losing property without swift action.';
  } else if (hasHeavyTraffic) {
    risk = 'Heavy showing traffic suggests multiple interested parties—monitor for escalating offers.';
  } else if (priceIncreased) {
    risk = 'Price increase signals seller confidence—offer may need to exceed new reference.';
  } else if (isHighOrAbove(riskOfLosingHome) || (isModerateOrAbove(riskOfLosingHome) && !isModerateOrAbove(riskOfOverpaying))) {
    risk = 'Watch for competitive pressure—client may need to act quickly.';
  } else if (isModerateOrAbove(riskOfOverpaying)) {
    risk = 'Monitor value protection—ensure pricing aligns with comparables.';
  } else if (hasMinimalTraffic && priceReduced) {
    risk = 'Low activity with price cuts may signal property-specific concerns—investigate before proceeding.';
  } else {
    risk = 'Balanced risk profile—maintain current positioning unless market shifts.';
  }

  let framing = '';
  if (isHighOrAbove(acceptanceLikelihood)) {
    framing = '"Your offer is well-positioned for consideration given current market conditions."';
  } else if (acceptanceLikelihood === 'Moderate') {
    framing = '"There are opportunities to strengthen your offer if we see competitive activity."';
  } else {
    framing = '"Let\'s discuss adjustments that could improve your positioning with the seller."';
  }

  return { lever, risk, framing };
}

function getSellerTakeaways(
  session: Session,
  likelihood30: LikelihoodBand
): { lever: string; risk: string; framing: string } {
  const inputs = session.seller_inputs!;
  
  // Signal awareness
  const hasHeavyTraffic = inputs.showing_traffic === 'Heavy';
  const hasMinimalTraffic = inputs.showing_traffic === 'Minimal';
  const hasOfferDeadline = !!inputs.offer_deadline;
  const priceReduced = inputs.price_change_direction === 'Reduced';
  const priceIncreased = inputs.price_change_direction === 'Increased';

  let lever = '';
  if (hasHeavyTraffic && hasOfferDeadline) {
    lever = 'Strong buyer interest with deadline pressure—hold firm on pricing and minimize concessions.';
  } else if (hasMinimalTraffic && likelihood30 !== 'High') {
    lever = 'Low showing activity is the primary constraint—pricing adjustment is the most effective lever.';
  } else if (priceReduced && hasMinimalTraffic) {
    lever = 'Prior price reduction without traffic improvement signals need for repositioning or incentives.';
  } else if (inputs.strategy_preference === 'Maximize price') {
    lever = 'List price is the primary lever—consider market response after initial exposure.';
  } else if (inputs.strategy_preference === 'Prioritize speed') {
    lever = 'Pricing aggressiveness is key—current strategy prioritizes velocity.';
  } else if (inputs.desired_timeframe === '30' && likelihood30 !== 'High') {
    lever = 'Timeframe expectations may need adjustment given current market positioning.';
  } else {
    lever = 'Balanced strategy allows flexibility—monitor early showing feedback.';
  }

  let risk = '';
  if (hasMinimalTraffic && inputs.desired_timeframe === '30') {
    risk = 'Minimal showing traffic with a 30-day target creates stale listing risk—prepare for price discussion.';
  } else if (priceReduced && hasMinimalTraffic) {
    risk = 'Low traffic despite price reduction may indicate property-specific concerns beyond pricing.';
  } else if (likelihood30 === 'Low' && inputs.desired_timeframe === '30') {
    risk = 'Extended time on market is likely—prepare client for pricing discussion at 30 days.';
  } else if (inputs.strategy_preference === 'Maximize price') {
    risk = 'Days on market may accumulate—have contingency pricing strategy ready.';
  } else if (inputs.strategy_preference === 'Prioritize speed') {
    risk = 'Speed pricing may leave value on table—track comparable closings.';
  } else if (hasHeavyTraffic) {
    risk = 'Strong interest detected—risk of underpricing if offers arrive quickly. Be ready to evaluate.';
  } else {
    risk = 'Balanced exposure—review buyer feedback after first two weeks.';
  }

  let framing = '';
  if (likelihood30 === 'High') {
    framing = '"Market conditions are favorable—we should see activity within the first few weeks."';
  } else if (likelihood30 === 'Moderate') {
    framing = '"We\'re positioned competitively. Let\'s review feedback after initial showings."';
  } else {
    framing = '"Our pricing strategy prioritizes value. We should plan to reassess after 30 days of exposure."';
  }

  return { lever, risk, framing };
}

export function AgentTakeaways(props: AgentTakeawaysProps) {
  const takeaways = props.type === 'buyer'
    ? getBuyerTakeaways(
        props.session,
        props.acceptanceLikelihood,
        props.riskOfLosingHome,
        props.riskOfOverpaying
      )
    : getSellerTakeaways(props.session, props.likelihood30);

  return (
    <Card className="pdf-section pdf-avoid-break pdf-hide-agent-notes border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-primary" />
          Agent Takeaways
          <span className="text-xs font-normal text-muted-foreground">(Internal)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="font-medium text-primary shrink-0">Lever:</span>
            <span className="text-muted-foreground">{takeaways.lever}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-primary shrink-0">Risk:</span>
            <span className="text-muted-foreground">{takeaways.risk}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-primary shrink-0">Framing:</span>
            <span className="text-muted-foreground italic">{takeaways.framing}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
