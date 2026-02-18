import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

export type LocationMode = 'address';

export interface AddressData {
  mode: LocationMode;
  town: string;
  fullAddress?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  geocodeStatus?: 'success' | 'fallback' | 'none';
}

interface AddressInputProps {
  town: string;
  onTownChange: (town: string) => void;
  fullAddress: string;
  onFullAddressChange: (address: string) => void;
  hasError?: boolean;
  attempted?: boolean;
}

/**
 * Parse address components: extracts town/zip from address string.
 */
export function parseAddressComponents(address: string): AddressData {
  const parts = address.split(',').map(p => p.trim());
  
  let town = '';
  let zip = '';
  
  if (parts.length >= 2) {
    town = parts[1];
    if (parts.length >= 3) {
      const stateZip = parts[2].trim();
      const zipMatch = stateZip.match(/\d{5}/);
      if (zipMatch) zip = zipMatch[0];
      const stateMatch = stateZip.match(/^[A-Z]{2}/);
      if (stateMatch) {
        town = `${parts[1]}, ${stateMatch[0]}`;
      }
    }
  } else {
    town = address;
  }
  
  return {
    mode: 'address',
    town: town || address,
    fullAddress: address,
    zip: zip || undefined,
    geocodeStatus: town ? 'fallback' : 'none',
  };
}

/**
 * Privacy-safe display of address for shared/client views
 */
export function getPrivacyAddress(data: AddressData, isAgentView: boolean, includeAddressInAgentView: boolean): string {
  if (!data.fullAddress) {
    return data.town;
  }
  
  if (isAgentView && includeAddressInAgentView) {
    return data.fullAddress;
  }
  
  return `${data.town} • Address on file`;
}

export function AddressInput({
  town,
  onTownChange,
  fullAddress,
  onFullAddressChange,
  hasError,
  attempted,
}: AddressInputProps) {
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ fullAddress: string; town: string; zip?: string }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAddressSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('address-autocomplete', {
        body: { query },
      });
      
      if (!error && data?.suggestions) {
        setAddressSuggestions(data.suggestions);
        setShowSuggestions(data.suggestions.length > 0);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    onFullAddressChange(value);
    
    if (value.trim()) {
      const geocoded = parseAddressComponents(value);
      if (geocoded.town && geocoded.town !== value) {
        onTownChange(geocoded.town);
      }
    }
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAddressSuggestions(value);
    }, 500);
  };

  const handleSelectSuggestion = (suggestion: { fullAddress: string; town: string; zip?: string }) => {
    onFullAddressChange(suggestion.fullAddress);
    onTownChange(suggestion.town);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1">
        Property Address <span className="text-destructive">*</span>
      </Label>

      <div ref={wrapperRef} className="relative">
        <Input
          value={fullAddress}
          onChange={(e) => handleAddressChange(e.target.value)}
          onFocus={() => {
            if (addressSuggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder="123 Main St, Boston, MA 02101"
          className={cn(
            "h-11",
            hasError && "border-destructive"
          )}
        />
        {isLoadingSuggestions && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        
        {showSuggestions && addressSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {addressSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent/10 transition-colors flex items-center gap-2"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="truncate">{suggestion.fullAddress}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.town}{suggestion.zip ? ` ${suggestion.zip}` : ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-1 mt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p className="text-xs">Address improves report accuracy. It is never shared in client views or public links.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="text-xs text-muted-foreground">Address is private and never shown in shared reports</p>
        </div>
      </div>
      
      {attempted && !town.trim() && (
        <p className="text-xs text-destructive">Location is required (enter an address or town)</p>
      )}
    </div>
  );
}
