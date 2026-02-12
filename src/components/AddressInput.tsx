import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

export type LocationMode = 'town' | 'address';

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
  locationMode: LocationMode;
  onLocationModeChange: (mode: LocationMode) => void;
  town: string;
  onTownChange: (town: string) => void;
  fullAddress: string;
  onFullAddressChange: (address: string) => void;
  hasError?: boolean;
  attempted?: boolean;
  children?: React.ReactNode; // For the town autocomplete
}

/**
 * Stub geocoder: extracts town/zip from address string.
 * In production, replace with a real geocoding API call.
 */
export function stubGeocode(address: string): AddressData {
  // Try to extract town and zip from typical US address format
  // e.g., "123 Main St, Boston, MA 02101"
  const parts = address.split(',').map(p => p.trim());
  
  let town = '';
  let zip = '';
  
  if (parts.length >= 2) {
    // Second part is usually city
    town = parts[1];
    // Third part might be "MA 02101"
    if (parts.length >= 3) {
      const stateZip = parts[2].trim();
      const zipMatch = stateZip.match(/\d{5}/);
      if (zipMatch) zip = zipMatch[0];
      // Combine city + state
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
  if (data.mode === 'town' || !data.fullAddress) {
    return data.town;
  }
  
  if (isAgentView && includeAddressInAgentView) {
    return data.fullAddress;
  }
  
  // Mask address for client/shared views
  return `${data.town} • Address on file`;
}

export function AddressInput({
  locationMode,
  onLocationModeChange,
  town,
  onTownChange,
  fullAddress,
  onFullAddressChange,
  hasError,
  attempted,
  children,
}: AddressInputProps) {
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ fullAddress: string; town: string; zip?: string }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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
      // Silent fail - autocomplete is a nice-to-have
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    onFullAddressChange(value);
    
    // Auto-derive town from address
    if (value.trim()) {
      const geocoded = stubGeocode(value);
      if (geocoded.town && geocoded.town !== value) {
        onTownChange(geocoded.town);
      }
    }
    
    // Debounce AI autocomplete
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
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1">
          Location <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onLocationModeChange('town')}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              locationMode === 'town'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapPin className="h-3 w-3 inline mr-1" />
            Town
          </button>
          <button
            type="button"
            onClick={() => onLocationModeChange('address')}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              locationMode === 'address'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 className="h-3 w-3 inline mr-1" />
            Address
          </button>
        </div>
      </div>

      {locationMode === 'town' ? (
        <>
          {children}
          {attempted && !town.trim() && (
            <p className="text-xs text-destructive">Location is required</p>
          )}
        </>
      ) : (
        <div className="space-y-3">
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
            
            {/* Address suggestions dropdown */}
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
                    <p className="text-xs">Address improves report accuracy by anchoring to a specific area. It is never shared in client views or public links.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <p className="text-xs text-muted-foreground">Address is private and never shown in shared reports</p>
            </div>
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Derived Town</Label>
            <Input
              value={town}
              onChange={(e) => onTownChange(e.target.value)}
              placeholder="Auto-filled from address"
              className="h-9 text-sm mt-1"
            />
          </div>
          
          {attempted && !town.trim() && (
            <p className="text-xs text-destructive">Location is required (enter an address or town)</p>
          )}
          
          {fullAddress && (
            <Badge variant="secondary" className="text-xs">
              Town-based estimate
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
