import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen, Database, Scale, ShieldCheck, AlertCircle } from 'lucide-react';

const Methodology = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold">Data & Methodology</h1>
                <p className="text-sm text-primary-foreground/70">How Market Compass works</p>
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
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-accent" />
                What Market Compass Does
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Market Compass is a <strong>decision-support tool</strong> that helps real estate professionals 
                and their clients understand tradeoffs in buying and selling scenarios.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                It uses <strong>public market trend research</strong> and <strong>transaction structure logic</strong> 
                to provide context for decisions — not predictions or guarantees.
              </p>
            </CardContent>
          </Card>

          {/* What We Use */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-accent" />
                Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-secondary/50">
                  <p className="font-medium mb-1">Market Snapshots</p>
                  <p className="text-sm text-muted-foreground">
                    Town-level market trend data including median days on market, sale-to-list ratios, 
                    and inventory signals. This data is manually curated from public sources and 
                    updated periodically.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/50">
                  <p className="font-medium mb-1">Market Scenarios</p>
                  <p className="text-sm text-muted-foreground">
                    Pre-defined market condition templates (e.g., "Hot Market", "Balanced Market") 
                    that provide baseline assumptions for demand, competition, and leverage.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/50">
                  <p className="font-medium mb-1">Transaction Inputs</p>
                  <p className="text-sm text-muted-foreground">
                    User-provided details about pricing, financing, contingencies, and timeline 
                    that are evaluated against market context.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What We Don't Use */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent" />
                What We Don't Use
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">×</span>
                  <span><strong>MLS Data</strong> — We do not access or use MLS listings or sales data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">×</span>
                  <span><strong>Property Valuations</strong> — We do not provide appraisals, CMAs, or price recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">×</span>
                  <span><strong>Live APIs</strong> — We do not fetch real-time data from external services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold">×</span>
                  <span><strong>Outcome Predictions</strong> — We do not predict whether a sale will happen or at what price</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>How Likelihood Is Calculated</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Likelihood bands (Low, Moderate, High) are derived from a deterministic scoring engine 
                that combines:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li><strong>Market Scenario</strong> baseline assumptions (demand, competition, leverage)</li>
                <li><strong>Session Inputs</strong> such as financing type, contingencies, and timeline</li>
                <li><strong>Market Snapshot</strong> data when available (median DOM, sale-to-list ratio)</li>
                <li><strong>Optional Overrides</strong> that agents can apply for specific situations</li>
              </ol>
              <p className="text-muted-foreground leading-relaxed">
                Strong offers (cash financing, minimal contingencies, competitive timeline) receive 
                higher likelihood scores. The system is designed to be explainable and auditable.
              </p>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="flex gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Important Notice</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Market Compass is an informational decision-support tool. It is not an appraisal, 
                valuation, guarantee, or prediction of outcome. Actual results depend on market 
                conditions, competing properties or offers, and buyer/seller decisions outside 
                the scope of this analysis. Analysis reflects conditions as of the snapshot date 
                and may not reflect subsequent market changes.
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="pt-4">
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Methodology;
