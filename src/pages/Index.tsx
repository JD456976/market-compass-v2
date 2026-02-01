import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass, Users, Building2, FolderOpen } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Compass className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Market Compass</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Agent decision-support tool for Seller and Buyer scenarios. 
            Generate data-driven reports to guide your clients.
          </p>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Seller Report</CardTitle>
              <CardDescription>
                Analyze listing strategy and sale likelihood
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/seller">
                <Button className="w-full" size="lg">
                  Start Seller Analysis
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Buyer Report</CardTitle>
              <CardDescription>
                Evaluate offer competitiveness and risk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/buyer">
                <Button className="w-full" size="lg">
                  Start Buyer Analysis
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/market-profiles">
            <Button variant="outline" size="lg" className="min-w-[200px]">
              <Compass className="mr-2 h-4 w-4" />
              Market Profiles
            </Button>
          </Link>
          <Link to="/saved-sessions">
            <Button variant="outline" size="lg" className="min-w-[200px]">
              <FolderOpen className="mr-2 h-4 w-4" />
              Saved Sessions
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
