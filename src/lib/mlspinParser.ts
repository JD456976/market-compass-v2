/**
 * MLSPIN Listing Sheet Parser
 * 
 * Deterministic regex-based extraction for MLSPIN (MLS Property Information Network)
 * format commonly used in Massachusetts and New England.
 * 
 * No paid AI required — pure pattern matching.
 */

export interface ExtractedField {
  value: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
  source: 'field' | 'remarks';
}

export interface MarketHistoryEvent {
  mlsNumber: string;
  date: string;
  action: string;
  price: number | null;
  agent?: string;
  dom?: number;
  dto?: number;
}

export interface MLSPINExtraction {
  mlsNumber: ExtractedField | null;
  listPrice: ExtractedField | null;
  address: ExtractedField | null;
  city: ExtractedField | null;
  state: ExtractedField | null;
  zip: ExtractedField | null;
  county: ExtractedField | null;
  propertyType: ExtractedField | null;
  bedrooms: ExtractedField | null;
  bathsFull: ExtractedField | null;
  bathsHalf: ExtractedField | null;
  squareFeet: ExtractedField | null;
  lotSize: ExtractedField | null;
  yearBuilt: ExtractedField | null;
  daysOnMarket: ExtractedField | null;
  listDate: ExtractedField | null;
  taxAmount: ExtractedField | null;
  taxYear: ExtractedField | null;
  assessedValue: ExtractedField | null;
  hoaFee: ExtractedField | null;
  heating: ExtractedField | null;
  cooling: ExtractedField | null;
  parking: ExtractedField | null;
  style: ExtractedField | null;
  condition: ExtractedField | null;
  remarks: ExtractedField | null;
  // New valuable fields
  construction: ExtractedField | null;
  foundation: ExtractedField | null;
  sewer: ExtractedField | null;
  water: ExtractedField | null;
  electric: ExtractedField | null;
  appliances: ExtractedField | null;
  exteriorFeatures: ExtractedField | null;
  flooring: ExtractedField | null;
  roofMaterial: ExtractedField | null;
  basement: ExtractedField | null;
  garageSpaces: ExtractedField | null;
  totalRooms: ExtractedField | null;
  schools: ExtractedField | null;
  lotDescription: ExtractedField | null;
  disclosures: ExtractedField | null;
  listingOffice: ExtractedField | null;
  listingAgent: ExtractedField | null;
  originalPrice: ExtractedField | null;
  // Market history
  marketHistory: MarketHistoryEvent[];
  // Property intelligence factors
  factors: PropertyFactor[];
}

export interface PropertyFactor {
  label: string;
  weight: number;
  explanation: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'field' | 'remarks';
}

function field(value: string, confidence: 'high' | 'medium' | 'low', evidence: string, source: 'field' | 'remarks' = 'field'): ExtractedField {
  return { value: value.trim(), confidence, evidence: evidence.trim().substring(0, 200), source };
}

function matchFirst(text: string, patterns: RegExp[]): { match: string; evidence: string } | null {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      return { match: m[1].trim(), evidence: m[0].trim() };
    }
  }
  return null;
}

function extractMLSNumber(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /MLS\s*#?\s*:?\s*(\d{6,10})/i,
    /MLS\s+Number\s*:?\s*(\d{6,10})/i,
    /Listing\s*#?\s*:?\s*(\d{6,10})/i,
    /ML\s*#?\s*:?\s*(\d{6,10})/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractListPrice(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /List\s*Price\s*:?\s*\$?([\d,]+)/i,
    /Asking\s*Price\s*:?\s*\$?([\d,]+)/i,
    /Price\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i,
    /LP\s*:?\s*\$?([\d,]+)/i,
  ]);
  return result ? field(result.match.replace(/,/g, ''), 'high', result.evidence) : null;
}

