import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, Building2, Users, Target, TrendingUp, AlertCircle, 
  AlertTriangle, ShieldAlert, FileDown
} from 'lucide-react';
import { Session, LikelihoodBand, MarketProfile } from '@/types';
import { getSessionById, getMarketProfileById, upsertSession } from '@/lib/storage';
import { calculateSellerReport, calculateBuyerReport } from '@/lib/scoring';
import { ReportHeader } from '@/components/ReportHeader';
import { MethodologyFooter } from '@/components/MethodologyFooter';
import { formatLocation } from '@/lib/utils';
import { LikelihoodBar } from '@/components/ClientVisuals';
import { ForceClientMode } from '@/contexts/ClientModeContext';
import { exportReportToPdf } from '@/lib/pdfExport';
import { useToast } from '@/hooks/use-toast';
import { 
  getTitle, 
  buyerWhatThisMeans, 
  sellerWhatThisMeans,
  buyerRiskDescriptions,
  tradeoffDescriptions,
} from '@/lib/clientLanguage';

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

const IMPORTANT_NOTICE = `Important Notice: This report is an informational decision-support tool. It is not an appraisal, valuation, guarantee, or prediction of outcome. Actual results depend on market conditions, competing properties or offers, and buyer/seller decisions outside the scope of this analysis.`;

