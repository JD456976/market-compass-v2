import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useIsMobile } from '@/hooks/use-mobile';
import { isAllowedAdmin } from '@/lib/adminConfig';
import { getBetaAccessSession } from '@/lib/betaAccess';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Home, FolderOpen, Send, Settings, Sparkles, Menu,
  TrendingUp, Database, User, BookOpen, FileText, X, ChevronRight, Shield,
  Settings as SettingsIcon, LayoutDashboard, LogOut, Target, BookmarkCheck, Trophy, Eye,
  LayoutList,
} from 'lucide-react';
import { MarketShiftAlertBell } from '@/components/MarketShiftAlerts';
import { AppLogo } from '@/components/AppLogo';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { AllReportsDrawer } from '@/components/AllReportsDrawer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

// ─── Avatar hook ──────────────────────────────────────────────────────────────

function useAgentAvatar() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchAvatar() {
      const [brandingRes, profileRes] = await Promise.all([
        supabase.from('agent_branding').select('headshot_url').eq('user_id', user!.id).maybeSingle(),
        supabase.from('profiles').select('avatar_url, full_name').eq('user_id', user!.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const headshot = brandingRes.data?.headshot_url ?? null;
      const profileAvatar = profileRes.data?.avatar_url ?? null;
      setAvatarUrl(headshot || profileAvatar);
      setName(profileRes.data?.full_name ?? null);
    }

    fetchAvatar();
    return () => { cancelled = true; };
  }, [user?.id]);

  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? 'AG');

  return { avatarUrl, initials, name };
}

// ─── Shared Avatar Component ──────────────────────────────────────────────────

function AgentAvatar({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { avatarUrl, initials } = useAgentAvatar();
  const cls = size === 'md' ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-xs';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Agent avatar"
        className={cn(cls, 'rounded-full object-cover ring-1 ring-border')}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className={cn(cls, 'rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold shrink-0')}>
      {initials}
    </div>
  );
}

// ─── GlobalNav ────────────────────────────────────────────────────────────────

export function GlobalNav() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState(false);
  const { isClient } = useUserRole();
  const { user, loading } = useAuth();

  useEffect(() => {
    const session = getBetaAccessSession();
    if (session?.email && isAllowedAdmin(session.email)) {
      setIsAdmin(true);
    } else if (user?.email && isAllowedAdmin(user.email)) {
      setIsAdmin(true);
    }
  }, [user?.email]);

  if (location.pathname.startsWith('/share/') || location.pathname === '/share') return null;

  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/beta', '/invite'];
  if (authPages.includes(location.pathname)) return null;

  const clientPublicRoutes = ['/my-reports'];
  const isClientPublicRoute = clientPublicRoutes.some(r => location.pathname.startsWith(r));
  if (!loading && !user && !isClient && !isClientPublicRoute) return null;

  if (!loading && !user && !isClient && isClientPublicRoute) {
    return isMobile ? <ClientMobileNav /> : <ClientDesktopNav />;
  }

  if (isClient) {
    return isMobile ? <ClientMobileNav /> : <ClientDesktopNav />;
  }

  if (isMobile) {
    return <MobileNav isAdmin={isAdmin} />;
  }

  const visibleItems: NavItem[] = isAdmin
    ? [{ to: '/admin', label: 'Admin', icon: <Settings className="h-4 w-4" /> }]
    : [];
  return <DesktopNav items={visibleItems} />;
}

// ─── Client Desktop Nav ───────────────────────────────────────────────────────

function ClientDesktopNav() {
  return (
    <header className="sticky top-0 z-50 glass-effect" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <NavLink to="/my-reports" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <AppLogo size="sm" />
            <span className="font-serif font-semibold text-lg">Market Compass</span>
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/my-reports"
              end
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              activeClassName="text-primary bg-primary/5"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>My Reports</span>
            </NavLink>
            <NavLink
              to="/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              activeClassName="text-primary bg-primary/5"
            >
              <SettingsIcon className="h-5 w-5" />
              <span>Settings</span>
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}

// ─── Client Mobile Nav ────────────────────────────────────────────────────────

function ClientMobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass-effect"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      aria-label="Client navigation"
    >
      <div className="flex items-center justify-around h-16">
        <NavLink
          to="/my-reports"
          end
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] min-h-[44px] text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">Reports</span>
        </NavLink>
        <NavLink
          to="/settings"
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] min-h-[44px] text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <SettingsIcon className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}

// ─── Mobile Drawer Links ──────────────────────────────────────────────────────

interface DrawerLink {
  to?: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  action?: 'reports';
}

