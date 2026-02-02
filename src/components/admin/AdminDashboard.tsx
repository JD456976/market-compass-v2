import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  LogOut, 
  KeyRound, 
  Smartphone, 
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Ban
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { IssueCodePanel } from './IssueCodePanel';
import { BetaCodesTable, BetaCode } from './BetaCodesTable';
import { ActivationsTable, BetaActivation } from './ActivationsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminDashboardProps {
  userEmail: string | null;
  onSignOut: () => void;
}

export function AdminDashboard({ userEmail, onSignOut }: AdminDashboardProps) {
  const [codes, setCodes] = useState<BetaCode[]>([]);
  const [activations, setActivations] = useState<BetaActivation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch codes from new table
      const { data: codesData, error: codesError } = await supabase
        .from('beta_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      setCodes(codesData || []);

      // Fetch activations
      const { data: activationsData, error: activationsError } = await supabase
        .from('beta_activations')
        .select('*')
        .order('activated_at', { ascending: false });

      if (activationsError) throw activationsError;
      setActivations(activationsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to load admin data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate stats from new data model
  const getCodeStatus = (code: BetaCode): string => {
    if (code.revoked_at) return 'revoked';
    if (code.used_at) return 'used';
    if (code.expires_at && new Date(code.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  const stats = {
    active: codes.filter(c => getCodeStatus(c) === 'active').length,
    used: codes.filter(c => getCodeStatus(c) === 'used').length,
    revoked: codes.filter(c => getCodeStatus(c) === 'revoked').length,
    expired: codes.filter(c => getCodeStatus(c) === 'expired').length,
    activations: activations.length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to App
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-serif font-semibold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={onSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Active Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <KeyRound className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.used}</p>
                  <p className="text-xs text-muted-foreground">Used Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Ban className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.revoked}</p>
                  <p className="text-xs text-muted-foreground">Revoked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.expired}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.activations}</p>
                  <p className="text-xs text-muted-foreground">Activations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issue Code Panel */}
        {showIssuePanel ? (
          <IssueCodePanel 
            adminEmail={userEmail || ''} 
            onClose={() => setShowIssuePanel(false)}
            onCreated={fetchData}
          />
        ) : (
          <Button onClick={() => setShowIssuePanel(true)} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Issue Access Code
          </Button>
        )}

        {/* Tables */}
        <Tabs defaultValue="codes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="codes">
              <KeyRound className="h-4 w-4 mr-2" />
              Access Codes ({codes.length})
            </TabsTrigger>
            <TabsTrigger value="activations">
              <Smartphone className="h-4 w-4 mr-2" />
              Activations ({activations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="codes">
            <BetaCodesTable codes={codes} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="activations">
            <ActivationsTable activations={activations} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