function extractAddress(text: string): ExtractedField | null {
  // Try labeled format first
  const result = matchFirst(text, [
    /(?:Address|Street|Location)\s*:?\s*([\d]+\s+[\w\s.]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Blvd|Boulevard|Cir|Circle|Pl|Place|Ter|Terrace|Pkwy|Parkway|Pike|Hwy|Highway)[.,]?)/i,
    /^(\d+\s+\w[\w\s.]*(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Blvd|Boulevard|Pkwy|Parkway|Pike|Hwy)\.?)\s*$/im,
  ]);
  if (result) return field(result.match, 'high', result.evidence);

  // MLSPIN PDF: address appears before "City, ST ZIP" — may be space-separated not newline
  const beforeCityMatch = text.match(/(\d+\s+[A-Za-z][\w\s.]*?(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Blvd|Boulevard|Pkwy|Parkway|Pike|Hwy|Highway)\.?)\s+[A-Za-z]+,?\s*[A-Z]{2}\s+\d{5}/i);
  if (beforeCityMatch?.[1]) return field(beforeCityMatch[1].trim(), 'high', beforeCityMatch[0].substring(0, 200));

  // Broader fallback: "## Street" pattern before city/state  
  const broadMatch = text.match(/(\d+\s+[A-Za-z][\w\s.]{2,40}?)\s+(?:Norwood|Boston|Cambridge|Brookline|Newton|Quincy|Braintree|Weymouth|Milton|Dedham|Canton|Needham|Wellesley|Framingham|Natick|Waltham|Medford|Somerville|Arlington|Lexington|Concord|Plymouth|Worcester|Springfield|[A-Z][a-z]+),?\s*(?:MA|CT|RI|NH|VT|ME)\s/i);
  if (broadMatch?.[1]) return field(broadMatch[1].trim(), 'medium', broadMatch[0].substring(0, 200));

  return null;
}

function extractCity(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:City|Town)\s*:?\s*([A-Za-z\s]+?)(?:\s*,|\s+MA|\s+State)/i,
    /(?:Municipality)\s*:?\s*([A-Za-z\s]+?)(?:\s*,|\n)/i,
    // MLSPIN format: "Norwood, MA 02062" — works even without line boundary
    /(?:Pkwy|Parkway|St|Ave|Rd|Dr|Ln|Way|Ct|Blvd|Pike|Hwy)\.?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),?\s*[A-Z]{2}\s+\d{5}/,
    /^([A-Za-z\s]+),\s*[A-Z]{2}\s+\d{5}/m,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractState(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /State\s*:?\s*([A-Z]{2})/i,
    /,\s*([A-Z]{2})\s+\d{5}/,
  ]);
  return result ? field(result.match.toUpperCase(), 'high', result.evidence) : null;
}

function extractZip(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Zip|Zip\s*Code|Postal)\s*:?\s*(\d{5}(?:-\d{4})?)/i,
    /[A-Z]{2}\s+(\d{5}(?:-\d{4})?)/,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractCounty(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:County)\s*:?\s*([A-Za-z\s]+?)(?:\s*$|\n)/im,
    /([A-Za-z]+\s+County)/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractPropertyType(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Property\s*Type|Type)\s*:?\s*(Single\s*Family[\s-]*(?:Detached)?|Condo(?:minium)?|Multi[\s-]*Family|Townhouse|Town\s*Home|Duplex|Triple[\s-]*Decker|Two[\s-]*Family|Three[\s-]*Family)/i,
    /(Single\s*Family[\s-]*(?:Detached)?)/i,
    /(?:Res|Residential)\s*:?\s*(Single\s*Family|Condo|Multi[\s-]*Family)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractBedrooms(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Bed(?:room)?s?|BR|Bdrm)\s*:?\s*(\d+)/i,
    /(\d+)\s*(?:Bed(?:room)?s?|BR)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractBathsFull(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Full\s*Bath(?:room)?s?|Baths?\s*Full)\s*:?\s*(\d+)/i,
    /(\d+)\s*(?:Full\s*Bath)/i,
    // MLSPIN format: "Bathrooms: 3f 0h" or "3f"
    /Bath(?:room)?s?\s*:?\s*(\d+)f/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractBathsHalf(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Half\s*Bath(?:room)?s?|Baths?\s*Half)\s*:?\s*(\d+)/i,
    /(\d+)\s*(?:Half\s*Bath)/i,
    // MLSPIN format: "3f 0h"
    /Bath(?:room)?s?\s*:?\s*\d+f\s+(\d+)h/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractSquareFeet(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Approx\.?\s*Living\s*Area\s*Total|Living\s*Area\s*Total|Total\s*Living\s*Area)\s*:?\s*([\d,]+)\s*(?:Sq\.?\s*Ft|SF)?/i,
    /(?:Sq\.?\s*(?:Ft|Feet|Footage)|Living\s*Area|Total\s*Area|Gross\s*Living)\s*:?\s*([\d,]+)/i,
    /([\d,]+)\s*(?:Sq\.?\s*(?:Ft|Feet)|SF)/i,
  ]);
  return result ? field(result.match.replace(/,/g, ''), 'high', result.evidence) : null;
}

