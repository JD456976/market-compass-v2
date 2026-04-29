/**
 * RecentZipsWidget — Home screen "My Markets" row.
 * Shows last 6 scored ZIPs from localStorage as tappable cards.
 * One tap → LeadFinder pre-loaded with that ZIP.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface RecentZip {
  zip: string;
  cityState: string;
  score: number;
  leadType: 'seller' | 'transitional' | 'buyer';
  at: string;
}

function scoreMeta(score: number, leadType: string) {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', label: 'Strong', Icon: TrendingUp };
  if (score >= 55) return { color: '#D4A853', bg: 'rgba(212,168,83,0.12)', label: 'Active', Icon: Minus };
  return { color: '#94A3B8', bg: 'rgba(148,163,184,0.10)', label: 'Slow', Icon: TrendingDown };
}

function leadTypeBadge(t: string) {
  if (t === 'seller') return { label: 'Seller Mkt', dot: '#F97316' };
  if (t === 'buyer') return { label: 'Buyer Mkt', dot: '#3B82F6' };
  return { label: 'Transitional', dot: '#A855F7' };
}

export function RecentZipsWidget() {
  const [zips, setZips] = useState<RecentZip[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mc_recent_zips');
      if (raw) setZips(JSON.parse(raw));
    } catch { /* non-fatal */ }
  }, []);

  if (zips.length === 0) return null;

  return (
    <motion.div
      className="max-w-4xl mx-auto mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#64748B' }}>
          My Markets
        </p>
        <button
          className="text-[11px] underline-offset-2 hover:underline"
          style={{ color: '#D4A853' }}
          onClick={() => navigate('/lead-finder')}
        >
          Open Lead Finder →
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {zips.map((z, i) => {
          const { color, bg, label, Icon } = scoreMeta(z.score, z.leadType);
          const badge = leadTypeBadge(z.leadType);
          return (
            <motion.button
              key={z.zip}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => navigate(`/lead-finder?zip=${z.zip}`)}
              className="shrink-0 text-left rounded-xl p-4 transition-all active:scale-95 hover:brightness-110"
              style={{
                width: 148,
                background: '#1E293B',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Score ring + icon */}
              <div className="flex items-center justify-between mb-3">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: bg, color }}
                >
                  {z.score}
                </div>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>

              {/* ZIP + city */}
              <p className="text-sm font-semibold leading-tight" style={{ color: '#F1F5F9' }}>
                {z.zip}
              </p>
              <p className="text-[11px] truncate mt-0.5" style={{ color: '#64748B' }}>
                {z.cityState !== z.zip ? z.cityState : label}
              </p>

              {/* Lead type + time */}
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: badge.dot }} />
                <span className="text-[10px] truncate" style={{ color: '#94A3B8' }}>
                  {badge.label}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-2.5 w-2.5 shrink-0" style={{ color: '#475569' }} />
                <span className="text-[10px]" style={{ color: '#475569' }}>
                  {formatDistanceToNow(new Date(z.at), { addSuffix: true })}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
