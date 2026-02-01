import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { loadSessions, loadMarketProfiles } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Seattle, WA",
  className,
  hasError,
}: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Get unique locations from sessions and market profiles
  const getLocationSuggestions = (query: string): string[] => {
    const sessions = loadSessions();
    const profiles = loadMarketProfiles();
    
    const locations = new Set<string>();
    
    sessions.forEach(s => {
      if (s.location) locations.add(s.location);
    });
    
    profiles.forEach(p => {
      if (p.location) locations.add(p.location);
    });
    
    const allLocations = Array.from(locations);
    
    if (!query.trim()) return allLocations.slice(0, 5);
    
    const lowerQuery = query.toLowerCase();
    return allLocations
      .filter(loc => loc.toLowerCase().includes(lowerQuery))
      .slice(0, 5);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    const matches = getLocationSuggestions(newValue);
    setSuggestions(matches);
    setIsOpen(matches.length > 0);
  };

  const handleSelect = (location: string) => {
    onChange(location);
    setIsOpen(false);
  };

  const handleFocus = () => {
    const matches = getLocationSuggestions(value);
    setSuggestions(matches);
    setIsOpen(matches.length > 0);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
      <Input
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={cn(
          "h-11 pl-10",
          hasError && "border-destructive",
          className
        )}
      />
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((loc, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent/10 transition-colors flex items-center gap-2"
              onClick={() => handleSelect(loc)}
            >
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {loc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