function extractLotSize(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Approx\.?\s*Acres?|Lot\s*Size|Lot\s*Area|Land\s*Area)\s*:?\s*([\d,.]+\s*(?:\([\d,]+\s*SqFt\))?)/i,
    /(?:Lot|Land)\s*:?\s*([\d,.]+\s*(?:acres?|sq\.?\s*ft)?)/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractYearBuilt(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Year\s*Built|Built|Yr\s*Built)\s*:?\s*(1[89]\d{2}|20[0-2]\d)/i,
    /(?:Constructed|Construction\s*Year)\s*:?\s*(1[89]\d{2}|20[0-2]\d)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractDOM(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Days?\s*on\s*Market|DOM|CDOM|Days\s*Listed)\s*:?\s*(?:Property\s+has\s+been\s+on\s+the\s+market\s+for\s+a\s+total\s+of\s+)?(\d+)/i,
    /(?:Listing\s*Market\s*Time)\s*:?\s*(?:MLS#\s*has\s*been\s*on\s*for\s*)?(\d+)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractListDate(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:List(?:ing)?\s*Date|Listed|Date\s*Listed)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractTaxAmount(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /\bTax\s*:?\s*\$?([\d,]+)(?!\s*Year)/i,
    /(?:Annual\s*Tax|Tax\s*Amount)\s*:?\s*\$?([\d,]+)/i,
  ]);
  return result ? field(result.match.replace(/,/g, ''), 'high', result.evidence) : null;
}

function extractTaxYear(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /Tax\s*Year\s*:?\s*(\d{4})/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractAssessedValue(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Assessed|Assessment)\s*:?\s*\$?([\d,]+)/i,
  ]);
  return result ? field(result.match.replace(/,/g, ''), 'high', result.evidence) : null;
}

function extractHOAFee(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:HOA|Condo\s*Fee|Association\s*Fee|Assoc\.?\s*Fee)\s*:?\s*\$?([\d,]+)\s*(?:\/?\s*(?:mo(?:nth)?|yr|year|annual))?/i,
  ]);
  return result ? field(result.match.replace(/,/g, ''), 'medium', result.evidence) : null;
}

function extractHeating(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Heat\s*Zones?)\s*:?\s*(\d+\s+[^\n]{3,80})/i,
    /(?:Heat(?:ing)?|Heat\s*Type|Primary\s*Heat)\s*:?\s*([^\n]{3,80})/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractCooling(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Cool\s*Zones?)\s*:?\s*([^\n]{3,80})/i,
    /(?:Cool(?:ing)?|A\/C|Air\s*Condition(?:ing)?)\s*:?\s*([^\n]{3,50})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractParking(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Parking\s*Spaces?)\s*:?\s*([^\n]{3,80})/i,
    /(?:Park(?:ing)?|Garage)\s*:?\s*([^\n]{3,80})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractStyle(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Style|Arch(?:itectural)?\s*Style)\s*:?\s*(Colonial|Cape(?:\s*Cod)?|Ranch|Split[\s-]*Level|Victorian|Contemporary|Raised\s*Ranch|Garrison|Bungalow|Farmhouse|Tudor|Saltbox|Greek\s*Revival|Craftsman|Modern)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractCondition(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Condition|Property\s*Condition)\s*:?\s*(Excellent|Very\s*Good|Good|Fair|Poor|Average|Needs\s*Work|Updated|Renovated|Gut\s*Rehab)/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractRemarks(text: string): ExtractedField | null {
  // Try to grab the description block (long paragraph)
  const result = matchFirst(text, [
    /(?:Remarks?|Description|Agent\s*Remarks?|Public\s*Remarks?|Comments?)\s*:?\s*([^\n]{20,})/i,
  ]);
  if (result) {
    return field(result.match.substring(0, 500), 'high', result.evidence, 'remarks');
  }
  // Fallback: find "Welcome to" or long descriptive paragraph
  const welcomeMatch = text.match(/(Welcome\s+to\s+[^\n]{50,})/i);
  if (welcomeMatch) {
    return field(welcomeMatch[1].substring(0, 500), 'medium', welcomeMatch[0].substring(0, 200), 'remarks');
  }
  return null;
}

