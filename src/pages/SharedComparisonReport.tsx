import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Shield, Scale, Target, TrendingUp, Info, Users, Eye, AlertCircle } from 'lucide-react';
import { Session, SellerReportData, BuyerReportData } from '@/types';
import { getSessionById, getMarketProfileById } from '@/lib/storage';
import { calculateSellerReport, calculateBuyerReport } from '@/lib/scoring';
import { formatLocation } from '@/lib/utils';
import { 
  buildComparisonOptions, 
  buildComparisonTable, 
  generateTradeoffNarrative,
  generateFitGuidance,
  getClientNotes,
  ComparisonOption,
  ComparisonTableRow 
} from '@/lib/comparisonHelpers';
import { ReportHeader } from '@/components/ReportHeader';
import { MethodologyFooter } from '@/components/MethodologyFooter';
import { AnalysisMethodology } from '@/components/AnalysisMethodology';

const COMPARISON_FRAMING = `This report compares how different strategies change tradeoffs. It does not recommend one option over another or predict outcomes.`;

const iconMap = {
  clock: Clock,
  shield: Shield,
  scale: Scale,
  target: Target,
  trending: TrendingUp,
};

// Display "Not specified" for missing values
function displayValue(value: string | undefined | null): string {
  if (!value || value.trim() === '') return 'Not specified';
  return value;
}

function ComparisonTableRowComponent({ row }: { row: ComparisonTableRow }) {
  const Icon = iconMap[row.icon];
  const optionADisplay = displayValue(row.optionA);
  const optionBDisplay = displayValue(row.optionB);
  const isAMissing = optionADisplay === 'Not specified';
  const isBMissing = optionBDisplay === 'Not specified';
  
  return (
    <div className={`grid grid-cols-3 gap-4 py-4 border-b border-border/30 last:border-0 ${row.isDifferent ? 'bg-accent/5' : ''}`}>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-accent shrink-0" />
        <span>{row.category}</span>
      </div>
      <div className={`text-sm font-medium text-center ${isAMissing ? 'text-muted-foreground italic' : ''}`}>
        {optionADisplay}
      </div>
      <div className={`text-sm font-medium text-center ${isBMissing ? 'text-muted-foreground italic' : ''}`}>
        {optionBDisplay}
      </div>
    </div>
  );
}

