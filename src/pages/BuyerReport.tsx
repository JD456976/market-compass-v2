import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Clock, Users, Target, TrendingUp, AlertCircle, CheckCircle2, AlertTriangle, ShieldAlert, FileDown, Share2, FileText, Pencil } from 'lucide-react';
import { Session, BuyerReportData, LikelihoodBand } from '@/types';
import { upsertSession, getMarketProfileById } from '@/lib/storage';
import { calculateBuyerReport } from '@/lib/scoring';
import { useToast } from '@/hooks/use-toast';
import { exportReportToPdf } from '@/lib/pdfExport';
import { ReportHeader } from '@/components/ReportHeader';
import { formatLocation } from '@/lib/utils';
import { ModeSwitcher } from '@/components/ModeSwitcher';
import { useClientMode } from '@/contexts/ClientModeContext';
import { createTemplateFromSession, saveTemplate } from '@/lib/templates';
import { AgentTakeaways } from '@/components/AgentTakeaways';
import { 
  ConfidenceRange, 
  WhyThisResult, 
  WhatWouldChange,
  getAcceptanceFactors,
  getImprovementSuggestions 
} from '@/components/AgentExplanations';
import { 
  getTitle, 
  buyerWhatThisMeans, 
  buyerRiskDescriptions, 
  tradeoffDescriptions,
  buyerSuggestions 
} from '@/lib/clientLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DraftEditorSheet } from '@/components/DraftEditorSheet';
import { LikelihoodBar, TradeoffMatrix, getBuyerTradeoffPosition, MetricIcon } from '@/components/ClientVisuals';
import { AgentLab, AgentLabTrigger } from '@/components/AgentLab';
import { getMarketSnapshotOrBaseline, MarketSnapshot, parseCityFromLocation, getMarketContext, GENERIC_BASELINE } from '@/lib/marketSnapshots';
import { 
  MarketGrounding, 
  RealityAnchorNotes, 
  ConsistencyWarning, 
  PrimaryLimitingFactor,
  getConsistencyIssues,
  getPrimaryLimitingFactor
} from '@/components/RealityAnchors';
import { RotateCcw } from 'lucide-react';

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
  const { isClientMode } = useClientMode();
  const [reportData, setReportData] = useState<BuyerReportData | null>(null);
  const [saved, setSaved] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [marketSnapshot, setMarketSnapshot] = useState<{ snapshot: MarketSnapshot; isGenericBaseline: boolean } | null>(null);

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
      
      // Get market snapshot based on location
      const snapshotData = getMarketSnapshotOrBaseline(session.location);
      setMarketSnapshot(snapshotData);
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

  const handleSaveAsTemplate = () => {
    if (!reportData || !templateName.trim()) return;
    
    try {
      const template = createTemplateFromSession(reportData.session, templateName.trim());
      saveTemplate(template);
      setTemplateDialogOpen(false);
      setTemplateName('');
      toast({
        title: "Template saved",
        description: `Template "${templateName}" has been created.`,
      });
    } catch {
      toast({
        title: "Could not save template",
        description: "Please try again.",
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
        isClientMode,
      });
      // Mark as exported and save
      const updatedSession = { ...reportData.session, pdf_exported: true };
      upsertSession(updatedSession);
      setReportData({ ...reportData, session: updatedSession });
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
      // Mark as shared and save
      const updatedSession = { ...reportData.session, share_link_created: true };
      upsertSession(updatedSession);
      setReportData({ ...reportData, session: updatedSession });
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

  // Get mode-appropriate text
  const mode = isClientMode ? 'client' : 'agent';
  const whatThisMeansText = acceptanceLikelihood === 'High' 
    ? buyerWhatThisMeans[mode].high
    : acceptanceLikelihood === 'Moderate'
    ? buyerWhatThisMeans[mode].moderate
    : buyerWhatThisMeans[mode].low;

  const losingHomeDesc = riskOfLosingHome === 'High' || riskOfLosingHome === 'Moderate'
    ? buyerRiskDescriptions[mode].losingHomeHigh
    : buyerRiskDescriptions[mode].losingHomeLow;

  const overpayingDesc = riskOfOverpaying === 'High' || riskOfOverpaying === 'Moderate'
    ? buyerRiskDescriptions[mode].overpayingHigh
    : buyerRiskDescriptions[mode].overpayingLow;

  // Get tradeoff position for client visual
  const tradeoffPosition = getBuyerTradeoffPosition(
    inputs.buyer_preference,
    inputs.contingencies.length,
    inputs.financing_type,
    inputs.closing_timeline
  );

  // Agent-only: consistency checks and limiting factor
  const consistencyIssues = getConsistencyIssues(session);
  const limitingFactor = marketSnapshot 
    ? getPrimaryLimitingFactor(session, marketSnapshot.snapshot, acceptanceLikelihood)
    : null;

  // Client-mode market reference
  const cityName = parseCityFromLocation(session.location) || formatLocation(session.location);

  const handleDraftUpdate = (updatedSession: Session) => {
    const updatedData = calculateBuyerReport(updatedSession, marketProfile);
    setReportData(updatedData);
    sessionStorage.setItem('current_session', JSON.stringify(updatedSession));
    
    // Update market snapshot if location changed
    const newSnapshot = getMarketSnapshotOrBaseline(updatedSession.location);
    setMarketSnapshot(newSnapshot);
    
    setSaved(false);
    toast({
      title: "Draft updated",
      description: "Your changes have been applied.",
    });
  };

  // Reset to market baseline defaults (Agent-only)
  const handleResetToBaseline = () => {
    if (!marketSnapshot) return;
    
    const snapshot = marketSnapshot.snapshot;
    const context = getMarketContext(snapshot);
    
    // Derive defaults from market context - properly typed
    const baselineContingencies: ('Inspection' | 'Financing' | 'Appraisal' | 'Home sale' | 'None')[] = 
      context.competitionContext === 'high' 
        ? ['Inspection'] 
        : ['Inspection', 'Financing'];
    
    const baselineTimeline: '<21' | '21-30' | '31-45' | '45+' = context.speedContext === 'faster' 
      ? '21-30' 
      : context.speedContext === 'slower' 
      ? '45+' 
      : '31-45';
    
    const baselinePreference: 'Must win' | 'Balanced' | 'Price-protective' = 
      context.competitionContext === 'high'
        ? 'Must win'
        : 'Balanced';

    const updatedInputs = {
      ...inputs,
      contingencies: baselineContingencies,
      closing_timeline: baselineTimeline,
      buyer_preference: baselinePreference,
    };

    const updatedSession: Session = {
      ...session,
      buyer_inputs: updatedInputs,
      updated_at: new Date().toISOString(),
    };

    handleDraftUpdate(updatedSession);
    toast({
      title: "Reset to baseline",
      description: "Strategy defaults derived from market conditions.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-6 report-header-mobile">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                  <p className="text-sm text-primary-foreground/70">{session.client_name} • {formatLocation(session.location)}</p>
                </div>
              </div>
            </div>
            <ModeSwitcher className="bg-primary-foreground/10 rounded-lg px-3 py-2 self-end sm:self-auto" />
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
          <div id="report-export" className={`space-y-6 ${isClientMode ? 'client-mode' : 'agent-mode'}`}>
            {/* Prepared For/By Header Block */}
            <div className="pdf-section pdf-header-section">
              <ReportHeader
                reportType="Buyer"
                clientName={session.client_name}
                snapshotTimestamp={snapshotTimestamp}
                showTimestamp={false}
              />
            </div>

            {/* Offer Overview */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-accent" />
                  {getTitle('offerOverview', isClientMode)}
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

            {/* Offer Details */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  {getTitle('offerDetails', isClientMode)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${inputs.financing_type === 'Cash' ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'} gap-4 mb-4 likelihood-cards-mobile`}>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-1">Offer Price</p>
                    <p className="text-lg font-serif font-bold">{formatCurrency(inputs.offer_price)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-1">Financing</p>
                    <p className="text-lg font-serif font-bold">{inputs.financing_type}</p>
                  </div>
                  {/* Hide Down Payment for Cash offers */}
                  {inputs.financing_type !== 'Cash' && (
                    <div className="p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                      <p className="text-sm text-muted-foreground mb-1">Down Payment</p>
                      <p className="text-lg font-serif font-bold">{inputs.down_payment_percent}</p>
                    </div>
                  )}
                  <div className="p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
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
                {/* Client Notes - visible in PDF/Share */}
                {(inputs.client_notes || inputs.notes) && (
                  <div className="mt-4 p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{inputs.client_notes || inputs.notes}</p>
                  </div>
                )}
                {/* Agent Notes - hidden from PDF/Share and client mode */}
                {inputs.agent_notes && !isClientMode && (
                  <div className="mt-4 p-4 rounded-xl bg-secondary/30 border border-border/50 pdf-hide-agent-notes">
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      Agent Notes <span className="text-xs">(Private)</span>
                    </p>
                    <p className="text-sm">{inputs.agent_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agent-only: Market Grounding & Reality Anchors */}
            {!isClientMode && marketSnapshot && (
              <div className="space-y-3 pdf-hide-agent-notes">
                <MarketGrounding 
                  session={session}
                  snapshot={marketSnapshot.snapshot}
                  isGenericBaseline={marketSnapshot.isGenericBaseline}
                />
                <RealityAnchorNotes session={session} snapshot={marketSnapshot.snapshot} />
                {consistencyIssues.length > 0 && (
                  <ConsistencyWarning issues={consistencyIssues} />
                )}
                {limitingFactor && (
                  <PrimaryLimitingFactor factor={limitingFactor.factor} lever={limitingFactor.lever} />
                )}
              </div>
            )}

            {/* Client-mode: Market context reference */}
            {isClientMode && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Analysis reflects current market conditions in the {cityName} area.
              </p>
            )}

            {/* Acceptance Likelihood */}
            <Card className="pdf-section pdf-avoid-break overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 section-header-mobile">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-accent" />
                    {getTitle('acceptanceLikelihood', isClientMode)}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Market snapshot as of: {new Date(snapshotTimestamp).toLocaleString()}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex justify-center">
                  <div className="text-center p-8 rounded-xl border-2 border-accent/30 bg-accent/5 min-w-[200px] pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
                      <MetricIcon type="certainty" className="h-3.5 w-3.5" />
                      Likelihood of Acceptance
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      <LikelihoodBadge band={acceptanceLikelihood} />
                      {!isClientMode && <ConfidenceRange band={acceptanceLikelihood} />}
                    </div>
                    {/* Client-mode visual: Likelihood Bar */}
                    {isClientMode && (
                      <div className="mt-4 px-2">
                        <LikelihoodBar band={acceptanceLikelihood} />
                      </div>
                    )}
                    {/* Agent-only explanations */}
                    {!isClientMode && (
                      <div className="mt-4 text-left pdf-hide-agent-notes">
                        <WhyThisResult 
                          band={acceptanceLikelihood} 
                          factors={getAcceptanceFactors(session, acceptanceLikelihood)} 
                        />
                        <WhatWouldChange suggestions={getImprovementSuggestions(session, acceptanceLikelihood)} />
                      </div>
                    )}
                  </div>
                </div>
                {/* Likelihood explainer footer */}
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Likelihood reflects price, financing strength, contingencies, and market conditions.
                </p>
              </CardContent>
            </Card>

            {/* What This Means */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{getTitle('whatThisMeans', isClientMode)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {whatThisMeansText}
                </p>
                <div>
                  <p className="font-medium text-sm mb-2">If your goal is to increase certainty:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    {inputs.contingencies.length > 0 && inputs.contingencies[0] !== 'None' && (
                      <li>{buyerSuggestions[mode].contingencies}</li>
                    )}
                    {(inputs.closing_timeline === '31-45' || inputs.closing_timeline === '45+') && (
                      <li>{buyerSuggestions[mode].timeline}</li>
                    )}
                    {inputs.financing_type !== 'Cash' && (
                      <li>{buyerSuggestions[mode].financing}</li>
                    )}
                    {inputs.buyer_preference !== 'Must win' && (
                      <li>{buyerSuggestions[mode].price}</li>
                    )}
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  <span className="font-medium not-italic">Tradeoff to consider:</span> {tradeoffDescriptions[mode].buyerMain}
                </p>
              </CardContent>
            </Card>

            {/* Agent Takeaways - Agent Mode Only */}
            {!isClientMode && (
              <AgentTakeaways
                type="buyer"
                session={session}
                acceptanceLikelihood={acceptanceLikelihood}
                riskOfLosingHome={riskOfLosingHome}
                riskOfOverpaying={riskOfOverpaying}
              />
            )}

            {/* Risk Tradeoff */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldAlert className="h-5 w-5 text-accent" />
                  {getTitle('riskTradeoff', isClientMode)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="text-center p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <p className="font-medium mb-2">{getTitle('riskOfLosingHome', isClientMode)}</p>
                    <RiskBadge band={riskOfLosingHome} />
                    <p className="text-xs text-muted-foreground mt-3">
                      {losingHomeDesc}
                    </p>
                  </div>
                  <div className="text-center p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-6 w-6 text-amber-600" />
                    </div>
                    <p className="font-medium mb-2">{getTitle('riskOfOverpaying', isClientMode)}</p>
                    <RiskBadge band={riskOfOverpaying} />
                    <p className="text-xs text-muted-foreground mt-3">
                      {overpayingDesc}
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
          <div className="flex flex-wrap gap-3 pt-4 report-actions">
            <Link to="/buyer">
              <Button variant="outline" size="lg" className="min-h-[44px]">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saved} size="lg" variant={saved ? "secondary" : "accent"} className="min-h-[44px]">
              {saved ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>
            <Button onClick={() => setTemplateDialogOpen(true)} size="lg" variant="outline" className="min-h-[44px]">
              <FileText className="mr-2 h-4 w-4" />
              Template
            </Button>
            {/* Agent-only: Edit Draft, Lab, and Reset */}
            {!isClientMode && (
              <>
                <Button onClick={() => setEditSheetOpen(true)} size="lg" variant="outline" className="min-h-[44px]">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Draft
                </Button>
                <Button onClick={handleResetToBaseline} size="lg" variant="ghost" className="min-h-[44px] text-muted-foreground">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <AgentLabTrigger onClick={() => setLabOpen(true)} />
              </>
            )}
            {/* Share/Export only visible in Client mode */}
            {isClientMode && (
              <>
                <Button onClick={handleExportPdf} size="lg" variant="outline" className="min-h-[44px]">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button onClick={handleShareLink} size="lg" variant="accent" className="min-h-[44px]">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </>
            )}
          </div>

          {/* Client mode: Tradeoff Matrix */}
          {isClientMode && (
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <MetricIcon type="tradeoff" />
                  Position Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <TradeoffMatrix 
                  positions={[{ position: tradeoffPosition }]}
                  xAxis={{ left: 'Speed', right: 'Price' }}
                  yAxis={{ top: 'Certainty', bottom: 'Flexibility' }}
                />
                <p className="text-[10px] text-center text-muted-foreground mt-3">
                  Current offer positioning based on strategy and terms
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Save as Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Create a reusable template from this session's settings. Client name and location will not be saved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., First-Time Buyer, Cash Offer..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAsTemplate} disabled={!templateName.trim()}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft Editor Sheet - Agent Mode Only */}
      <DraftEditorSheet
        session={session}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        onSave={handleDraftUpdate}
      />

      {/* Agent Lab - Agent Mode Only */}
      <AgentLab
        session={session}
        currentLikelihood={acceptanceLikelihood}
        open={labOpen}
        onOpenChange={setLabOpen}
        onApply={handleDraftUpdate}
      />
    </div>
  );
};

export default BuyerReport;
