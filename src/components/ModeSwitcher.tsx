import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useClientMode } from '@/contexts/ClientModeContext';
import { Users, Briefcase } from 'lucide-react';

interface ModeSwitcherProps {
  className?: string;
}

export function ModeSwitcher({ className }: ModeSwitcherProps) {
  const { mode, setMode, isClientMode } = useClientMode();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Briefcase className={`h-4 w-4 transition-colors ${!isClientMode ? 'text-primary' : 'text-muted-foreground'}`} />
        <Label 
          htmlFor="mode-switch" 
          className={`text-sm cursor-pointer transition-colors ${!isClientMode ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
        >
          Agent
        </Label>
      </div>
      <Switch
        id="mode-switch"
        checked={isClientMode}
        onCheckedChange={(checked) => setMode(checked ? 'client' : 'agent')}
      />
      <div className="flex items-center gap-2">
        <Label 
          htmlFor="mode-switch" 
          className={`text-sm cursor-pointer transition-colors ${isClientMode ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
        >
          Client
        </Label>
        <Users className={`h-4 w-4 transition-colors ${isClientMode ? 'text-accent' : 'text-muted-foreground'}`} />
      </div>
    </div>
  );
}