// --- New field extractors ---

function extractConstruction(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Construction)\s*:?\s*([^\n]{2,60})/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractFoundation(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Foundation\s*Description|Foundation)\s*:?\s*([^\n]{2,60})/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractSewer(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Sewer\s*(?:Utilities)?)\s*:?\s*([^\n]{2,60})/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractWater(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Water\s*Utilities)\s*:?\s*([^\n]{2,60})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractElectric(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Electric(?:al)?)\s*:?\s*([^\n]{2,60})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractAppliances(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Appliances?)\s*:?\s*([^\n]{3,200})/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractExteriorFeatures(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Exterior\s*Features?)\s*:?\s*([^\n]{2,120})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractFlooring(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Flooring)\s*:?\s*([^\n]{2,120})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractRoofMaterial(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Roof\s*Material|Roof)\s*:?\s*([^\n]{2,80})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractBasement(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Basement)\s*:?\s*([^\n]{1,60})/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractGarageSpaces(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Garage\s*Spaces?)\s*:?\s*(\d+)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractTotalRooms(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Total\s*Rooms?)\s*:?\s*(\d+)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

function extractSchools(text: string): ExtractedField | null {
  const parts: string[] = [];
  const grade = text.match(/(?:Grade\s*School|Elementary)\s*:?\s*([^\n]{3,60})/i);
  const middle = text.match(/(?:Middle\s*School)\s*:?\s*([^\n]{3,60})/i);
  const high = text.match(/(?:High\s*School)\s*:?\s*([^\n]{3,60})/i);
  if (grade?.[1]) parts.push(`Elementary: ${grade[1].trim()}`);
  if (middle?.[1]) parts.push(`Middle: ${middle[1].trim()}`);
  if (high?.[1]) parts.push(`High: ${high[1].trim()}`);
  if (parts.length === 0) return null;
  return field(parts.join('; '), 'high', parts[0], 'field');
}

function extractLotDescription(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Lot\s*Description)\s*:?\s*([^\n]{2,120})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractDisclosures(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Disclosures?)\s*:?\s*([^\n]{3,300})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractListingOffice(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Listing\s*Office)\s*:?\s*([^\n]{3,100})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractListingAgent(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Listing\s*Agent)\s*:?\s*([^\n]{3,80})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

function extractOriginalPrice(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Original\s*Price)\s*:?\s*\$?([\d,]+)/i,
  ]);
  return result ? field(result.match.replace(/,/g, ''), 'high', result.evidence) : null;
}

