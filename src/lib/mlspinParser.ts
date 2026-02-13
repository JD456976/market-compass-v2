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
  evidence: string; // snippet of text where the value was found
  source: 'field' | 'remarks';
}

export interface MLSPINExtraction {
  mlsNumber: ExtractedField | null;
  listPrice: ExtractedField | null;
  address: ExtractedField | null;
  city: ExtractedField | null;
  state: ExtractedField | null;
  zip: ExtractedField | null;
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
  hoaFee: ExtractedField | null;
  heating: ExtractedField | null;
  cooling: ExtractedField | null;
  parking: ExtractedField | null;
  style: ExtractedField | null;
  condition: ExtractedField | null;
  remarks: ExtractedField | null;
  // Property intelligence factors
  factors: PropertyFactor[];
}

export interface PropertyFactor {
  label: string;
  weight: number; // -2 to +2
  explanation: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'field' | 'remarks';
}

// Helper to create an extracted field
function field(value: string, confidence: 'high' | 'medium' | 'low', evidence: string, source: 'field' | 'remarks' = 'field'): ExtractedField {
  return { value: value.trim(), confidence, evidence: evidence.trim().substring(0, 200), source };
}

// Generic pattern matcher that returns the first capture group
function matchFirst(text: string, patterns: RegExp[]): { match: string; evidence: string } | null {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      return { match: m[1].trim(), evidence: m[0].trim() };
    }
  }
  return null;
}

// Extract MLS Number
function extractMLSNumber(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /MLS\s*#?\s*:?\s*(\d{6,10})/i,
    /MLS\s+Number\s*:?\s*(\d{6,10})/i,
    /Listing\s*#?\s*:?\s*(\d{6,10})/i,
    /ML\s*#?\s*:?\s*(\d{6,10})/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

// Extract List Price
function extractListPrice(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /List\s*Price\s*:?\s*\$?([\d,]+)/i,
    /Asking\s*Price\s*:?\s*\$?([\d,]+)/i,
    /Price\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i,
    /LP\s*:?\s*\$?([\d,]+)/i,
  ]);
  return result ? field(result.match.replace(/,/g, ''), 'high', result.evidence) : null;
}

// Extract Address
function extractAddress(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Address|Street|Location)\s*:?\s*([\d]+\s+[\w\s.]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Blvd|Boulevard|Cir|Circle|Pl|Place|Ter|Terrace)[.,]?)/i,
    /^(\d+\s+\w[\w\s.]*(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Blvd|Boulevard)\.?)/im,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

// Extract City
function extractCity(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:City|Town)\s*:?\s*([A-Za-z\s]+?)(?:\s*,|\s+MA|\s+State)/i,
    /(?:Municipality)\s*:?\s*([A-Za-z\s]+?)(?:\s*,|\n)/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

// Extract State
function extractState(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /State\s*:?\s*([A-Z]{2})/i,
    /,\s*([A-Z]{2})\s+\d{5}/,
  ]);
  return result ? field(result.match.toUpperCase(), 'high', result.evidence) : null;
}

// Extract Zip
function extractZip(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Zip|Zip\s*Code|Postal)\s*:?\s*(\d{5}(?:-\d{4})?)/i,
    /[A-Z]{2}\s+(\d{5}(?:-\d{4})?)/,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

// Extract Property Type
function extractPropertyType(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Property\s*Type|Type|Style)\s*:?\s*(Single\s*Family|Condo(?:minium)?|Multi[\s-]*Family|Townhouse|Town\s*Home|Duplex|Triple[\s-]*Decker|Two[\s-]*Family|Three[\s-]*Family)/i,
    /(?:Res|Residential)\s*:?\s*(Single\s*Family|Condo|Multi[\s-]*Family)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

// Extract Bedrooms
function extractBedrooms(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Bed(?:room)?s?|BR|Bdrm)\s*:?\s*(\d+)/i,
    /(\d+)\s*(?:Bed(?:room)?s?|BR)/i,
    /Rooms?\s*:?\s*\d+.*?Bed(?:room)?s?\s*:?\s*(\d+)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

// Extract Full Baths
function extractBathsFull(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Full\s*Bath(?:room)?s?|Baths?\s*Full)\s*:?\s*(\d+)/i,
    /(\d+)\s*(?:Full\s*Bath)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

// Extract Half Baths
function extractBathsHalf(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Half\s*Bath(?:room)?s?|Baths?\s*Half)\s*:?\s*(\d+)/i,
    /(\d+)\s*(?:Half\s*Bath)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

