import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, CheckCircle2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loadAgentProfile, saveAgentProfile, AgentProfile as AgentProfileType } from '@/lib/agentProfile';

const AgentProfile = () => {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<AgentProfileType>({
    agent_name: '',
    brokerage_name: '',
    phone: '',
    email: '',
    website: '',
    license: '',
  });

  useEffect(() => {
    const loaded = loadAgentProfile();
    setProfile(loaded);
  }, []);

  const handleChange = (field: keyof AgentProfileType, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    if (!profile.agent_name.trim() || !profile.brokerage_name.trim() || !profile.phone.trim() || !profile.email.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    saveAgentProfile(profile);
    setSaved(true);
    toast({
      title: "Profile saved",
      description: "Your agent profile has been updated.",
    });
  };

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
                <User className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold">Agent Profile</h1>
                <p className="text-sm text-primary-foreground/70">Configure your contact info for reports</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-xl -mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <CardDescription>This information will appear in the "Prepared by" section of exported PDFs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent_name">Agent Name *</Label>
                <Input
                  id="agent_name"
                  value={profile.agent_name}
                  onChange={(e) => handleChange('agent_name', e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brokerage_name">Brokerage Name *</Label>
                <Input
                  id="brokerage_name"
                  value={profile.brokerage_name}
                  onChange={(e) => handleChange('brokerage_name', e.target.value)}
                  placeholder="Your brokerage"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  value={profile.website || ''}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="yourwebsite.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="license">License # (optional)</Label>
                <Input
                  id="license"
                  value={profile.license || ''}
                  onChange={(e) => handleChange('license', e.target.value)}
                  placeholder="License number"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Link to="/">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </Link>
                <Button onClick={handleSave} variant={saved ? "secondary" : "accent"}>
                  {saved ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AgentProfile;
