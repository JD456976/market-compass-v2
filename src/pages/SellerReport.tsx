import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Clock, Building2, Target, TrendingUp, AlertCircle, CheckCircle2, FileDown, Share2 } from 'lucide-react';
import { Session, SellerReportData, LikelihoodBand } from '@/types';
import { upsertSession, getMarketProfileById } from '@/lib/storage';
import { calculateSellerReport } from '@/lib/scoring';
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

const SellerReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reportData, setReportData] = useState<SellerReportData | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('current_session');
    if (!sessionData) {
      navigate('/seller');
      return;
    }
    
    try {
      const session: Session = JSON.parse(sessionData);
      const marketProfile = session.selected_market_profile_id 
        ? getMarketProfileById(session.selected_market_profile_id) 
        : undefined;
      
      const data = calculateSellerReport(session, marketProfile);
      setReportData(data);
    } catch {
      navigate('/seller');
    }
  }, [navigate]);

  const handleSave = () => {
    if (!reportData) return;
    
    try {
      upsertSession(reportData.session);
      setSaved(true);
      toast({
        title: "Session saved",
        description: "Your seller session has been saved successfully.",
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
        reportType: 'Seller',
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

  const { session, marketProfile, likelihood30, likelihood60, likelihood90, snapshotTimestamp } = reportData;
  const inputs = session.seller_inputs!;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/seller">
              <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Building2 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold">Seller Report</h1>
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
            {/* Prepared For/By Header Block - hidden in PDF (rendered by jsPDF) */}
            <div className="pdf-section pdf-header-section">
              <ReportHeader
                reportType="Seller"
                clientName={session.client_name}
                snapshotTimestamp={snapshotTimestamp}
                showTimestamp={false}
              />
            </div>

            {/* Property Overview */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-accent" />
                  Property Overview
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

            {/* Inputs Chosen */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Listing Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-1">List Price</p>
                    <p className="text-xl font-serif font-bold">{formatCurrency(inputs.seller_selected_list_price)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-1">Timeframe</p>
                    <p className="text-xl font-serif font-bold">{inputs.desired_timeframe} days</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-1">Strategy</p>
                    <p className="text-xl font-serif font-bold">{inputs.strategy_preference}</p>
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

            {/* Market Snapshot */}
            <Card className="pdf-section pdf-avoid-break overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-accent" />
                    Sale Likelihood Analysis
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Market snapshot as of: {new Date(snapshotTimestamp).toLocaleString()}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-3">30 Days</p>
                    <LikelihoodBadge band={likelihood30} />
                  </div>
                  <div className="text-center p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-3">60 Days</p>
                    <LikelihoodBadge band={likelihood60} />
                  </div>
                  <div className="text-center p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-3">90 Days</p>
                    <LikelihoodBadge band={likelihood90} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tradeoff Summary */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Tradeoff Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 p-4 rounded-xl bg-secondary/50">
                  <TrendingUp className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Price vs. Time</p>
                    <p className="text-sm text-muted-foreground">
                      {inputs.strategy_preference === 'Maximize price' 
                        ? 'Prioritizing maximum price may extend time on market.'
                        : inputs.strategy_preference === 'Prioritize speed'
                        ? 'Prioritizing speed may require competitive pricing.'
                        : 'Balanced approach aims to optimize both price and timing.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 p-4 rounded-xl bg-secondary/50">
                  <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Certainty</p>
                    <p className="text-sm text-muted-foreground">
                      At the current list price of {formatCurrency(inputs.seller_selected_list_price)}, 
                      the likelihood of sale increases over time as market exposure grows.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important Notice */}
            <div className="pdf-section pdf-avoid-break flex gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{IMPORTANT_NOTICE}</p>
            </div>
          </div>

          {/* Actions - OUTSIDE report-export container */}
          <div className="flex flex-wrap gap-4 pt-4 report-actions">
            <Link to="/seller">
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

export default SellerReport;