// Primary group — core workflows
const DRAWER_PRIMARY: DrawerLink[] = [
  { to: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { to: '/lead-finder', label: 'Lead Finder', icon: <Target className="h-5 w-5" /> },
  { to: '/listing-navigator', label: 'Listing Navigator', icon: <Eye className="h-5 w-5" /> },
];

// Reports group
const DRAWER_REPORTS: DrawerLink[] = [
  { action: 'reports', label: 'All Reports', icon: <LayoutList className="h-5 w-5" /> },
  { to: '/drafts', label: 'Draft Analyses', icon: <FolderOpen className="h-5 w-5" /> },
  { to: '/shared-reports', label: 'Shared Reports', icon: <Send className="h-5 w-5" /> },
  { to: '/offer-tracker', label: 'Offer Tracker', icon: <Trophy className="h-5 w-5" /> },
];

// Tools group
const DRAWER_TOOLS: DrawerLink[] = [
  { to: '/saved-playbooks', label: 'Saved Playbooks', icon: <BookmarkCheck className="h-5 w-5" /> },
  { to: '/market-intelligence', label: 'Market Intelligence', icon: <TrendingUp className="h-5 w-5" /> },
  { to: '/market-data', label: 'Market Data', icon: <Database className="h-5 w-5" /> },
  { to: '/templates', label: 'Templates', icon: <FileText className="h-5 w-5" /> },
  { to: '/account', label: 'My Account', icon: <Sparkles className="h-5 w-5" /> },
];

// Account group
const DRAWER_ACCOUNT: DrawerLink[] = [
  { to: '/agent-profile', label: 'Agent Profile', icon: <User className="h-5 w-5" /> },
  { to: '/settings', label: 'Account Settings', icon: <SettingsIcon className="h-5 w-5" /> },
  { to: '/methodology', label: 'Data & Methodology', icon: <BookOpen className="h-5 w-5" /> },
  { to: '/privacy', label: 'Privacy Policy', icon: <Shield className="h-5 w-5" /> },
  { to: '/admin', label: 'Admin', icon: <Settings className="h-5 w-5" />, adminOnly: true },
];

function DrawerSection({ links, isAdmin, pathname, onAction }: { links: DrawerLink[]; isAdmin?: boolean; pathname: string; onAction?: (action: string) => void }) {
  const visible = links.filter(l => !l.adminOnly || isAdmin);
  return (
    <>
      {visible.map((link) => {
        const isActive = link.to && (pathname === link.to || (link.to !== '/' && pathname.startsWith(link.to)));
        if (link.action) {
          return (
            <button
              key={link.action}
              onClick={() => onAction?.(link.action!)}
              className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] text-foreground hover:bg-muted w-[calc(100%-1rem)]"
            >
              {link.icon}
              <span className="flex-1 text-left">{link.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </button>
          );
        }
        return (
          <Link
            key={link.to}
            to={link.to!}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
              isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
            )}
          >
            {link.icon}
            <span className="flex-1">{link.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </Link>
        );
      })}
    </>
  );
}

