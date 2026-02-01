import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import { Session, LikelihoodBand } from '@/types';

interface BuyerTakeawaysProps {
  type: 'buyer';
  session: Session;
  acceptanceLikelihood: LikelihoodBand;
  riskOfLosingHome: LikelihoodBand;
  riskOfOverpaying: LikelihoodBand;
}

interface SellerTakeawaysProps {
  type: 'seller';
  session: Session;
  likelihood30: LikelihoodBand;
}

type AgentTakeawaysProps = BuyerTakeawaysProps | SellerTakeawaysProps;

function getBuyerTakeaways(
  session: Session,
  acceptanceLikelihood: LikelihoodBand,
  riskOfLosingHome: LikelihoodBand,
  riskOfOverpaying: LikelihoodBand
): { lever: string; risk: string; framing: string } {
  const inputs = session.buyer_inputs!;
  
  // Determine primary lever
  let lever = '';
  if (inputs.buyer_preference === 'Price-protective') {
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

  // Determine risk to watch
  let risk = '';
  if (riskOfLosingHome === 'High' || (riskOfLosingHome === 'Moderate' && riskOfOverpaying === 'Low')) {
    risk = 'Watch for competitive pressure—client may need to act quickly.';
  } else if (riskOfOverpaying === 'High' || riskOfOverpaying === 'Moderate') {
    risk = 'Monitor value protection—ensure pricing aligns with comparables.';
  } else {
    risk = 'Balanced risk profile—maintain current positioning unless market shifts.';
  }

  // Suggested framing
  let framing = '';
  if (acceptanceLikelihood === 'High') {
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
  
  // Determine primary lever
  let lever = '';
  if (inputs.strategy_preference === 'Maximize price') {
    lever = 'List price is the primary lever—consider market response after initial exposure.';
  } else if (inputs.strategy_preference === 'Prioritize speed') {
    lever = 'Pricing aggressiveness is key—current strategy prioritizes velocity.';
  } else if (inputs.desired_timeframe === '30' && likelihood30 !== 'High') {
    lever = 'Timeframe expectations may need adjustment given current market positioning.';
  } else {
    lever = 'Balanced strategy allows flexibility—monitor early showing feedback.';
  }

  // Determine risk to watch
  let risk = '';
  if (likelihood30 === 'Low' && inputs.desired_timeframe === '30') {
    risk = 'Extended time on market is likely—prepare client for pricing discussion at 30 days.';
  } else if (inputs.strategy_preference === 'Maximize price') {
    risk = 'Days on market may accumulate—have contingency pricing strategy ready.';
  } else if (inputs.strategy_preference === 'Prioritize speed') {
    risk = 'Speed pricing may leave value on table—track comparable closings.';
  } else {
    risk = 'Balanced exposure—review buyer feedback after first two weeks.';
  }

  // Suggested framing
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