// Extract Square Feet
function extractSquareFeet(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Sq\.?\s*(?:Ft|Feet|Footage)|Living\s*Area|Total\s*Area|Gross\s*Living)\s*:?\s*([\d,]+)/i,
    /([\d,]+)\s*(?:Sq\.?\s*(?:Ft|Feet)|SF)/i,
  ]);
  return result ? field(result.match.replace(/,/g, ''), 'high', result.evidence) : null;
}

// Extract Lot Size
function extractLotSize(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Lot\s*Size|Lot\s*Area|Land\s*Area)\s*:?\s*([\d,.]+\s*(?:acres?|sq\.?\s*ft|SF)?)/i,
    /(?:Lot|Land)\s*:?\s*([\d,.]+\s*(?:acres?|sq\.?\s*ft)?)/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

// Extract Year Built
function extractYearBuilt(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Year\s*Built|Built|Yr\s*Built)\s*:?\s*(1[89]\d{2}|20[0-2]\d)/i,
    /(?:Constructed|Construction\s*Year)\s*:?\s*(1[89]\d{2}|20[0-2]\d)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

// Extract Days on Market
function extractDOM(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Days?\s*on\s*Market|DOM|CDOM|Days\s*Listed)\s*:?\s*(\d+)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

// Extract List Date
function extractListDate(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:List\s*Date|Listed|Date\s*Listed)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

// Extract Tax Amount
function extractTaxAmount(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Tax(?:es)?|Annual\s*Tax|Tax\s*Amount)\s*:?\s*\$?([\d,]+)/i,
  ]);
  return result ? field(result.match.replace(/,/g, ''), 'medium', result.evidence) : null;
}

// Extract HOA Fee
function extractHOAFee(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:HOA|Condo\s*Fee|Association\s*Fee|Assoc\.?\s*Fee)\s*:?\s*\$?([\d,]+)\s*(?:\/?\s*(?:mo(?:nth)?|yr|year|annual))?/i,
  ]);
  return result ? field(result.match.replace(/,/g, ''), 'medium', result.evidence) : null;
}

// Extract Heating
function extractHeating(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Heat(?:ing)?|Heat\s*Type|Primary\s*Heat)\s*:?\s*([^\n,]{3,50})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

// Extract Cooling
function extractCooling(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Cool(?:ing)?|A\/C|Air\s*Condition(?:ing)?)\s*:?\s*([^\n,]{3,50})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

// Extract Parking
function extractParking(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Park(?:ing)?|Garage)\s*:?\s*([^\n]{3,80})/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

// Extract Style
function extractStyle(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Style|Arch(?:itectural)?\s*Style)\s*:?\s*(Colonial|Cape(?:\s*Cod)?|Ranch|Split[\s-]*Level|Victorian|Contemporary|Raised\s*Ranch|Garrison|Bungalow|Farmhouse|Tudor|Saltbox|Greek\s*Revival)/i,
  ]);
  return result ? field(result.match, 'high', result.evidence) : null;
}

// Extract Condition
function extractCondition(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Condition|Property\s*Condition)\s*:?\s*(Excellent|Very\s*Good|Good|Fair|Poor|Average|Needs\s*Work|Updated|Renovated|Gut\s*Rehab)/i,
  ]);
  return result ? field(result.match, 'medium', result.evidence) : null;
}