// Extract property intelligence factors from remarks and fields
function extractFactors(text: string, fields: Partial<MLSPINExtraction>): PropertyFactor[] {
  const factors: PropertyFactor[] = [];
  const lowerText = text.toLowerCase();
  const remarks = fields.remarks?.value?.toLowerCase() || '';
  const combinedText = lowerText + ' ' + remarks;

  // High HOA
  if (fields.hoaFee?.value) {
    const fee = parseInt(fields.hoaFee.value);
    if (fee > 500) {
      factors.push({
        label: 'High HOA/Condo Fee',
        weight: -1,
        explanation: `Monthly fee of $${fee} is above average and may deter budget-conscious buyers`,
        evidence: fields.hoaFee.evidence,
        confidence: 'high',
        source: 'field',
      });
    }
  }

  // Oil Heat
  if (/oil\s*(?:heat|furnace|boiler)/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}oil\s*(?:heat|furnace|boiler).{0,40}/i)?.[0] || 'Oil heating detected';
    factors.push({ label: 'Oil Heat', weight: -1, explanation: 'Oil heating systems are less desirable due to cost, environmental concerns, and maintenance', evidence, confidence: 'high', source: /oil/i.test(remarks) ? 'remarks' : 'field' });
  }

  // Septic System
  if (/septic/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}septic.{0,40}/i)?.[0] || 'Septic system detected';
    factors.push({ label: 'Septic System', weight: -0.5, explanation: 'Septic systems require maintenance and inspections, and may limit expansion', evidence, confidence: 'high', source: /septic/i.test(remarks) ? 'remarks' : 'field' });
  }

  // As-is Sale
  if (/as[\s-]*is/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}as[\s-]*is.{0,40}/i)?.[0] || 'As-is sale noted';
    factors.push({ label: 'As-Is Sale', weight: -1.5, explanation: 'Property sold as-is suggests known issues and limits negotiation leverage', evidence, confidence: 'high', source: 'remarks' });
  }

  // Busy Road
  if (/busy\s*(?:road|street|highway)|(?:route|rt)\s*\d+|highway|main\s*road/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}(?:busy|highway|main\s*road|route).{0,40}/i)?.[0] || 'Busy road location';
    factors.push({ label: 'Busy Road Location', weight: -1, explanation: 'Properties on busy roads typically see reduced demand and longer days on market', evidence, confidence: 'medium', source: 'remarks' });
  }

  // Needs Updates
  if (/needs?\s*(?:updating?|work|renovation|repair|improvement)|fixer[\s-]*upper|deferred\s*maintenance/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}(?:needs?\s*(?:updat|work|renov|repair)|fixer|deferred).{0,40}/i)?.[0] || 'Updates needed';
    factors.push({ label: 'Needs Updates', weight: -1, explanation: 'Property requires investment to bring to market standard', evidence, confidence: 'medium', source: 'remarks' });
  }

  // Renovated / Updated
  if (/(?:recently\s*)?(?:renovated|remodeled|updated|brand\s*new|gut\s*rehab|completely\s*redone)/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}(?:renovated|remodeled|updated|brand\s*new|gut\s*rehab).{0,40}/i)?.[0] || 'Recently updated';
    factors.push({ label: 'Recently Renovated', weight: 1.5, explanation: 'Updated properties command premium pricing and faster sales', evidence, confidence: 'medium', source: 'remarks' });
  }

  // Waterfront / Water Views
  if (/water(?:front|view)|ocean\s*view|lake(?:front)?|river(?:front)?|beach\s*(?:access|front)/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}(?:water|ocean|lake|river|beach).{0,40}/i)?.[0] || 'Water feature';
    factors.push({ label: 'Water Feature', weight: 2, explanation: 'Waterfront or water view properties command significant premiums', evidence, confidence: 'medium', source: 'remarks' });
  }

  // Central AC
  if (/central\s*(?:a\/?c|air)/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}central\s*(?:a\/?c|air).{0,40}/i)?.[0] || 'Central AC';
    factors.push({ label: 'Central Air Conditioning', weight: 0.5, explanation: 'Central AC is a desirable feature that increases appeal', evidence, confidence: 'high', source: /central/i.test(fields.cooling?.value || '') ? 'field' : 'remarks' });
  }

  // Window AC (less desirable)
  if (/window\s*(?:a\/?c|ac|unit)/i.test(combinedText) && !/central/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}window\s*(?:a\/?c|ac|unit).{0,40}/i)?.[0] || 'Window AC';
    factors.push({ label: 'Window AC Only', weight: -0.5, explanation: 'Window AC units are less efficient and desirable than central air', evidence, confidence: 'medium', source: 'field' });
  }

  // Slab Foundation (positive — no basement issues)
  if (/slab/i.test(fields.foundation?.value || '')) {
    factors.push({ label: 'Slab Foundation', weight: 0, explanation: 'Slab foundation — no basement flooding risk but no below-grade storage', evidence: fields.foundation?.evidence || 'Slab foundation', confidence: 'high', source: 'field' });
  }

  // No Basement
  if (fields.basement?.value?.toLowerCase() === 'no') {
    factors.push({ label: 'No Basement', weight: -0.5, explanation: 'No basement reduces total usable/storage space', evidence: 'Basement: No', confidence: 'high', source: 'field' });
  }

  // Fireplace
  if (/fireplace/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,30}fireplace.{0,30}/i)?.[0] || 'Fireplace detected';
    factors.push({ label: 'Fireplace', weight: 0.5, explanation: 'Fireplaces add character and perceived value', evidence, confidence: 'high', source: 'remarks' });
  }

  // Fenced yard
  if (/fenced|enclosed/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,30}(?:fenced|enclosed).{0,30}/i)?.[0] || 'Fenced yard';
    factors.push({ label: 'Fenced/Enclosed Yard', weight: 0.5, explanation: 'Fenced yards appeal to families and pet owners', evidence, confidence: 'medium', source: 'field' });
  }

  // Near schools
  if (/near\s*school|close\s*to\s*school|school\s*district/i.test(combinedText) || fields.schools?.value) {
    if (fields.schools?.value) {
      factors.push({ label: 'School District Info', weight: 0.5, explanation: 'School district information available — appeals to families', evidence: fields.schools.value.substring(0, 100), confidence: 'high', source: 'field' });
    }
  }

  // Lead Paint
  if (/lead\s*paint/i.test(combinedText)) {
    const leadMatch = combinedText.match(/.{0,30}lead\s*paint.{0,30}/i)?.[0] || '';
    if (/unknown/i.test(leadMatch)) {
      factors.push({ label: 'Lead Paint Unknown', weight: -0.5, explanation: 'Lead paint status unknown — may require testing for homes built before 1978', evidence: leadMatch, confidence: 'medium', source: 'field' });
    }
  }

  // Age factor
  if (fields.yearBuilt?.value) {
    const year = parseInt(fields.yearBuilt.value);
    const age = new Date().getFullYear() - year;
    if (age > 100) {
      factors.push({ label: 'Historic Property', weight: -0.5, explanation: `Built in ${year} (${age} years old). Historic properties may have higher maintenance costs and insurance requirements`, evidence: fields.yearBuilt.evidence, confidence: 'high', source: 'field' });
    } else if (age > 50 && age <= 100) {
      factors.push({ label: 'Older Home', weight: -0.25, explanation: `Built in ${year} (${age} years old). May need system updates (electrical, plumbing, HVAC)`, evidence: fields.yearBuilt.evidence, confidence: 'medium', source: 'field' });
    }
  }

  // High DOM
  if (fields.daysOnMarket?.value) {
    const dom = parseInt(fields.daysOnMarket.value);
    if (dom > 60) {
      factors.push({ label: 'Extended Days on Market', weight: -1, explanation: `${dom} days on market suggests pricing or condition issues`, evidence: fields.daysOnMarket.evidence, confidence: 'high', source: 'field' });
    } else if (dom <= 7) {
      factors.push({ label: 'New Listing', weight: 0.5, explanation: `Only ${dom} days on market — fresh listing with high initial interest expected`, evidence: fields.daysOnMarket.evidence, confidence: 'high', source: 'field' });
    }
  }

  // Price reduction
  if (fields.originalPrice?.value && fields.listPrice?.value) {
    const orig = parseInt(fields.originalPrice.value);
    const curr = parseInt(fields.listPrice.value);
    if (orig > curr) {
      const pctDrop = ((orig - curr) / orig * 100).toFixed(1);
      factors.push({ label: 'Price Reduced', weight: -0.5, explanation: `Price reduced ${pctDrop}% from $${orig.toLocaleString()} — may indicate weak demand or overpricing`, evidence: `Original: $${orig.toLocaleString()}, Current: $${curr.toLocaleString()}`, confidence: 'high', source: 'field' });
    }
  }

  // Tax-to-price ratio
  if (fields.taxAmount?.value && fields.listPrice?.value) {
    const tax = parseInt(fields.taxAmount.value);
    const price = parseInt(fields.listPrice.value);
    if (price > 0) {
      const ratio = (tax / price) * 100;
      if (ratio > 2) {
        factors.push({ label: 'High Property Tax', weight: -0.5, explanation: `Tax rate ~${ratio.toFixed(1)}% of list price ($${tax.toLocaleString()}/yr) is above average`, evidence: `Tax: $${tax.toLocaleString()}, Price: $${price.toLocaleString()}`, confidence: 'high', source: 'field' });
      }
    }
  }

  // Market History signals (re-listing, cancellation, cumulative DOM)
  if (fields.marketHistory && Array.isArray(fields.marketHistory)) {
    const historyEvents = fields.marketHistory as unknown as MarketHistoryEvent[];
    const listingCount = historyEvents.filter(e => e.action === 'Listed').length;
    const wasCanceled = historyEvents.some(e => e.action === 'Canceled' || e.action === 'Expired' || e.action === 'Withdrawn');
    const cdomEvent = historyEvents.find(e => e.action === 'CumulativeDom');
    const cdom = cdomEvent?.dom;
    const prices = historyEvents.filter(e => e.price && e.price > 0).map(e => e.price!);
    const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;

    if (listingCount > 1) {
      factors.push({
        label: 'Re-Listed Property',
        weight: -1.5,
        explanation: `This property has been listed ${listingCount} times${wasCanceled ? ' (previously canceled/withdrawn)' : ''}. Re-listings often indicate pricing issues or seller motivation to sell.`,
        evidence: `${listingCount} listing attempts found in market history`,
        confidence: 'high',
        source: 'field',
      });
    }

    if (wasCanceled && listingCount <= 1) {
      factors.push({
        label: 'Previously Canceled/Withdrawn',
        weight: -1,
        explanation: 'This listing was previously canceled or withdrawn, which may signal pricing challenges or changing seller circumstances.',
        evidence: 'Status change to Canceled/Withdrawn found in history',
        confidence: 'high',
        source: 'field',
      });
    }

    if (cdom && cdom > 60) {
      factors.push({
        label: 'High Cumulative DOM',
        weight: -1.5,
        explanation: `Total market exposure of ${cdom} days across all listings. Extended cumulative DOM strongly suggests seller motivation and negotiation opportunity.`,
        evidence: `Cumulative days on market: ${cdom}`,
        confidence: 'high',
        source: 'field',
      });
    }

    if (highestPrice > 0 && currentPrice > 0 && highestPrice > currentPrice) {
      const totalDrop = highestPrice - currentPrice;
      const pctDrop = ((totalDrop / highestPrice) * 100).toFixed(1);
      if (parseFloat(pctDrop) >= 3) {
        factors.push({
          label: 'Cumulative Price Drop',
          weight: -1,
          explanation: `Price has dropped ${pctDrop}% ($${totalDrop.toLocaleString()}) from highest listing of $${highestPrice.toLocaleString()} to current $${currentPrice.toLocaleString()}.`,
          evidence: `Original: $${highestPrice.toLocaleString()} → Current: $${currentPrice.toLocaleString()}`,
          confidence: 'high',
          source: 'field',
        });
      }
    }
  }

  return factors;
}

