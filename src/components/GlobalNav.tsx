import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useIsMobile } from '@/hooks/use-mobile';
import { isAllowedAdmin } from '@/lib/adminConfig';
import { getBetaAccessSession } from '@/lib/betaAccess';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, FolderOpen, Send, Settings, Compass, Sparkles, Menu,
  TrendingUp, Database, User, BookOpen, FileText, X, ChevronRight, Shield, Settings as SettingsIcon,
  LayoutDashboard, MessageSquare, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export function GlobalNav() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState(false);
  const { isClient } = useUserRole();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Check admin from beta session OR authenticated user email
    const session = getBetaAccessSession();
    if (session?.email && isAllowedAdmin(session.email)) {
      setIsAdmin(true);
    } else if (user?.email && isAllowedAdmin(user.email)) {
      setIsAdmin(true);
    }
  }, [user?.email]);

  // Don't show nav on shared pages
  if (location.pathname.startsWith('/share/') || location.pathname === '/share') {
    return null;
  }

  // Don't show nav on auth pages
  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/beta', '/invite'];
  if (authPages.includes(location.pathname)) {
    return null;
  }

  // Don't show full nav if not authenticated (unless on client/public pages)
  if (!loading && !user && !isClient) {
    return null;
  }

  // Client-specific navigation
  if (isClient) {
    if (isMobile) return <ClientMobileNav />;
    return <ClientDesktopNav />;
  }

  if (isMobile) {
    return <MobileNav isAdmin={isAdmin} />;
  }

  const desktopItems: NavItem[] = [
    { to: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { to: '/drafts', label: 'Drafts', icon: <FolderOpen className="h-5 w-5" /> },
    { to: '/shared-reports', label: 'Shared', icon: <Send className="h-5 w-5" /> },
    { to: '/subscription', label: 'Dashboard', icon: <Sparkles className="h-5 w-5" /> },
    { to: '/admin', label: 'Admin', icon: <Settings className="h-5 w-5" />, adminOnly: true },
  ];

  const visibleItems = desktopItems.filter(item => !item.adminOnly || isAdmin);
  return <DesktopNav items={visibleItems} />;
}

// ─── Client Desktop Nav ──────────────────────────────────────────────────────

function ClientDesktopNav() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <NavLink to="/my-reports" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <Compass className="h-5 w-5 text-primary" />
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

// ─── Client Mobile Nav ───────────────────────────────────────────────────────

function ClientMobileNav() {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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

// ─── Mobile Bottom Nav ───────────────────────────────────────────────────────

interface DrawerLink {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const drawerLinks: DrawerLink[] = [
  { to: '/templates', label: 'Templates', icon: <FileText className="h-5 w-5" /> },
  { to: '/market-scenarios', label: 'Market Scenarios', icon: <TrendingUp className="h-5 w-5" /> },
  { to: '/market-data', label: 'Market Data', icon: <Database className="h-5 w-5" /> },
  { to: '/agent-profile', label: 'Agent Profile', icon: <User className="h-5 w-5" /> },
  { to: '/methodology', label: 'Data & Methodology', icon: <BookOpen className="h-5 w-5" /> },
  { to: '/settings', label: 'Account Settings', icon: <SettingsIcon className="h-5 w-5" /> },
  { to: '/subscription', label: 'Pro Dashboard', icon: <Sparkles className="h-5 w-5" /> },
  { to: '/privacy', label: 'Privacy Policy', icon: <Shield className="h-5 w-5" /> },
  { to: '/admin', label: 'Admin', icon: <Settings className="h-5 w-5" />, adminOnly: true },
];

function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const visibleDrawerLinks = drawerLinks.filter(l => !l.adminOnly || isAdmin);

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around h-16">
          <NavLink
            to="/"
            end
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] min-h-[44px] text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Home</span>
          </NavLink>
          <NavLink
            to="/drafts"
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] min-h-[44px] text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <FolderOpen className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Drafts</span>
          </NavLink>
          <NavLink
            to="/shared-reports"
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] min-h-[44px] text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <Send className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Shared</span>
          </NavLink>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] min-h-[44px] transition-colors",
              drawerOpen ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Menu</span>
          </button>
        </div>
      </nav>

      {/* Menu Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-[70] w-72 bg-background border-l border-border shadow-xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-primary" />
                  <span className="font-serif font-semibold">Menu</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-full hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="py-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
                {visibleDrawerLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                      location.pathname === link.to
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {link.icon}
                    <span className="flex-1">{link.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Desktop Nav (unchanged) ─────────────────────────────────────────────────

function DesktopNav({ items }: { items: NavItem[] }) {
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <NavLink to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <Compass className="h-5 w-5 text-primary" />
            <span className="font-serif font-semibold text-lg">Market Compass</span>
          </NavLink>
          <nav className="flex items-center gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                  "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                )}
                activeClassName="text-primary bg-primary/5"
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="ml-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign Out
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}

// ─── Spacer ──────────────────────────────────────────────────────────────────

export function MobileNavSpacer() {
  const isMobile = useIsMobile();
  const location = useLocation();

  if (location.pathname.startsWith('/share/') || location.pathname === '/share') {
    return null;
  }
  if (!isMobile) {
    return null;
  }

  return (
    <div 
      className="h-16" 
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} 
      aria-hidden="true" 
    />
  );
}
