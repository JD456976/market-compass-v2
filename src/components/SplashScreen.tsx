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
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{
          /* #0F172A base */
          background: 'linear-gradient(145deg, hsl(222 47% 8%) 0%, hsl(217 33% 14%) 50%, hsl(222 47% 11%) 100%)',
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === 'exit' ? 0 : 1 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        onAnimationComplete={() => {
          if (phase === 'exit') onFinished();
        }}
      >
        {/* Gold glow */}
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

        <motion.img
          src={appIcon}
          alt="Market Compass"
          className="w-20 h-20 rounded-2xl shadow-2xl relative z-10"
          initial={{ scale: 0.5, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        />

        <motion.h1
          className="mt-6 text-3xl font-sans font-bold tracking-tight relative z-10"
          style={{ color: '#E2E8F0' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          Market Compass
        </motion.h1>

        <motion.p
          className="mt-2 text-sm font-sans relative z-10"
          style={{ color: 'hsl(215 16% 52%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          Navigate every deal with confidence
        </motion.p>

        <motion.div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 h-0.5 rounded-full overflow-hidden"
          style={{ width: 120, background: 'hsl(0 0% 100% / 0.08)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'hsl(38 72% 58%)' }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.2, delay: 0.9, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