function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { avatarUrl, initials, name } = useAgentAvatar();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleDrawerAction = (action: string) => {
    if (action === 'reports') {
      setDrawerOpen(false);
      setReportsOpen(true);
    }
  };

  return (
    <>
      {/* All Reports Drawer */}
      <AllReportsDrawer open={reportsOpen} onClose={() => setReportsOpen(false)} />

      {/* Bottom Tab Bar — Home | Leads | Reports | Listing | Menu */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 glass-effect"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around h-16">
          <NavLink
            to="/"
            end
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[56px] min-h-[44px] text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Home</span>
          </NavLink>
          <NavLink
            to="/lead-finder"
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[56px] min-h-[44px] text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <Target className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Leads</span>
          </NavLink>
          {/* Reports — opens AllReportsDrawer */}
          <button
            onClick={() => setReportsOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[56px] min-h-[44px] transition-colors',
              reportsOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <LayoutList className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Reports</span>
          </button>
          <NavLink
            to="/listing-navigator"
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[56px] min-h-[44px] text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <Eye className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Listing</span>
          </NavLink>
          {/* Avatar/Menu button opens drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[56px] min-h-[44px] transition-colors',
              drawerOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Agent avatar"
                className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="text-[10px] font-medium leading-none">Menu</span>
          </button>
        </div>
      </nav>

      {/* Slide-in Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-[70] w-72 bg-card shadow-2xl flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Agent avatar" className="h-9 w-9 rounded-full object-cover ring-1 ring-border shrink-0" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    {name && <p className="text-sm font-semibold truncate">{name}</p>}
                    {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-full hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable links */}
              <div className="flex-1 overflow-y-auto py-2">
                {/* Core Nav */}
                <DrawerSection links={DRAWER_PRIMARY} pathname={location.pathname} onAction={handleDrawerAction} />

                {/* Reports */}
                <div className="mx-4 my-2 border-t border-border/60" />
                <p className="px-6 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Reports</p>
                <DrawerSection links={DRAWER_REPORTS} pathname={location.pathname} onAction={handleDrawerAction} />

                {/* Tools */}
                <div className="mx-4 my-2 border-t border-border/60" />
                <p className="px-6 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tools</p>
                <DrawerSection links={DRAWER_TOOLS} pathname={location.pathname} onAction={handleDrawerAction} />

                {/* Account */}
                <div className="mx-4 my-2 border-t border-border/60" />
                <p className="px-6 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Account</p>
                <DrawerSection links={DRAWER_ACCOUNT} isAdmin={isAdmin} pathname={location.pathname} onAction={handleDrawerAction} />

                {/* Sign out */}
                <div className="mx-4 my-2 border-t border-border/60" />
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors min-h-[44px] w-[calc(100%-1rem)]"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="flex-1 text-left">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Desktop Nav ──────────────────────────────────────────────────────────────

// Primary: Home | Lead Finder | Listing Nav | Market Intel | [Your Reports button] | More ↓
const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { to: '/lead-finder', label: 'Lead Finder', icon: <Target className="h-4 w-4" /> },
  { to: '/listing-navigator', label: 'Listing Nav', icon: <Eye className="h-4 w-4" /> },
  { to: '/market-intelligence', label: 'Market Intel', icon: <TrendingUp className="h-4 w-4" /> },
];

// More dropdown: Offers | Drafts | Shared | Playbooks | Pro Plan | Admin
const SECONDARY_NAV: NavItem[] = [
  { to: '/offer-tracker', label: 'Offer Tracker', icon: <Trophy className="h-4 w-4" /> },
  { to: '/drafts', label: 'Draft Analyses', icon: <FolderOpen className="h-4 w-4" /> },
  { to: '/shared-reports', label: 'Shared Reports', icon: <Send className="h-4 w-4" /> },
  { to: '/saved-playbooks', label: 'Playbooks', icon: <BookmarkCheck className="h-4 w-4" /> },
  { to: '/market-data', label: 'Market Data', icon: <Database className="h-4 w-4" /> },
  { to: '/account', label: 'My Account', icon: <Sparkles className="h-4 w-4" /> },
  { to: '/admin', label: 'Admin', icon: <Settings className="h-4 w-4" />, adminOnly: true },
];

function ProfileDropdown() {
  const { signOut, user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { avatarUrl, initials, name } = useAgentAvatar();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Account menu"
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors',
          open ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <AgentAvatar size="sm" />
        <ChevronRight className={cn('h-3.5 w-3.5 transition-transform text-muted-foreground', open && 'rotate-90')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden z-[100]"
          >
            {/* Agent identity header */}
            <div className="flex items-center gap-3 px-3 py-3 border-b border-border">
              <AgentAvatar size="md" />
              <div className="min-w-0 flex-1">
                {name && <p className="text-sm font-semibold truncate">{name}</p>}
                {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
              </div>
            </div>

            {/* Links */}
            <div className="py-1">
              <Link to="/agent-profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                <User className="h-4 w-4 text-muted-foreground" />
                Agent Profile
              </Link>
              <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                Account Settings
              </Link>
              <Link to="/methodology" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Methodology
              </Link>
            </div>

            {/* Sign out */}
            <div className="border-t border-border py-1">
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="flex items-center gap-2.5 px-3 py-2 w-full text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MoreDropdown({ items }: { items: NavItem[] }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const hasActive = items.some(i => location.pathname === i.to);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          hasActive || open
            ? 'text-primary bg-primary/5'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <Menu className="h-4 w-4" />
        <span>More</span>
        <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden z-[100]"
          >
            <div className="py-1">
              {items.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                    location.pathname === item.to
                      ? 'text-primary bg-primary/5'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DesktopNav({ items }: { items: NavItem[] }) {
  const [reportsOpen, setReportsOpen] = useState(false);
  const adminItems = SECONDARY_NAV.filter(i => !i.adminOnly || items.some(n => n.to === '/admin'));

  return (
    <>
      <AllReportsDrawer open={reportsOpen} onClose={() => setReportsOpen(false)} />
      <header className="sticky top-0 z-50 glass-effect" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-4">
            <NavLink to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors shrink-0">
              <AppLogo size="sm" />
              <span className="font-serif font-semibold text-base">Market Compass</span>
            </NavLink>

            <nav className="flex items-center gap-0.5 flex-1">
              {PRIMARY_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
                  activeClassName="text-primary bg-primary/5"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
              {/* Your Reports — opens drawer */}
              <button
                onClick={() => setReportsOpen(true)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  reportsOpen
                    ? 'text-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <LayoutList className="h-4 w-4" />
                <span>Your Reports</span>
              </button>
              <MoreDropdown items={adminItems} />
            </nav>

            <div className="flex items-center gap-1 shrink-0">
              <MarketShiftAlertBell />
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

// ─── Spacer ───────────────────────────────────────────────────────────────────

export function MobileNavSpacer() {
  const isMobile = useIsMobile();
  const location = useLocation();

  if (location.pathname.startsWith('/share/') || location.pathname === '/share') return null;
  if (!isMobile) return null;

  return (
    <div
      className="h-16"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-hidden="true"
    />
  );
}

