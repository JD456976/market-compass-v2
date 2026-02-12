import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  CheckCircle2, 
  RefreshCw,
  FileText,
  BarChart3,
  Layers,
  PenTool,
  Sparkles,
  Users,
  Zap,
  Crown,
  Building2
} from 'lucide-react';
import { getBetaAccessSession } from '@/lib/betaAccess';

const TIERS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'For agents getting started with market analysis',
    icon: Zap,
    highlight: false,
    features: [
      '3 reports per month',
      '1 comparison per month',
      'Basic Scenario Explorer',
      'Standard PDF exports',
      'Email support',
    ],
    limits: { reports: 3, comparisons: 1 },
  },
  {
    name: 'Professional',
    price: '$29',
    period: '/month',
    description: 'For active agents who need unlimited analysis',
    icon: Crown,
    highlight: true,
    features: [
      'Unlimited reports',
      'Unlimited comparisons',
      'Advanced Scenario Explorer',
      'Branded PDF exports',
      'AI-powered insights',
      'Client Communication Hub',
      'Shareable social insights',
      'Priority support',
    ],
    limits: { reports: -1, comparisons: -1 },
  },
  {
    name: 'Enterprise',
    price: '$79',
    period: '/month',
    description: 'For teams and brokerages',
    icon: Building2,
    highlight: false,
    features: [
      'Everything in Professional',
      'Team management (up to 10)',
      'Custom branding per agent',
      'Analytics dashboard',
      'White-label reports',
      'API access',
      'Dedicated support',
    ],
    limits: { reports: -1, comparisons: -1 },
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
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast({
      title: 'No purchases found',
      description: 'Subscriptions will be available after the beta period.',
    });
    setIsRestoring(false);
  };

  const handleSelectTier = (tierName: string) => {
    toast({
      title: `${tierName} plan selected`,
      description: 'Subscriptions will be available after the beta period. Beta users will receive special pricing.',
    });
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

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
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
                    You have access to all Professional features during the beta period. 
                    Beta testers will receive special pricing at launch.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Tiers */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-serif font-bold mb-2">Choose Your Plan</h2>
          <p className="text-muted-foreground">Scale your real estate analysis with the right tier</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <Card 
              key={tier.name}
              className={`relative ${tier.highlight ? 'border-accent shadow-lg ring-1 ring-accent/20' : 'border-border'}`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground shadow-sm">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <div className={`p-3 rounded-full mx-auto mb-2 ${tier.highlight ? 'bg-accent/10' : 'bg-secondary'}`}>
                  <tier.icon className={`h-6 w-6 ${tier.highlight ? 'text-accent' : 'text-muted-foreground'}`} />
                </div>
                <CardTitle className="font-serif text-xl">{tier.name}</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-serif font-bold">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground text-sm">{tier.period}</span>}
                </div>
                <CardDescription className="text-xs">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2.5">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button 
                  className="w-full mt-4"
                  variant={tier.highlight ? 'accent' : 'outline'}
                  onClick={() => handleSelectTier(tier.name)}
                >
                  {hasBetaAccess ? 'Current Plan (Beta)' : `Choose ${tier.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

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
          </p>
        </div>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <button className="hover:underline" onClick={() => navigate('/terms')}>Terms of Service</button>
          <span>•</span>
          <button className="hover:underline" onClick={() => navigate('/privacy')}>Privacy Policy</button>
        </div>
      </main>
    </div>
  );
}
