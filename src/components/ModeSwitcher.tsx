import { useClientMode } from '@/contexts/ClientModeContext';
import { Briefcase, Users } from 'lucide-react';

interface ModeSwitcherProps {
  className?: string;
}

export function ModeSwitcher({ className }: ModeSwitcherProps) {
  const { mode, setMode, isClientMode } = useClientMode();

  return (
    <div className={`flex items-center ${className}`}>
      {/* Agent Button */}
      <button
        type="button"
        onClick={() => setMode('agent')}
        aria-pressed={!isClientMode}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-l-lg font-medium text-sm
          transition-all duration-200 min-h-[44px] min-w-[100px] justify-center
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          ${!isClientMode 
            ? 'bg-primary-foreground text-primary shadow-sm' 
            : 'bg-transparent text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
          }
        `}
      >
        <Briefcase className="h-4 w-4" />
        <span>Agent</span>
      </button>
      
      {/* Client Button */}
      <button
        type="button"
        onClick={() => setMode('client')}
        aria-pressed={isClientMode}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-r-lg font-medium text-sm
          transition-all duration-200 min-h-[44px] min-w-[100px] justify-center
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          ${isClientMode 
            ? 'bg-accent text-accent-foreground shadow-sm' 
            : 'bg-transparent text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
          }
        `}
      >
        <Users className="h-4 w-4" />
        <span>Client</span>
      </button>
    </div>
  );
}
