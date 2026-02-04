import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Compass, 
  CheckCircle2, 
  RefreshCw,
  FileText,
  BarChart3,
  Layers,
  PenTool,
  Sparkles
} from 'lucide-react';
import { getBetaAccessSession } from '@/lib/betaAccess';
import { PAID_FEATURES, SUBSCRIPTION_PRODUCTS } from '@/lib/featureGating';

const PROFESSIONAL_FEATURES = [
  {
    icon: FileText,
    title: 'Unlimited Reports',
    description: 'Create as many seller and buyer analyses as you need',
  },
  {
    icon: BarChart3,
    title: 'Unlimited Comparisons',
    description: 'Compare multiple scenarios side by side',
  },
  {
    icon: Layers,
    title: 'Advanced Scenario Explorer',
    description: 'Deep-dive into market conditions and pricing strategies',
  },
  {
    icon: Compass,
    title: 'Market Snapshot Selection',
    description: 'Choose from curated market condition presets',
  },
  {
    icon: PenTool,
    title: 'Branded PDF Exports',
    description: 'Professional exports with your branding',
  },
];

export default function Subscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState(false);
  
  const session = getBetaAccessSession();
  const hasBetaAccess = !!session;

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    
    // Simulated restore - no actual IAP during beta
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: 'No purchases found',
      description: 'Subscriptions will be available after the beta period.',
    });
    
    setIsRestoring(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-lg font-serif font-semibold">Subscription</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
        {/* Beta Access Banner */}
        {hasBetaAccess && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-full">
                  <Sparkles className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-emerald-700">Beta Access Active</h3>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 text-xs">
                      Full Access
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have access to all professional features during the beta period.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Professional Features */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Market Compass Professional</CardTitle>
            <CardDescription>
              Everything you need to deliver exceptional real estate analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PROFESSIONAL_FEATURES.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto shrink-0 mt-1" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Subscription Coming Soon */}
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Subscription Options Coming Soon</CardTitle>
            <CardDescription className="text-base">
              Subscription options will be available after the beta period. 
              Beta testers will receive special pricing as a thank you for early feedback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Placeholder pricing - not functional */}
            <div className="grid gap-3">
              <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Monthly</p>
                    <p className="text-xs text-muted-foreground">Billed monthly</p>
                  </div>
                  <p className="text-muted-foreground">Coming soon</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Annual</p>
                    <p className="text-xs text-muted-foreground">Save with yearly billing</p>
                  </div>
                  <p className="text-muted-foreground">Coming soon</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Restore Purchases */}
        <div className="text-center space-y-4">
          <Button 
            variant="outline" 
            onClick={handleRestorePurchases}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Restore Purchases
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            If you've previously subscribed, tap here to restore your purchase. 
            This will check for any existing subscriptions linked to your account.
          </p>
        </div>

        {/* Legal links placeholder */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <button className="hover:underline">Terms of Service</button>
          <span>•</span>
          <button className="hover:underline">Privacy Policy</button>
        </div>
      </main>
    </div>
  );
}
