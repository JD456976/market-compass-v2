import appIcon from '@/assets/market-compass-icon.png';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export function AppLogo({ size = 'md', className }: AppLogoProps) {
  return (
    <img
      src={appIcon}
      alt="Market Compass"
      className={cn(sizeMap[size], 'rounded-lg object-cover', className)}
    />
  );
}