// Extract Remarks / Description
function extractRemarks(text: string): ExtractedField | null {
  const result = matchFirst(text, [
    /(?:Remarks?|Description|Agent\s*Remarks?|Public\s*Remarks?|Comments?)\s*:?\s*([^\n]{20,})/i,
  ]);
  if (result) {
    return field(result.match.substring(0, 500), 'high', result.evidence, 'remarks');
  }
  return null;
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
    factors.push({
      label: 'Oil Heat',
      weight: -1,
      explanation: 'Oil heating systems are less desirable due to cost, environmental concerns, and maintenance',
      evidence,
      confidence: 'high',
      source: /oil/i.test(remarks) ? 'remarks' : 'field',
    });
  }

  // Septic System
  if (/septic/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}septic.{0,40}/i)?.[0] || 'Septic system detected';
    factors.push({
      label: 'Septic System',
      weight: -0.5,
      explanation: 'Septic systems require maintenance and inspections, and may limit expansion',
      evidence,
      confidence: 'high',
      source: /septic/i.test(remarks) ? 'remarks' : 'field',
    });
  }

  // As-is Sale
  if (/as[\s-]*is/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}as[\s-]*is.{0,40}/i)?.[0] || 'As-is sale noted';
    factors.push({
      label: 'As-Is Sale',
      weight: -1.5,
      explanation: 'Property sold as-is suggests known issues and limits negotiation leverage',
      evidence,
      confidence: 'high',
      source: 'remarks',
    });
  }

  // Busy Road
  if (/busy\s*(?:road|street|highway)|(?:route|rt)\s*\d+|highway|main\s*road/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}(?:busy|highway|main\s*road|route).{0,40}/i)?.[0] || 'Busy road location';
    factors.push({
      label: 'Busy Road Location',
      weight: -1,
      explanation: 'Properties on busy roads typically see reduced demand and longer days on market',
      evidence,
      confidence: 'medium',
      source: 'remarks',
    });
  }

  // Needs Updates
  if (/needs?\s*(?:updating?|work|renovation|repair|improvement)|fixer[\s-]*upper|deferred\s*maintenance/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}(?:needs?\s*(?:updat|work|renov|repair)|fixer|deferred).{0,40}/i)?.[0] || 'Updates needed';
    factors.push({
      label: 'Needs Updates',
      weight: -1,
      explanation: 'Property requires investment to bring to market standard',
      evidence,
      confidence: 'medium',
      source: 'remarks',
    });
  }

  // Renovated / Updated
  if (/(?:recently\s*)?(?:renovated|remodeled|updated|brand\s*new|gut\s*rehab|completely\s*redone)/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}(?:renovated|remodeled|updated|brand\s*new|gut\s*rehab).{0,40}/i)?.[0] || 'Recently updated';
    factors.push({
      label: 'Recently Renovated',
      weight: 1.5,
      explanation: 'Updated properties command premium pricing and faster sales',
      evidence,
      confidence: 'medium',
      source: 'remarks',
    });
  }

  // Waterfront / Water Views
  if (/water(?:front|view)|ocean\s*view|lake(?:front)?|river(?:front)?|beach/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}(?:water|ocean|lake|river|beach).{0,40}/i)?.[0] || 'Water feature';
    factors.push({
      label: 'Water Feature',
      weight: 2,
      explanation: 'Waterfront or water view properties command significant premiums',
      evidence,
      confidence: 'medium',
      source: 'remarks',
    });
  }

  // Central AC
  if (/central\s*(?:a\/?c|air)/i.test(combinedText)) {
    const evidence = combinedText.match(/.{0,40}central\s*(?:a\/?c|air).{0,40}/i)?.[0] || 'Central AC';
    factors.push({
      label: 'Central Air Conditioning',
      weight: 0.5,
      explanation: 'Central AC is a desirable feature that increases appeal',
      evidence,
      confidence: 'high',
      source: /central/i.test(fields.cooling?.value || '') ? 'field' : 'remarks',
    });
  }

  // Age factor
  if (fields.yearBuilt?.value) {
    const year = parseInt(fields.yearBuilt.value);
    const age = new Date().getFullYear() - year;
    if (age > 100) {
      factors.push({
        label: 'Historic Property',
        weight: -0.5,
        explanation: `Built in ${year} (${age} years old). Historic properties may have higher maintenance costs and insurance requirements`,
        evidence: fields.yearBuilt.evidence,
        confidence: 'high',
        source: 'field',
      });
    }
  }

  // High DOM
  if (fields.daysOnMarket?.value) {
    const dom = parseInt(fields.daysOnMarket.value);
    if (dom > 60) {
      factors.push({
        label: 'Extended Days on Market',
        weight: -1,
        explanation: `${dom} days on market suggests pricing or condition issues`,
        evidence: fields.daysOnMarket.evidence,
        confidence: 'high',
        source: 'field',
      });
    } else if (dom <= 7) {
      factors.push({
        label: 'New Listing',
        weight: 0.5,
        explanation: `Only ${dom} days on market — fresh listing with high initial interest expected`,
        evidence: fields.daysOnMarket.evidence,
        confidence: 'high',
        source: 'field',
      });
    }
  }

  return factors;
}

/**
 * Main extraction function — parses raw text from an MLSPIN PDF
 */
export function parseMLSPINText(rawText: string): MLSPINExtraction {
  const result: MLSPINExtraction = {
    mlsNumber: extractMLSNumber(rawText),
    listPrice: extractListPrice(rawText),
    address: extractAddress(rawText),
    city: extractCity(rawText),
    state: extractState(rawText),
    zip: extractZip(rawText),
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
    hoaFee: extractHOAFee(rawText),
    heating: extractHeating(rawText),
    cooling: extractCooling(rawText),
    parking: extractParking(rawText),
    style: extractStyle(rawText),
    condition: extractCondition(rawText),
    remarks: extractRemarks(rawText),
    factors: [],
  };

  // Extract intelligence factors
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
  const level = ratio >= 0.6 ? 'High' : ratio >= 0.35 ? 'Moderate' : 'Low';

  return { level, fieldsExtracted: extracted, totalFields, highConfidenceCount: highConf };
}