const SharedReportContent = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [marketProfile, setMarketProfile] = useState<MarketProfile | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Always use client mode language for shared reports - NO TOGGLE
  const isClientMode = true;
  const mode = 'client';

  useEffect(() => {
    if (!sessionId) {
      setNotFound(true);
      return;
    }

    const loadedSession = getSessionById(sessionId);
    if (!loadedSession) {
      setNotFound(true);
      return;
    }

    setSession(loadedSession);
    if (loadedSession.selected_market_profile_id) {
      setMarketProfile(getMarketProfileById(loadedSession.selected_market_profile_id));
    }
  }, [sessionId]);

  const handleExportPdf = async () => {
    if (!session) return;
    setExporting(true);
    try {
      await exportReportToPdf('shared-report-export', {
        clientName: session.client_name,
        reportType: session.session_type === 'Seller' ? 'Seller' : 'Buyer',
        snapshotTimestamp: reportData?.snapshotTimestamp,
        isClientMode: true,
      });
      // Mark as exported if not already
      if (!session.pdf_exported) {
        const updatedSession = { ...session, pdf_exported: true };
        upsertSession(updatedSession);
        setSession(updatedSession);
      }
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
    } finally {
      setExporting(false);
    }
  };

  // Calculate report data early so it's available for PDF export
  const reportData = session 
    ? (session.session_type === 'Seller' 
        ? calculateSellerReport(session, marketProfile)
        : calculateBuyerReport(session, marketProfile))
    : null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-serif font-bold mb-2">Report Not Available</h2>
            <p className="text-muted-foreground mb-4">
              No report was found on this device.
            </p>
            <p className="text-xs text-muted-foreground">
              Open the report on the device where it was created, then click Share Link again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session || !reportData) return null;

  const isSeller = session.session_type === 'Seller';

  // Get mode-appropriate text for buyer
  const buyerAcceptance = !isSeller && 'acceptanceLikelihood' in reportData ? reportData.acceptanceLikelihood : 'Moderate';
  const buyerWhatThisMeansText = buyerAcceptance === 'High' 
    ? buyerWhatThisMeans[mode].high
    : buyerAcceptance === 'Moderate'
    ? buyerWhatThisMeans[mode].moderate
    : buyerWhatThisMeans[mode].low;

  // Get mode-appropriate text for seller
  const sellerLikelihood30 = isSeller && 'likelihood30' in reportData ? reportData.likelihood30 : 'Moderate';
  const sellerWhatThisMeansText = sellerLikelihood30 === 'High' 
    ? sellerWhatThisMeans[mode].high
    : sellerLikelihood30 === 'Moderate'
    ? sellerWhatThisMeans[mode].moderate
    : sellerWhatThisMeans[mode].low;

  return (
    <div className="min-h-screen bg-background">
      {/* Shared Report Banner with PDF Export */}
      <div className="bg-muted border-b border-border">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Shared Report
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPdf}
              disabled={exporting}
              className="h-8 text-xs"
            >
              <FileDown className="h-3.5 w-3.5 mr-1.5" />
              {exporting ? 'Exporting...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Header - NO toggle, NO navigation */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              {isSeller ? <Building2 className="h-5 w-5 text-accent" /> : <Users className="h-5 w-5 text-accent" />}
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold">{isSeller ? 'Seller' : 'Buyer'} Report</h1>
              <p className="text-sm text-primary-foreground/70">{session.client_name} • {formatLocation(session.location)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl -mt-4">
        <motion.div
          id="shared-report-export"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Prepared For/By Header Block */}
          <div className="pdf-section pdf-header-section">
            <ReportHeader
              reportType={isSeller ? 'Seller' : 'Buyer'}
              clientName={session.client_name}
              snapshotTimestamp={reportData.snapshotTimestamp}
            />
          </div>

          {/* Overview Card */}
          <Card className="pdf-section pdf-avoid-break">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-accent" />
                {isSeller ? getTitle('propertyOverview', isClientMode) : getTitle('offerOverview', isClientMode)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 report-info-block">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{session.client_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{formatLocation(session.location)}</p>
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

          {/* Seller-specific content */}
          {isSeller && session.seller_inputs && (
            <>
              <Card className="pdf-section pdf-avoid-break">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    {getTitle('listingStrategy', isClientMode)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 likelihood-cards-mobile">
                    <div className="p-4 rounded-xl bg-secondary/50 text-center">
                      <p className="text-sm text-muted-foreground mb-1">List Price</p>
                      <p className="text-xl font-serif font-bold">{formatCurrency(session.seller_inputs.seller_selected_list_price)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Timeframe</p>
                      <p className="text-xl font-serif font-bold">{session.seller_inputs.desired_timeframe} days</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Strategy</p>
                      <p className="text-xl font-serif font-bold">{session.seller_inputs.strategy_preference}</p>
                    </div>
                  </div>
                  {/* Only show client notes - NEVER agent notes */}
                  {(session.seller_inputs.client_notes || session.seller_inputs.notes) && (
                    <div className="mt-4 p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{session.seller_inputs.client_notes || session.seller_inputs.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="pdf-section pdf-avoid-break overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 section-header-mobile">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5 text-accent" />
                      {getTitle('saleLikelihood', isClientMode)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Market snapshot as of: {new Date(reportData.snapshotTimestamp).toLocaleString()}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4 likelihood-cards-mobile">
                    {'likelihood30' in reportData && (
                      <>
                        <div className="text-center p-6 rounded-xl border-2 border-border/50">
                          <p className="text-sm text-muted-foreground mb-3">30 Days</p>
                          <LikelihoodBadge band={reportData.likelihood30} />
                          <div className="mt-3 px-1">
                            <LikelihoodBar band={reportData.likelihood30} showLabels={false} />
                          </div>
                        </div>
                        <div className="text-center p-6 rounded-xl border-2 border-border/50">
                          <p className="text-sm text-muted-foreground mb-3">60 Days</p>
                          <LikelihoodBadge band={reportData.likelihood60} />
                          <div className="mt-3 px-1">
                            <LikelihoodBar band={reportData.likelihood60} showLabels={false} />
                          </div>
                        </div>
                        <div className="text-center p-6 rounded-xl border-2 border-border/50">
                          <p className="text-sm text-muted-foreground mb-3">90 Days</p>
                          <LikelihoodBadge band={reportData.likelihood90} />
                          <div className="mt-3 px-1">
                            <LikelihoodBar band={reportData.likelihood90} showLabels={false} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* What This Means - Seller */}
              <Card className="pdf-section pdf-avoid-break">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{getTitle('whatThisMeans', isClientMode)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {sellerWhatThisMeansText}
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    <span className="font-medium not-italic">Tradeoff to consider:</span> {tradeoffDescriptions[mode].sellerPriceVsTime}
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Buyer-specific content */}
          {!isSeller && session.buyer_inputs && (
            <>
              <Card className="pdf-section pdf-avoid-break">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    {getTitle('offerDetails', isClientMode)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 likelihood-cards-mobile">
                    <div className="p-4 rounded-xl bg-secondary/50 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Offer Price</p>
                      <p className="text-lg font-serif font-bold">{formatCurrency(session.buyer_inputs.offer_price)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Financing</p>
                      <p className="text-lg font-serif font-bold">{session.buyer_inputs.financing_type}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Down Payment</p>
                      <p className="text-lg font-serif font-bold">{session.buyer_inputs.down_payment_percent}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Closing</p>
                      <p className="text-lg font-serif font-bold">{session.buyer_inputs.closing_timeline} days</p>
                    </div>
                  </div>
                  {/* Only show client notes - NEVER agent notes */}
                  {(session.buyer_inputs.client_notes || session.buyer_inputs.notes) && (
                    <div className="mt-4 p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{session.buyer_inputs.client_notes || session.buyer_inputs.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="pdf-section pdf-avoid-break overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 section-header-mobile">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5 text-accent" />
                      {getTitle('acceptanceLikelihood', isClientMode)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Market snapshot as of: {new Date(reportData.snapshotTimestamp).toLocaleString()}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {'acceptanceLikelihood' in reportData && (
                    <div className="flex justify-center">
                      <div className="text-center p-8 rounded-xl border-2 border-accent/30 bg-accent/5 min-w-[200px]">
                        <p className="text-sm text-muted-foreground mb-3">Likelihood of Acceptance</p>
                        <LikelihoodBadge band={reportData.acceptanceLikelihood} />
                        <div className="mt-4 px-2">
                          <LikelihoodBar band={reportData.acceptanceLikelihood} />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* What This Means - Buyer */}
              <Card className="pdf-section pdf-avoid-break">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{getTitle('whatThisMeans', isClientMode)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {buyerWhatThisMeansText}
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    <span className="font-medium not-italic">Tradeoff to consider:</span> {tradeoffDescriptions[mode].buyerMain}
                  </p>
                </CardContent>
              </Card>

              {'riskOfLosingHome' in reportData && (
                <Card className="pdf-section pdf-avoid-break">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldAlert className="h-5 w-5 text-accent" />
                      {getTitle('riskTradeoff', isClientMode)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="text-center p-6 rounded-xl border-2 border-border/50">
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                          <AlertTriangle className="h-6 w-6 text-destructive" />
                        </div>
                        <p className="font-medium mb-2">{getTitle('riskOfLosingHome', isClientMode)}</p>
                        <RiskBadge band={reportData.riskOfLosingHome} />
                        <p className="text-xs text-muted-foreground mt-3">
                          {reportData.riskOfLosingHome === 'High' || reportData.riskOfLosingHome === 'Moderate'
                            ? buyerRiskDescriptions[mode].losingHomeHigh
                            : buyerRiskDescriptions[mode].losingHomeLow}
                        </p>
                      </div>
                      <div className="text-center p-6 rounded-xl border-2 border-border/50">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                          <TrendingUp className="h-6 w-6 text-amber-600" />
                        </div>
                        <p className="font-medium mb-2">{getTitle('riskOfOverpaying', isClientMode)}</p>
                        <RiskBadge band={reportData.riskOfOverpaying} />
                        <p className="text-xs text-muted-foreground mt-3">
                          {reportData.riskOfOverpaying === 'High' || reportData.riskOfOverpaying === 'Moderate'
                            ? buyerRiskDescriptions[mode].overpayingHigh
                            : buyerRiskDescriptions[mode].overpayingLow}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Important Notice */}
          <div className="pdf-section flex gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{IMPORTANT_NOTICE}</p>
          </div>

          {/* Methodology Footer */}
          <div className="pdf-section">
            <MethodologyFooter snapshotDate={reportData.snapshotTimestamp} />
          </div>

        </motion.div>
      </div>
    </div>
  );
};

// Wrap with ForceClientMode to ensure client language is always used
const SharedReport = () => (
  <ForceClientMode>
    <SharedReportContent />
  </ForceClientMode>
);

export default SharedReport;
