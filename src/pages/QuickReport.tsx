/**
 * Quick Report — minimal-input flow for instant 1-page analysis.
 * Address + Price + Type (Buyer/Seller) → instant Quick Snapshot report.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Users, Building2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Session } from '@/types';
import { generateId } from '@/lib/storage';
import { formatPriceDisplay, parsePriceValue, stripCurrencyChars } from '@/lib/currencyFormat';
import { cn } from '@/lib/utils';

type ReportType = 'buyer' | 'seller';

const QuickReport = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<ReportType>('buyer');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [generating, setGenerating] = useState(false);

  const priceValue = parsePriceValue(price);
  const isValid = location.trim() && priceValue > 0;

  const handleGenerate = () => {
    if (!isValid) return;
    setGenerating(true);

    const session: Session = {
      id: generateId(),
      session_type: reportType === 'buyer' ? 'Buyer' : 'Seller',
      client_name: 'Quick Report',
      location,
      property_type: 'SFH',
      condition: 'Maintained',
      client_privacy: true,
      ...(reportType === 'buyer'
        ? {
            buyer_inputs: {
              offer_price: priceValue,
              reference_price: priceValue,
              market_conditions: 'Balanced' as const,
              financing_type: 'Conventional' as const,
              down_payment_percent: '20+' as const,
              contingencies: ['Inspection', 'Financing'] as ('Inspection' | 'Financing')[],
              closing_timeline: '21-30' as const,
              buyer_preference: 'Balanced' as const,
            },
          }
        : {
            seller_inputs: {
              seller_selected_list_price: priceValue,
              desired_timeframe: '60' as const,
              strategy_preference: 'Balanced' as const,
            },
          }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    sessionStorage.removeItem('report_entry_context');
    sessionStorage.setItem('current_session', JSON.stringify(session));
    navigate(reportType === 'buyer' ? '/buyer/report' : '/seller/report');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                Quick Report
              </h1>
              <p className="text-sm text-muted-foreground">Instant analysis in under 30 seconds</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generate a Report</CardTitle>
              <CardDescription>Just a location and a price — we'll handle the rest with smart defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Type Toggle */}
              <div className="space-y-2">
                <Label>Report Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([['buyer', Users, 'Buyer'], ['seller', Building2, 'Seller']] as const).map(([type, Icon, label]) => (
                    <button
                      key={type}
                      onClick={() => setReportType(type as ReportType)}
                      className={cn(
                        'flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors min-h-[44px]',
                        reportType === type
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary/50 text-foreground border-border hover:bg-secondary'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>City / Town</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Boston, MA"
                />
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label>{reportType === 'buyer' ? 'Offer Price' : 'List Price'}</Label>
                <Input
                  value={price ? formatPriceDisplay(price) : ''}
                  onChange={(e) => setPrice(stripCurrencyChars(e.target.value))}
                  placeholder="$450,000"
                  inputMode="numeric"
                />
              </div>

              {/* Smart Defaults Info */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Smart defaults applied:</span>{' '}
                  {reportType === 'buyer'
                    ? 'Conventional financing, 20%+ down, standard contingencies, balanced strategy.'
                    : 'Balanced strategy, 60-day timeframe.'}
                  {' '}You can refine these in the full report.
                </p>
              </div>

              <Button onClick={handleGenerate} disabled={!isValid || generating} className="w-full" size="lg">
                <Zap className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Generate Quick Report'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default QuickReport;
