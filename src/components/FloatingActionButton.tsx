import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Building2, Users, FileText, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { isClient } = useUserRole();
  const { user } = useAuth();

  // Show first-use tooltip
  useEffect(() => {
    if (!user || isClient) return;
    const seen = localStorage.getItem('fab_tooltip_seen');
    if (!seen) {
      const timer = setTimeout(() => setShowTooltip(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user, isClient]);

  const dismissTooltip = () => {
    setShowTooltip(false);
    localStorage.setItem('fab_tooltip_seen', 'true');
  };

  // Hide for clients, unauthenticated users, shared pages, report pages, and form pages
  if (isClient || !user) return null;
  const hiddenPaths = ['/share/', '/seller', '/buyer', '/admin'];
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) {
    return null;
  }

  const handleOption = (path: string) => {
    setOpen(false);
    dismissTooltip();
    navigate(path);
  };

  const handleFabClick = () => {
    dismissTooltip();
    setOpen(prev => !prev);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB + Options */}
      <div 
        className="fixed z-[56]"
        style={{
          right: '16px',
          bottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '24px',
          pointerEvents: 'auto',
        }}
      >
        {/* First-use Tooltip */}
        <AnimatePresence>
          {showTooltip && !open && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute bottom-[4.5rem] right-0 mb-2 whitespace-nowrap bg-foreground text-background text-xs font-medium px-3 py-2 rounded-lg shadow-lg pointer-events-none select-none"
            >
              Quick-create a new report
              <div className="absolute -bottom-1 right-5 w-2 h-2 bg-foreground rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-16 right-0 w-56 bg-card rounded-xl border border-border shadow-lg overflow-hidden mb-2"
            >
              <div className="py-1">
                <button
                  onClick={() => handleOption('/seller')}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors min-h-[44px]"
                >
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  New Seller Analysis
                </button>
                <button
                  onClick={() => handleOption('/buyer')}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors min-h-[44px]"
                >
                  <div className="p-1.5 rounded-lg bg-accent/10">
                    <Users className="h-4 w-4 text-accent" />
                  </div>
                  New Buyer Analysis
                </button>
                <button
                  onClick={() => handleOption('/templates')}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors border-t border-border min-h-[44px]"
                >
                  <div className="p-1.5 rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  Choose Template
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          onClick={handleFabClick}
          whileTap={{ scale: 0.92 }}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          style={{ boxShadow: '0 4px 14px hsl(var(--primary) / 0.35)' }}
        >
          <motion.div
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </motion.div>
        </motion.button>
      </div>
    </>
  );
}
