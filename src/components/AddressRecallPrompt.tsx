import { motion, AnimatePresence } from 'framer-motion';
import { History, ArrowRight, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecallMatch } from '@/hooks/useAddressRecall';
import { Session } from '@/types';
import { formatPriceDisplay } from '@/lib/currencyFormat';

interface AddressRecallPromptProps {
  matches: RecallMatch[];
  onLoad: (session: Session) => void;
  onDismiss: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPrice(session: Session): string | null {
  if (session.buyer_inputs?.offer_price) return formatPriceDisplay(String(session.buyer_inputs.offer_price));
  if (session.seller_inputs?.seller_selected_list_price) return formatPriceDisplay(String(session.seller_inputs.seller_selected_list_price));
  return null;
}

export function AddressRecallPrompt({ matches, onLoad, onDismiss }: AddressRecallPromptProps) {
  if (matches.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-2"
      >
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <History className="h-4 w-4 text-accent" />
              <span>Previous analysis found</span>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 rounded-md hover:bg-muted/50 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-1.5">
            {matches.map((match) => {
              const price = getPrice(match.session);
              const addr = match.session.address_fields?.address_line || match.session.location;
              return (
                <button
                  key={match.session.id}
                  onClick={() => onLoad(match.session)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-md bg-card hover:bg-secondary/50 border border-border/50 transition-all group text-left"
                >
                  <div className="shrink-0 p-1.5 rounded-md bg-primary/10">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{addr}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{match.session.client_name || 'Untitled'}</span>
                      <span>•</span>
                      {price && <><span>{price}</span><span>•</span></>}
                      <span>{formatDate(match.session.updated_at)}</span>
                      {match.matchType === 'exact_address' && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-semibold uppercase">
                          Exact match
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground mt-2">
            Load previous details for quick re-analysis — price adjustments, revised offers, etc.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
