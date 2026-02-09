import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
          <div>
            <Input
              value={fullAddress}
              onChange={(e) => {
                onFullAddressChange(e.target.value);
                // Auto-derive town from address
                if (e.target.value.trim()) {
                  const geocoded = stubGeocode(e.target.value);
                  if (geocoded.town && geocoded.town !== e.target.value) {
                    onTownChange(geocoded.town);
                  }
                }
              }}
              placeholder="123 Main St, Boston, MA 02101"
              className={cn(
                "h-11",
                hasError && "border-destructive"
              )}
            />
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
