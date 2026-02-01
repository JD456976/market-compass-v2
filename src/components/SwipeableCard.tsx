import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
}

export function SwipeableCard({ children, onDelete, deleteLabel = 'Delete' }: SwipeableCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -50], [1, 0]);
  const deleteScale = useTransform(x, [-100, -50], [1, 0.8]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80) {
      setIsDeleting(true);
    }
  };

  const handleDeleteClick = () => {
    onDelete();
  };

  const handleCancel = () => {
    setIsDeleting(false);
  };

  if (isDeleting) {
    return (
      <motion.div
        initial={{ opacity: 1, height: 'auto' }}
        className="relative overflow-hidden rounded-lg border border-destructive/30 bg-destructive/5"
      >
        <div className="p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-foreground">Delete this draft?</p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteClick}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors min-h-[44px] flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-lg">
      {/* Delete background */}
      <motion.div
        style={{ opacity: deleteOpacity, scale: deleteScale }}
        className="absolute inset-y-0 right-0 w-24 flex items-center justify-center bg-destructive text-destructive-foreground rounded-r-lg"
      >
        <div className="flex flex-col items-center gap-1">
          <Trash2 className="h-5 w-5" />
          <span className="text-xs font-medium">Delete</span>
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
