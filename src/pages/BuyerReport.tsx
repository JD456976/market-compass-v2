import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Clock, Users, Target, TrendingUp, AlertCircle, CheckCircle2, AlertTriangle, ShieldAlert, FileDown, Share2 } from 'lucide-react';
import { Session, BuyerReportData, LikelihoodBand } from '@/types';
import { upsertSession, getMarketProfileById } from '@/lib/storage';
import { calculateBuyerReport } from '@/lib/scoring';
import { useToast } from '@/hooks/use-toast';
import { exportReportToPdf } from '@/lib/pdfExport';
import { ReportHeader } from '@/components/ReportHeader';

const IMPORTANT_NOTICE = `Important Notice: This report is an informational decision-support tool. It is not an appraisal, valuation, guarantee, or prediction of outcome. Actual results depend on market conditions, competing properties or offers, and buyer/seller decisions outside the scope of this analysis.`;

function LikelihoodBadge({ band }: { band: LikelihoodBand }) {
  if (band === 'High') {
    return <Badge variant="success" className="px-4 py-1.5 text-sm font-medium">High</Badge>;
  }
  if (band === 'Moderate') {
    return <Badge variant="warning" className="px-4 py-1.5 text-sm font-medium">Moderate</Badge>;
  }
  return <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium">Low</Badge>;
}

function RiskBadge({ band }: { band: LikelihoodBand }) {
  if (band === 'High') {
    return <Badge variant="destructive" className="px-4 py-1.5 text-sm font-medium">High</Badge>;
  }
  if (band === 'Moderate') {
    return <Badge variant="warning" className="px-4 py-1.5 text-sm font-medium">Moderate</Badge>;
  }
  return <Badge variant="success" className="px-4 py-1.5 text-sm font-medium">Low</Badge>;
}

const BuyerReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reportData, setReportData] = useState<BuyerReportData | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('current_session');
    if (!sessionData) {
      navigate('/buyer');
      return;
    }
    
    try {
      const session: Session = JSON.parse(sessionData);
      const marketProfile = session.selected_market_profile_id 
        ? getMarketProfileById(session.selected_market_profile_id) 
        : undefined;
      
      const data = calculateBuyerReport(session, marketProfile);
      setReportData(data);
    } catch {
      navigate('/buyer');
    }
  }, [navigate]);

  const handleSave = () => {
    if (!reportData) return;
    
    try {
      upsertSession(reportData.session);
      setSaved(true);
      toast({
        title: "Session saved",
        description: "Your buyer session has been saved successfully.",
      });
    } catch {
      toast({
        title: "Could not save session",
        description: "There was an error saving your session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportPdf = async () => {
    if (!reportData) return;
    try {
      await exportReportToPdf('report-export', {
        clientName: reportData.session.client_name,
        reportType: 'Buyer',
        snapshotTimestamp: reportData.snapshotTimestamp,
      });
      toast({
        title: "PDF exported",
        description: "Your report has been downloaded.",
      });
    } catch {
      toast({
        title: "PDF export failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShareLink = () => {
    if (!reportData) return;
    try {
      // Always save before sharing to ensure the session is in localStorage
      upsertSession(reportData.session);
      const url = `${window.location.origin}/share/${reportData.session.id}`;
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Share link has been copied to clipboard.",
      });
    } catch {
      toast({
        title: "Could not generate share link",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!reportData) return null;

  const { session, marketProfile, acceptanceLikelihood, riskOfLosingHome, riskOfOverpaying, snapshotTimestamp } = reportData;
  const inputs = session.buyer_inputs!;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/buyer">
              <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold">Buyer Report</h1>
                <p className="text-sm text-primary-foreground/70">{session.client_name} • {session.location}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl -mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Report content for PDF export */}
          <div id="report-export" className="space-y-6">
            {/* Prepared For/By Header Block */}
            <ReportHeader
              reportType="Buyer"
              clientName={session.client_name}
              snapshotTimestamp={snapshotTimestamp}
            />

            {/* Offer Overview */}
            <Card className="pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-accent" />
                  Offer Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{session.client_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{session.location}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Property Type</p>
                    <p className="font-medium">{session.property_type}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Condition</p>
                    <p className="font-medium">{session.condition}</p>
                  </div>
                  {marketProfile && (
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-sm text-muted-foreground">Market Profile</p>
                      <p className="font-medium">{marketProfile.label}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Offer Details */}
            <Card className="pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Offer Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Offer Price</p>
                    <p className="text-lg font-serif font-bold">{formatCurrency(inputs.offer_price)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Financing</p>
                    <p className="text-lg font-serif font-bold">{inputs.financing_type}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Down Payment</p>
                    <p className="text-lg font-serif font-bold">{inputs.down_payment_percent}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Closing</p>
                    <p className="text-lg font-serif font-bold">{inputs.closing_timeline} days</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Contingencies</p>
                    <p className="font-medium">{inputs.contingencies.length > 0 ? inputs.contingencies.join(', ') : 'None'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Buyer Preference</p>
                    <p className="font-medium">{inputs.buyer_preference}</p>
                  </div>
                </div>
                {inputs.notes && (
                  <div className="mt-4 p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{inputs.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Acceptance Likelihood */}
            <Card className="pdf-avoid-break overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-accent" />
                    Offer Acceptance Likelihood
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Market snapshot as of: {new Date(snapshotTimestamp).toLocaleString()}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex justify-center">
                  <div className="text-center p-8 rounded-xl border-2 border-accent/30 bg-accent/5 min-w-[200px]">
                    <p className="text-sm text-muted-foreground mb-3">Likelihood of Acceptance</p>
                    <LikelihoodBadge band={acceptanceLikelihood} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Tradeoff */}
            <Card className="pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldAlert className="h-5 w-5 text-accent" />
                  Risk Tradeoff Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="text-center p-6 rounded-xl border-2 border-border/50">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <p className="font-medium mb-2">Risk of Losing Home</p>
                    <RiskBadge band={riskOfLosingHome} />
                    <p className="text-xs text-muted-foreground mt-3">
                      Lower aggressive offers increase this risk
                    </p>
                  </div>
                  <div className="text-center p-6 rounded-xl border-2 border-border/50">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-6 w-6 text-amber-600" />
                    </div>
                    <p className="font-medium mb-2">Risk of Overpaying</p>
                    <RiskBadge band={riskOfOverpaying} />
                    <p className="text-xs text-muted-foreground mt-3">
                      Higher aggressive offers increase this risk
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important Notice */}
            <div className="pdf-avoid-break flex gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{IMPORTANT_NOTICE}</p>
            </div>
          </div>

          {/* Actions - OUTSIDE report-export container */}
          <div className="flex flex-wrap gap-4 pt-4 report-actions">
            <Link to="/buyer">
              <Button variant="outline" size="lg">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saved} size="lg" variant={saved ? "secondary" : "accent"}>
              {saved ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Session Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Session
                </>
              )}
            </Button>
            <Button onClick={handleExportPdf} size="lg" variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={handleShareLink} size="lg" variant="outline">
              <Share2 className="mr-2 h-4 w-4" />
              Share Link
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BuyerReport;
