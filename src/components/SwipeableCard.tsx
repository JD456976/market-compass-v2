import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2, Archive, ArchiveRestore } from 'lucide-react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
}

export function SwipeableCard({ children, onDelete, deleteLabel = 'Delete' }: SwipeableCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-100, -50], [1, 0]);
  const bgScale = useTransform(x, [-100, -50], [1, 0.8]);

  const isArchiveAction = deleteLabel === 'Archive' || deleteLabel === 'Restore';
  const bgColor = isArchiveAction ? 'bg-amber-500' : 'bg-destructive';
  const bgColorLight = isArchiveAction ? 'border-amber-500/30 bg-amber-500/5' : 'border-destructive/30 bg-destructive/5';
  const ActionIcon = deleteLabel === 'Restore' ? ArchiveRestore : isArchiveAction ? Archive : Trash2;

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80) {
      setIsConfirming(true);
    }
  };

  const handleConfirm = () => {
    onDelete();
    setIsConfirming(false);
  };

  const handleCancel = () => {
    setIsConfirming(false);
  };

  if (isConfirming) {
    return (
      <motion.div
        initial={{ opacity: 1, height: 'auto' }}
        className={`relative overflow-hidden rounded-lg border ${bgColorLight}`}
      >
        <div className="p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-foreground">{deleteLabel} this report?</p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors min-h-[44px] flex items-center gap-2 ${
                isArchiveAction ? 'bg-amber-500 hover:bg-amber-600' : 'bg-destructive hover:bg-destructive/90'
              }`}
            >
              <ActionIcon className="h-4 w-4" />
              {deleteLabel}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-lg">
      {/* Background */}
      <motion.div
        style={{ opacity: bgOpacity, scale: bgScale }}
        className={`absolute inset-y-0 right-0 w-24 flex items-center justify-center ${bgColor} text-white rounded-r-lg`}
      >
        <div className="flex flex-col items-center gap-1">
          <ActionIcon className="h-5 w-5" />
          <span className="text-xs font-medium">{deleteLabel}</span>
        </div>
      </motion.div>

      {/* Card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-card touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
