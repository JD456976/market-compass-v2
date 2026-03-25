import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import appIcon from '@/assets/market-compass-icon.png';

export function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase('hold'), 600);
    const exitTimer = setTimeout(() => setPhase('exit'), 2200);
    const doneTimer = setTimeout(() => onFinished(), 2800);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinished]);

  return (
    <AnimatePresence>
      {phase !== 'exit' ? null : null}
      <motion.div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
        style={{
          background: 'linear-gradient(145deg, hsl(228 20% 6%) 0%, hsl(228 22% 12%) 50%, hsl(228 18% 8%) 100%)',
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === 'exit' ? 0 : 1 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        onAnimationComplete={() => {
          if (phase === 'exit') onFinished();
        }}
      >
        {/* Subtle gold glow behind icon */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 320,
            height: 320,
            background: 'radial-gradient(circle, hsl(38 72% 58% / 0.1) 0%, transparent 70%)',
          }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1.3, opacity: 1 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />

        {/* App icon */}
        <motion.img
          src={appIcon}
          alt="Market Compass"
          className="w-20 h-20 rounded-2xl shadow-2xl relative z-10"
          initial={{ scale: 0.5, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        />

        {/* App name */}
        <motion.h1
          className="mt-6 text-3xl font-serif font-bold tracking-tight relative z-10 text-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          Market Compass
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="mt-2 text-sm font-sans relative z-10 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          Navigate every deal with confidence
        </motion.p>

        {/* Gold loading bar */}
        <motion.div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 h-0.5 rounded-full overflow-hidden"
          style={{ width: 120, background: 'hsl(var(--border))' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.2, delay: 0.9, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
