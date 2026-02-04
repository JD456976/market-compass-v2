import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import { useIsMobile } from '@/hooks/use-mobile';
import { isAllowedAdmin } from '@/lib/adminConfig';
import { getBetaAccessSession } from '@/lib/betaAccess';
import { Home, FolderOpen, Send, Settings, Compass, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { to: '/drafts', label: 'Drafts', icon: <FolderOpen className="h-5 w-5" /> },
  { to: '/shared-reports', label: 'Shared', icon: <Send className="h-5 w-5" /> },
  { to: '/subscription', label: 'Pro', icon: <Sparkles className="h-5 w-5" /> },
  { to: '/admin', label: 'Admin', icon: <Settings className="h-5 w-5" />, adminOnly: true },
];

export function GlobalNav() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const session = getBetaAccessSession();
    if (session?.email && isAllowedAdmin(session.email)) {
      setIsAdmin(true);
    }
  }, []);

  // Don't show nav on shared pages
  if (location.pathname.startsWith('/share/') || location.pathname === '/share') {
    return null;
  }

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  if (isMobile) {
    return <MobileNav items={visibleItems} />;
  }

  return <DesktopNav items={visibleItems} />;
}

function MobileNav({ items }: { items: NavItem[] }) {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] min-h-[44px] text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            {item.icon}
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function DesktopNav({ items }: { items: NavItem[] }) {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Brand */}
          <NavLink to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <Compass className="h-5 w-5 text-primary" />
            <span className="font-serif font-semibold text-lg">Market Compass</span>
          </NavLink>

          {/* Navigation Links */}
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
          </nav>
        </div>
      </div>
    </header>
  );
}

// Spacer component to prevent content from being hidden behind mobile nav
export function MobileNavSpacer() {
  const isMobile = useIsMobile();
  const location = useLocation();

  // Don't add spacer on shared pages (no nav shown)
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