function OptionFitCard({ option }: { option: ComparisonOption }) {
  const fits = generateFitGuidance(option);
  
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{option.label}</CardTitle>
        {option.labelDescription && (
          <p className="text-xs text-muted-foreground mt-1">{option.labelDescription}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">Tends to fit clients who:</p>
      </CardHeader>
      <CardContent>
        {fits.length > 0 ? (
          <ul className="space-y-2">
            {fits.map((fit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Users className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <span>{fit}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">Have discussed priorities with their agent</p>
        )}
      </CardContent>
    </Card>
  );
}

const SharedComparisonReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [sessionA, setSessionA] = useState<Session | null>(null);
  const [sessionB, setSessionB] = useState<Session | null>(null);
  const [reportA, setReportA] = useState<SellerReportData | BuyerReportData | null>(null);
  const [reportB, setReportB] = useState<SellerReportData | BuyerReportData | null>(null);
  const [optionA, setOptionA] = useState<ComparisonOption | null>(null);
  const [optionB, setOptionB] = useState<ComparisonOption | null>(null);
  const [tableRows, setTableRows] = useState<ComparisonTableRow[]>([]);
  const [narrative, setNarrative] = useState('');

  const sessionIdA = searchParams.get('a');
  const sessionIdB = searchParams.get('b');

  useEffect(() => {
    if (!sessionIdA || !sessionIdB) {
      navigate('/');
      return;
    }

    const loadedA = getSessionById(sessionIdA);
    const loadedB = getSessionById(sessionIdB);

    if (!loadedA || !loadedB) {
      // Sessions not found - show error state
      return;
    }

    setSessionA(loadedA);
    setSessionB(loadedB);

    // Calculate reports
    const marketProfileA = loadedA.selected_market_profile_id 
      ? getMarketProfileById(loadedA.selected_market_profile_id) 
      : undefined;
    const marketProfileB = loadedB.selected_market_profile_id 
      ? getMarketProfileById(loadedB.selected_market_profile_id) 
      : undefined;

    let calculatedReportA: SellerReportData | BuyerReportData;
    let calculatedReportB: SellerReportData | BuyerReportData;

    if (loadedA.session_type === 'Seller') {
      calculatedReportA = calculateSellerReport(loadedA, marketProfileA);
    } else {
      calculatedReportA = calculateBuyerReport(loadedA, marketProfileA);
    }

    if (loadedB.session_type === 'Seller') {
      calculatedReportB = calculateSellerReport(loadedB, marketProfileB);
    } else {
      calculatedReportB = calculateBuyerReport(loadedB, marketProfileB);
    }

    setReportA(calculatedReportA);
    setReportB(calculatedReportB);

    // Build comparison data
    const { optionA: builtA, optionB: builtB } = buildComparisonOptions(
      loadedA, loadedB, calculatedReportA, calculatedReportB
    );
    
    setOptionA(builtA);
    setOptionB(builtB);
    setTableRows(buildComparisonTable(builtA, builtB));
    setNarrative(generateTradeoffNarrative(builtA, builtB));
  }, [sessionIdA, sessionIdB, navigate]);

  if (!sessionA || !sessionB) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-sans font-bold mb-2">Report Not Available</h2>
            <p className="text-muted-foreground">
              This comparison report could not be loaded. The sessions may no longer exist or the link may be invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reportA || !reportB || !optionA || !optionB) {
    return null;
  }

  const clientNotesA = getClientNotes(sessionA);
  const clientNotesB = getClientNotes(sessionB);
  const snapshotTimestamp = new Date().toLocaleString();
  
  // For client-facing "Prepared for" header, use first non-empty client name
  const preparedForName = sessionA.client_name?.trim() || sessionB.client_name?.trim() || 'Client';

  return (
    <div className="min-h-screen bg-background">
      {/* Header - No navigation, no toggle */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-sans font-bold">Comparison Report</h1>
              <p className="text-sm text-muted-foreground">
                {formatLocation(sessionA.location)}
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Shared Report (Read-only)
            </Badge>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Header */}
          <ReportHeader
            clientName={preparedForName}
            snapshotTimestamp={snapshotTimestamp}
            reportType="Comparison"
          />

          {/* Framing Block */}
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Purpose of this comparison</h3>
                  <p className="text-sm text-muted-foreground">{COMPARISON_FRAMING}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Option Labels - No client names inside cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-primary/20">
              <CardContent className="p-4 text-center">
                <Scale className="h-6 w-6 mx-auto mb-2 text-primary" />
                <h3 className="font-sans font-semibold">{optionA.label}</h3>
                {optionA.labelDescription && (
                  <p className="text-xs text-muted-foreground mt-2">{optionA.labelDescription}</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="p-4 text-center">
                <Scale className="h-6 w-6 mx-auto mb-2 text-primary" />
                <h3 className="font-sans font-semibold">{optionB.label}</h3>
                {optionB.labelDescription && (
                  <p className="text-xs text-muted-foreground mt-2">{optionB.labelDescription}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comparison Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">How These Options Compare</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Table Header */}
              <div className="grid grid-cols-3 gap-4 py-2 border-b-2 border-border">
                <div className="text-sm font-medium text-muted-foreground">Category</div>
                <div className="text-sm font-medium text-center">{optionA.label.split(':')[0]}</div>
                <div className="text-sm font-medium text-center">{optionB.label.split(':')[0]}</div>
              </div>
              {/* Table Rows */}
              {tableRows.map((row, index) => (
                <ComparisonTableRowComponent key={index} row={row} />
              ))}
            </CardContent>
          </Card>

          {/* Tradeoff Narrative */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">How These Options Differ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {narrative}
              </p>
            </CardContent>
          </Card>

          {/* Who Each Option Fits */}
          <div>
            <h2 className="text-lg font-sans font-semibold mb-4">Who Each Option Tends to Fit</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OptionFitCard option={optionA} />
              <OptionFitCard option={optionB} />
            </div>
          </div>

          {/* Notes - Always show with placeholder if empty */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Notes discussed with your agent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{optionA.label}</p>
                  {clientNotesA ? (
                    <p className="text-sm">{clientNotesA}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No notes were added for this option.</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{optionB.label}</p>
                  {clientNotesB ? (
                    <p className="text-sm">{clientNotesB}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No notes were added for this option.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Likelihood Explainer */}
          <p className="text-xs text-muted-foreground text-center">
            Likelihood reflects price, financing strength, contingencies, and market conditions.
          </p>

          {/* Difference Legend */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-4 h-4 bg-accent/5 border border-accent/20 rounded"></div>
            <span>Highlighted rows indicate differences between options</span>
          </div>

          {/* How This Analysis Is Formed - Collapsible */}
          <AnalysisMethodology />

          {/* Important Notice */}
          <div className="flex gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              This report is prepared by your agent as a decision-support tool. Market data reflects current conditions and patterns. For binding valuations or legal advice, consult a licensed appraiser or attorney.
            </p>
          </div>

          {/* Methodology Footer */}
          <MethodologyFooter snapshotDate={snapshotTimestamp} />
        </motion.div>
      </div>
    </div>
  );
};

export default SharedComparisonReport;
