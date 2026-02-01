import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Clock } from 'lucide-react';
import { Session, BuyerReportData, LikelihoodBand } from '@/types';
import { saveSession, getMarketProfileById } from '@/lib/storage';
import { calculateBuyerReport } from '@/lib/scoring';

const IMPORTANT_NOTICE = `Important Notice: This report is an informational decision-support tool. It is not an appraisal, valuation, guarantee, or prediction of outcome. Actual results depend on market conditions, competing properties or offers, and buyer/seller decisions outside the scope of this analysis.`;

function LikelihoodBadge({ band }: { band: LikelihoodBand }) {
  const variant = band === 'High' ? 'default' : band === 'Moderate' ? 'secondary' : 'outline';
  return <Badge variant={variant} className="text-sm">{band}</Badge>;
}

function RiskBadge({ band, inverted = false }: { band: LikelihoodBand; inverted?: boolean }) {
  // For risk, High = bad (destructive), Low = good (default)
  let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
  if (band === 'High') variant = inverted ? 'default' : 'destructive';
  else if (band === 'Low') variant = inverted ? 'destructive' : 'default';
  return <Badge variant={variant} className="text-sm">{band}</Badge>;
}

const BuyerReport = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<BuyerReportData | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('current_session');
    if (!sessionData) {
      navigate('/buyer');
      return;
    }
    
    const session: Session = JSON.parse(sessionData);
    const marketProfile = session.selected_market_profile_id 
      ? getMarketProfileById(session.selected_market_profile_id) 
      : undefined;
    
    try {
      const data = calculateBuyerReport(session, marketProfile);
      setReportData(data);
    } catch {
      navigate('/buyer');
    }
  }, [navigate]);

  const handleSave = () => {
    if (reportData) {
      saveSession(reportData.session);
      setSaved(true);
    }
  };

  if (!reportData) return null;

  const { session, marketProfile, acceptanceLikelihood, riskOfLosingHome, riskOfOverpaying, snapshotTimestamp } = reportData;
  const inputs = session.buyer_inputs!;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/buyer">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Buyer Report</h1>
        </div>

        {/* Offer Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Offer Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">Client:</span> {session.client_name}</div>
            <div><span className="font-medium">Location:</span> {session.location}</div>
            <div><span className="font-medium">Property Type:</span> {session.property_type}</div>
            <div><span className="font-medium">Condition:</span> {session.condition}</div>
            {marketProfile && (
              <div className="md:col-span-2">
                <span className="font-medium">Market Profile:</span> {marketProfile.label}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inputs Chosen */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Inputs Chosen</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">Offer Price:</span> {formatCurrency(inputs.offer_price)}</div>
            <div><span className="font-medium">Financing:</span> {inputs.financing_type}</div>
            <div><span className="font-medium">Down Payment:</span> {inputs.down_payment_percent}</div>
            <div><span className="font-medium">Closing Timeline:</span> {inputs.closing_timeline} days</div>
            <div className="md:col-span-2">
              <span className="font-medium">Contingencies:</span>{' '}
              {inputs.contingencies.length > 0 ? inputs.contingencies.join(', ') : 'None'}
            </div>
            <div><span className="font-medium">Buyer Preference:</span> {inputs.buyer_preference}</div>
            {inputs.notes && (
              <div className="md:col-span-2"><span className="font-medium">Notes:</span> {inputs.notes}</div>
            )}
          </CardContent>
        </Card>

        {/* Market Snapshot */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Market Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generated: {new Date(snapshotTimestamp).toLocaleString()}
            </p>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Offer Acceptance Likelihood</h4>
                <div className="p-4 border rounded-lg text-center max-w-xs">
                  <LikelihoodBadge band={acceptanceLikelihood} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Tradeoff */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Risk Tradeoff Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-sm font-medium mb-2">Risk of Losing Home</div>
                <RiskBadge band={riskOfLosingHome} />
                <p className="text-xs text-muted-foreground mt-2">
                  Lower aggressive offers increase this risk
                </p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-sm font-medium mb-2">Risk of Overpaying</div>
                <RiskBadge band={riskOfOverpaying} />
                <p className="text-xs text-muted-foreground mt-2">
                  Higher aggressive offers increase this risk
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <Card className="mb-6 border-muted">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground italic">{IMPORTANT_NOTICE}</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Link to="/buyer">
            <Button variant="outline">Back</Button>
          </Link>
          <Button onClick={handleSave} disabled={saved}>
            <Save className="mr-2 h-4 w-4" />
            {saved ? 'Session Saved' : 'Save Session'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BuyerReport;