/**
 * Extract market history events from MLSPIN "Market History" table
 * Format: MLS# | Date | DOM | DTO | Price | Status/Action | Agent | $Price
 */
function extractMarketHistory(text: string): MarketHistoryEvent[] {
  const events: MarketHistoryEvent[] = [];
  
  // Pattern 1: "MLS#  Date  Listed for $XXX,XXX" or "Status Changed to: Canceled"
  // MLSPIN format: 7345874312/1/2025Listed for $729,000
  const listingPattern = /(\d{7,10})(\d{1,2}\/\d{1,2}\/\d{2,4})(?:.*?)Listed\s+for\s+\$?([\d,]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = listingPattern.exec(text)) !== null) {
    events.push({
      mlsNumber: m[1],
      date: m[2],
      action: 'Listed',
      price: parseInt(m[3].replace(/,/g, '')),
    });
  }

  // Pattern 2: Status changes (Canceled, Expired, Withdrawn, Pending, Sold)
  const statusPattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})(?:.*?)Status\s+Changed\s+to:\s*(Canceled|Cancelled|Expired|Withdrawn|Pending|Sold|Active)/gi;
  while ((m = statusPattern.exec(text)) !== null) {
    events.push({
      mlsNumber: '',
      date: m[1],
      action: m[2].replace('Cancelled', 'Canceled'),
      price: null,
    });
  }

  // Pattern 3: Price changes  
  const priceChangePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})(?:.*?)(?:Price\s+Changed?\s+to|New\s+Price)\s*:?\s*\$?([\d,]+)/gi;
  while ((m = priceChangePattern.exec(text)) !== null) {
    events.push({
      mlsNumber: '',
      date: m[1],
      action: 'Price Changed',
      price: parseInt(m[2].replace(/,/g, '')),
    });
  }

  // Pattern 4: Cumulative/total DOM from "Market History for this property XX"
  const cdomMatch = text.match(/Market\s+History\s+for\s+this\s+property\s*(\d+)/i);
  if (cdomMatch) {
    // Store as metadata - we'll use this to override cumulative DOM
    events.push({
      mlsNumber: 'CDOM',
      date: '',
      action: 'CumulativeDom',
      price: null,
      dom: parseInt(cdomMatch[1]),
    });
  }

  // Pattern 5: DOM/DTO values near MLS numbers  
  const domPattern = /(\d{7,10}).*?(\d{1,2}\/\d{1,2}\/\d{2,4}).*?(\d+)\s*(\d+)/g;
  // Try to attach DOM to existing events (best effort)

  // Sort by date
  events.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    const da = new Date(a.date);
    const db = new Date(b.date);
    return da.getTime() - db.getTime();
  });

  return events;
}

