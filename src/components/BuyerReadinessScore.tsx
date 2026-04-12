import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface BuyerReadinessScoreProps {
  leadZip: string;
}

interface Factors {
  preApproved: boolean;
  timeline: '0-3' | '3-6' | '6-12' | '12+';
  downPaymentReady: boolean;
  motivated: boolean;
  hasSeenProperties: boolean;
}

const TIMELINE_POINTS: Record<string, number> = {
  '0-3': 20,
  '3-6': 15,
  '6-12': 10,
  '12+': 5,
};

const TIMELINE_OPTIONS = [
  { value: '0-3', label: '0–3 mo' },
  { value: '3-6', label: '3–6 mo' },
  { value: '6-12', label: '6–12 mo' },
  { value: '12+', label: '12+ mo' },
] as const;

function getStorageKey(zip: string) {
  return `mc-buyer-readiness-${zip}`;
}

function loadFactors(zip: string): Factors {
  try {
    const raw = localStorage.getItem(getStorageKey(zip));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { preApproved: false, timeline: '3-6', downPaymentReady: false, motivated: false, hasSeenProperties: false };
}

function saveFactors(zip: string, factors: Factors) {
  localStorage.setItem(getStorageKey(zip), JSON.stringify(factors));
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke="#D4A853"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-mono" style={{ color: '#D4A853' }}>{score}</span>
        <span className="text-[10px]" style={{ color: '#94A3B8' }}>/100</span>
      </div>
    </div>
  );
}

function getLabel(score: number) {
  if (score >= 80) return { text: 'Hot Buyer 🔥', color: '#D4A853' };
  if (score >= 60) return { text: 'Warming Up 📈', color: '#818CF8' };
  if (score >= 40) return { text: 'Early Stage 🌱', color: '#94A3B8' };
  return { text: 'Not Ready ❄️', color: '#64748B' };
}

export function BuyerReadinessScore({ leadZip }: BuyerReadinessScoreProps) {
  const [factors, setFactors] = useState<Factors>(() => loadFactors(leadZip));

  useEffect(() => {
    setFactors(loadFactors(leadZip));
  }, [leadZip]);

  useEffect(() => {
    saveFactors(leadZip, factors);
  }, [leadZip, factors]);

  const score = useMemo(() => {
    let s = 0;
    if (factors.preApproved) s += 20;
    s += TIMELINE_POINTS[factors.timeline] ?? 0;
    if (factors.downPaymentReady) s += 20;
    if (factors.motivated) s += 20;
    if (factors.hasSeenProperties) s += 20;
    return s;
  }, [factors]);

  const label = getLabel(score);

  const update = (patch: Partial<Factors>) => setFactors(prev => ({ ...prev, ...patch }));

  const toggleRows: { key: keyof Omit<Factors, 'timeline'>; label: string; pts: string }[] = [
    { key: 'preApproved', label: 'Pre-Approved', pts: '20 pts' },
    { key: 'downPaymentReady', label: 'Down Payment Ready', pts: '20 pts' },
    { key: 'motivated', label: 'Motivated Buyer', pts: '20 pts' },
    { key: 'hasSeenProperties', label: 'Has Seen Properties', pts: '20 pts' },
  ];

  return (
    <Card style={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold" style={{ color: '#F1F5F9' }}>
          Buyer Readiness Score
        </CardTitle>
        <p className="text-xs" style={{ color: '#94A3B8' }}>Rate this lead's readiness to transact</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <ScoreGauge score={score} />
        <div className="text-center">
          <span className="text-sm font-semibold" style={{ color: label.color }}>{label.text}</span>
        </div>

        <div className="space-y-3">
          {toggleRows.map(row => (
            <div key={row.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: '#CBD5E1' }}>{row.label}</span>
                <span className="text-[10px] font-mono" style={{ color: '#64748B' }}>{row.pts}</span>
              </div>
              <Switch
                checked={factors[row.key] as boolean}
                onCheckedChange={(v) => update({ [row.key]: v })}
              />
            </div>
          ))}

          {/* Timeline pills */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: '#CBD5E1' }}>Timeline</span>
              <span className="text-[10px] font-mono" style={{ color: '#64748B' }}>5–20 pts</span>
            </div>
            <div className="flex gap-1.5">
              {TIMELINE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update({ timeline: opt.value })}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                    factors.timeline === opt.value
                      ? 'text-white'
                      : 'hover:opacity-80'
                  )}
                  style={{
                    backgroundColor: factors.timeline === opt.value ? '#D4A853' : 'rgba(255,255,255,0.06)',
                    color: factors.timeline === opt.value ? '#0F172A' : '#94A3B8',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
