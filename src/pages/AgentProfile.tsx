import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, CheckCircle2, User, Upload, Palette, Image, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loadAgentProfile, saveAgentProfile, AgentProfile as AgentProfileType } from '@/lib/agentProfile';
import { useAuth } from '@/contexts/AuthContext';
import { loadAgentBranding, saveAgentBranding, uploadAgentAsset, AgentBranding } from '@/lib/agentBranding';
import { ReportTemplateSelector, ReportTemplate } from '@/components/report/ReportTemplateSelector';
import { getBetaAccessSession, getDeviceId } from '@/lib/betaAccess';

const AgentProfile = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const betaSession = getBetaAccessSession();
  // Use Supabase auth user ID, or fall back to beta device ID
  const effectiveUserId = user?.id || (betaSession ? getDeviceId() : null);
  const isAuthenticated = !!effectiveUserId;
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<AgentProfileType>({
    agent_name: '',
    brokerage_name: '',
    phone: '',
    email: '',
    website: '',
    license: '',
  });
  const [branding, setBranding] = useState<AgentBranding | null>(null);
  const [uploading, setUploading] = useState<'logo' | 'headshot' | null>(null);

  useEffect(() => {
    const loaded = loadAgentProfile();
    setProfile(loaded);

    if (effectiveUserId) {
      loadAgentBranding(effectiveUserId).then(setBranding);
    }
  }, [effectiveUserId]);

  const handleChange = (field: keyof AgentProfileType, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleBrandingChange = (field: keyof AgentBranding, value: any) => {
    if (!branding) return;
    setBranding(prev => prev ? { ...prev, [field]: value } : prev);
    setSaved(false);
  };

  const handleFileUpload = async (type: 'logo' | 'headshot', e: React.ChangeEvent<HTMLInputElement>) => {
    if (!effectiveUserId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 2MB allowed.', variant: 'destructive' });
      return;
    }
    setUploading(type);
    try {
      const url = await uploadAgentAsset(effectiveUserId, file, type);
      handleBrandingChange(type === 'logo' ? 'logo_url' : 'headshot_url', url);
      toast({ title: `${type === 'logo' ? 'Logo' : 'Headshot'} uploaded` });
    } catch {
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!profile.agent_name.trim() || !profile.brokerage_name.trim() || !profile.phone.trim() || !profile.email.trim()) {
      toast({ title: 'Missing required fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    saveAgentProfile(profile);

    // Sync license + CTA to the profiles table so playbook auto-fill picks them up
    if (user) {
      await supabase
        .from('profiles')
        .update({
          license: profile.license || null,
          custom_cta: profile.custom_cta || null,
        } as any)
        .eq('user_id', user.id);
    }

    if (effectiveUserId && branding) {
      try {
        await saveAgentBranding(branding);
      } catch {
        toast({ title: 'Branding save failed', description: 'Profile saved but branding update failed.', variant: 'destructive' });
        return;
      }
    }

    setSaved(true);
    toast({ title: 'Profile saved', description: 'Your agent profile and branding have been updated.' });
  };

  return (
    <div className="min-h-screen bg-background">
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
                <h1 className="text-2xl font-sans font-bold">Agent Profile & Branding</h1>
                <p className="text-sm text-primary-foreground/70">Configure your contact info and report branding</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-xl -mt-4 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <CardDescription>This appears in the "Prepared by" section of reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Agent Photo */}
              <div className="space-y-2">
                <Label>Your Photo</Label>
                <div className="flex items-center gap-4">
                  {branding?.headshot_url ? (
                    <img src={branding.headshot_url} alt="Agent headshot" className="h-20 w-20 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="h-20 w-20 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('headshot', e)} disabled={!isAuthenticated} />
                      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${isAuthenticated ? 'text-accent hover:underline' : 'text-muted-foreground'}`}>
                        <Upload className="h-4 w-4" />
                        {uploading === 'headshot' ? 'Uploading...' : branding?.headshot_url ? 'Change Photo' : 'Upload Photo'}
                      </span>
                    </label>
                    {!isAuthenticated && <p className="text-xs text-muted-foreground">Sign in to upload a photo</p>}
                    <p className="text-xs text-muted-foreground">Max 2MB, JPG or PNG</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent_name">Agent Name *</Label>
                <Input id="agent_name" value={profile.agent_name} onChange={(e) => handleChange('agent_name', e.target.value)} placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brokerage_name">Brokerage Name *</Label>
                <Input id="brokerage_name" value={profile.brokerage_name} onChange={(e) => handleChange('brokerage_name', e.target.value)} placeholder="Your brokerage" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" type="tel" value={profile.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={profile.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input id="website" value={profile.website || ''} onChange={(e) => handleChange('website', e.target.value)} placeholder="yourwebsite.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">License # (optional)</Label>
                <Input id="license" value={profile.license || ''} onChange={(e) => handleChange('license', e.target.value)} placeholder="License number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom_cta">Custom Call-to-Action (optional)</Label>
                <Input id="custom_cta" value={profile.custom_cta || ''} onChange={(e) => handleChange('custom_cta', e.target.value)} placeholder="Text me at (555) 123-4567 or visit www.yoursite.com" />
                <p className="text-xs text-muted-foreground">Auto-filled into Prospecting Playbook assets.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Branding Section - only for logged-in users */}
        {isAuthenticated && branding && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-accent" />
                  Custom Branding
                </CardTitle>
                <CardDescription>Customize how your shared reports look to clients.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo & Headshot */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <div className="flex flex-col items-center gap-2">
                      {branding.logo_url ? (
                        <img src={branding.logo_url} alt="Logo" className="h-16 w-auto max-w-full object-contain rounded border border-border p-1" />
                      ) : (
                        <div className="h-16 w-full rounded border-2 border-dashed border-border flex items-center justify-center">
                          <Image className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('logo', e)} />
                        <span className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                          <Upload className="h-3 w-3" />
                          {uploading === 'logo' ? 'Uploading...' : 'Upload Logo'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Headshot</Label>
                    <div className="flex flex-col items-center gap-2">
                      {branding.headshot_url ? (
                        <img src={branding.headshot_url} alt="Headshot" className="h-16 w-16 rounded-full object-cover border-2 border-border" />
                      ) : (
                        <div className="h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('headshot', e)} />
                        <span className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                          <Upload className="h-3 w-3" />
                          {uploading === 'headshot' ? 'Uploading...' : 'Upload Headshot'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.primary_color}
                        onChange={(e) => handleBrandingChange('primary_color', e.target.value)}
                        className="h-10 w-10 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={branding.primary_color}
                        onChange={(e) => handleBrandingChange('primary_color', e.target.value)}
                        className="font-mono text-xs"
                        placeholder="#2d3a4a"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.accent_color}
                        onChange={(e) => handleBrandingChange('accent_color', e.target.value)}
                        className="h-10 w-10 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={branding.accent_color}
                        onChange={(e) => handleBrandingChange('accent_color', e.target.value)}
                        className="font-mono text-xs"
                        placeholder="#c8842e"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer text */}
                <div className="space-y-2">
                  <Label>Custom Footer Text</Label>
                  <Textarea
                    value={branding.footer_text || ''}
                    onChange={(e) => handleBrandingChange('footer_text', e.target.value)}
                    placeholder="e.g., Your trusted partner in real estate..."
                    rows={2}
                  />
                </div>

                {/* Social links */}
                <div className="space-y-2">
                  <Label>Social Links</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {['instagram', 'facebook', 'linkedin'].map((platform) => (
                      <Input
                        key={platform}
                        placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                        value={(branding.social_links as Record<string, string>)?.[platform] || ''}
                        onChange={(e) => handleBrandingChange('social_links', {
                          ...(branding.social_links || {}),
                          [platform]: e.target.value,
                        })}
                        className="text-sm"
                      />
                    ))}
                  </div>
                </div>

                {/* Report Template */}
                <div className="space-y-2">
                  <Label>Report Template</Label>
                  <ReportTemplateSelector
                    selected={branding.report_template as ReportTemplate}
                    onSelect={(t) => handleBrandingChange('report_template', t)}
                  />
                </div>
                {/* Live Branding Preview */}
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    Live Report Header Preview
                  </p>
                  <div
                    className="rounded-xl border border-border overflow-hidden"
                    style={{ borderLeftColor: branding.primary_color, borderLeftWidth: 4 }}
                  >
                    <div
                      className="px-4 py-3 flex items-center gap-3"
                      style={{ background: `${branding.primary_color}12` }}
                    >
                      {branding.logo_url && (
                        <img src={branding.logo_url} alt="Logo preview" className="h-10 w-auto max-w-[80px] object-contain" />
                      )}
                      {branding.headshot_url && (
                        <img src={branding.headshot_url} alt="Headshot preview" className="h-10 w-10 rounded-full object-cover border-2 border-white/50" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: branding.primary_color }}>
                          {profile.agent_name || 'Your Name'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {profile.brokerage_name || 'Your Brokerage'}
                          {profile.license ? ` · Lic# ${profile.license}` : ''}
                        </p>
                      </div>
                      <div
                        className="px-2 py-1 rounded text-[10px] font-bold text-white"
                        style={{ background: branding.accent_color }}
                      >
                        PREVIEW
                      </div>
                    </div>
                    {branding.footer_text && (
                      <p className="px-4 py-1.5 text-[10px] text-muted-foreground border-t border-border/50 bg-muted/20 truncate">
                        {branding.footer_text}
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">This is how your branding appears at the top of shared client reports.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Save Button */}
        <div className="flex gap-4 pb-8">
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Button onClick={handleSave} variant={saved ? 'secondary' : 'accent'}>
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
      </div>
    </div>
  );
};

export default AgentProfile;