/**
 * Build ListingHistory summary from extracted events
 */
export function buildListingHistory(events: MarketHistoryEvent[]): import('@/types').ListingHistory | null {
  const realEvents = events.filter(e => e.action !== 'CumulativeDom');
  if (realEvents.length === 0) return null;

  const cdomEvent = events.find(e => e.action === 'CumulativeDom');
  const prices = realEvents.filter(e => e.price && e.price > 0).map(e => e.price!);
  const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
  const priceChanges = new Set(prices).size - 1;
  const wasCanceled = realEvents.some(e => e.action === 'Canceled' || e.action === 'Expired' || e.action === 'Withdrawn');
  const listingCount = realEvents.filter(e => e.action === 'Listed').length;
  const wasRelisted = listingCount > 1;

  return {
    events: realEvents,
    cumulativeDom: cdomEvent?.dom || 0,
    priceChanges: Math.max(0, priceChanges),
    wasRelisted,
    wasCanceled,
    totalPriceDrop: highestPrice - currentPrice,
    highestPrice,
    currentPrice,
  };
}

/**
 * Main extraction function — parses raw text from an MLSPIN PDF
 */
export function parseMLSPINText(rawText: string): MLSPINExtraction {
  const historyEvents = extractMarketHistory(rawText);

  const result: MLSPINExtraction = {
    mlsNumber: extractMLSNumber(rawText),
    listPrice: extractListPrice(rawText),
    address: extractAddress(rawText),
    city: extractCity(rawText),
    state: extractState(rawText),
    zip: extractZip(rawText),
    county: extractCounty(rawText),
    propertyType: extractPropertyType(rawText),
    bedrooms: extractBedrooms(rawText),
    bathsFull: extractBathsFull(rawText),
    bathsHalf: extractBathsHalf(rawText),
    squareFeet: extractSquareFeet(rawText),
    lotSize: extractLotSize(rawText),
    yearBuilt: extractYearBuilt(rawText),
    daysOnMarket: extractDOM(rawText),
    listDate: extractListDate(rawText),
    taxAmount: extractTaxAmount(rawText),
    taxYear: extractTaxYear(rawText),
    assessedValue: extractAssessedValue(rawText),
    hoaFee: extractHOAFee(rawText),
    heating: extractHeating(rawText),
    cooling: extractCooling(rawText),
    parking: extractParking(rawText),
    style: extractStyle(rawText),
    condition: extractCondition(rawText),
    remarks: extractRemarks(rawText),
    construction: extractConstruction(rawText),
    foundation: extractFoundation(rawText),
    sewer: extractSewer(rawText),
    water: extractWater(rawText),
    electric: extractElectric(rawText),
    appliances: extractAppliances(rawText),
    exteriorFeatures: extractExteriorFeatures(rawText),
    flooring: extractFlooring(rawText),
    roofMaterial: extractRoofMaterial(rawText),
    basement: extractBasement(rawText),
    garageSpaces: extractGarageSpaces(rawText),
    totalRooms: extractTotalRooms(rawText),
    schools: extractSchools(rawText),
    lotDescription: extractLotDescription(rawText),
    disclosures: extractDisclosures(rawText),
    listingOffice: extractListingOffice(rawText),
    listingAgent: extractListingAgent(rawText),
    originalPrice: extractOriginalPrice(rawText),
    marketHistory: historyEvents,
    factors: [],
  };

  result.factors = extractFactors(rawText, result);

  return result;
}

/**
 * Compute overall extraction confidence
 */
export function getExtractionConfidence(extraction: MLSPINExtraction): {
  level: 'High' | 'Moderate' | 'Low';
  fieldsExtracted: number;
  totalFields: number;
  highConfidenceCount: number;
} {
  const fieldKeys = Object.keys(extraction).filter(k => k !== 'factors') as (keyof Omit<MLSPINExtraction, 'factors'>)[];
  const totalFields = fieldKeys.length;
  let extracted = 0;
  let highConf = 0;

  for (const key of fieldKeys) {
    const f = extraction[key];
    if (f && typeof f === 'object' && 'value' in f && f.value) {
      extracted++;
      if (f.confidence === 'high') highConf++;
    }
  }

  const ratio = extracted / totalFields;
  const level = ratio >= 0.5 ? 'High' : ratio >= 0.3 ? 'Moderate' : 'Low';

  return { level, fieldsExtracted: extracted, totalFields, highConfidenceCount: highConf };
}
