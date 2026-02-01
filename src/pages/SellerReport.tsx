import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Clock } from 'lucide-react';
import { Session, SellerReportData, LikelihoodBand } from '@/types';
import { saveSession, getMarketProfileById } from '@/lib/storage';
import { calculateSellerReport } from '@/lib/scoring';

const IMPORTANT_NOTICE = `Important Notice: This report is an informational decision-support tool. It is not an appraisal, valuation, guarantee, or prediction of outcome. Actual results depend on market conditions, competing properties or offers, and buyer/seller decisions outside the scope of this analysis.`;

function LikelihoodBadge({ band }: { band: LikelihoodBand }) {
  const variant = band === 'High' ? 'default' : band === 'Moderate' ? 'secondary' : 'outline';
  return <Badge variant={variant} className="text-sm">{band}</Badge>;
}

const SellerReport = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<SellerReportData | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('current_session');
    if (!sessionData) {
      navigate('/seller');
      return;
    }
    
    const session: Session = JSON.parse(sessionData);
    const marketProfile = session.selected_market_profile_id 
      ? getMarketProfileById(session.selected_market_profile_id) 
      : undefined;
    
    const data = calculateSellerReport(session, marketProfile);
    setReportData(data);
  }, [navigate]);

  const handleSave = () => {
    if (reportData) {
      saveSession(reportData.session);
      setSaved(true);
    }
  };

  if (!reportData) return null;

  const { session, marketProfile, likelihood30, likelihood60, likelihood90, snapshotTimestamp } = reportData;
  const inputs = session.seller_inputs!;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/seller">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Seller Report</h1>
        </div>

        {/* Property Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Property Overview</CardTitle>
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
            <div><span className="font-medium">List Price:</span> {formatCurrency(inputs.seller_selected_list_price)}</div>
            <div><span className="font-medium">Desired Timeframe:</span> {inputs.desired_timeframe} days</div>
            <div><span className="font-medium">Strategy:</span> {inputs.strategy_preference}</div>
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
            
            <div className="space-y-4">
              <h4 className="font-semibold">Sale Likelihood by Timeframe</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 border rounded-lg">
                  <div className="text-lg font-bold mb-2">30 Days</div>
                  <LikelihoodBadge band={likelihood30} />
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-lg font-bold mb-2">60 Days</div>
                  <LikelihoodBadge band={likelihood60} />
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-lg font-bold mb-2">90 Days</div>
                  <LikelihoodBadge band={likelihood90} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tradeoff Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tradeoff Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <span className="font-medium">Price vs. Time:</span>{' '}
              {inputs.strategy_preference === 'Maximize price' 
                ? 'Prioritizing maximum price may extend time on market.'
                : inputs.strategy_preference === 'Prioritize speed'
                ? 'Prioritizing speed may require competitive pricing.'
                : 'Balanced approach aims to optimize both price and timing.'}
            </p>
            <p>
              <span className="font-medium">Certainty:</span>{' '}
              At the current list price of {formatCurrency(inputs.seller_selected_list_price)}, 
              the likelihood of sale increases over time as market exposure grows.
            </p>
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
          <Link to="/seller">
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

export default SellerReport;
