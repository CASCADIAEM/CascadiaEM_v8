export interface SchemaField {
  fieldId: string;
  displayLabel: string;
  inputType: string;
  dataType: string;
  validation: string;
  apiPayloadKey: string;
  isUserDefined?: boolean;
}

export interface DropdownLookup {
  dropdownId: string;
  optionValue: string;
  displayText: string;
}

export interface IAPMission {
  missionId: string;
  incidentTypeLink: string;
  taskName: string;
  assignedGroup: string;
  sopSteps: string;
}

export interface FEMARate {
  contactIdLink: string;
  operatorName: string;
  eligibleCategory: string;
  standardRate: number;
  overtimeRate: number;
  standbyRate: number;
}

export interface FEMAEquipment {
  equipmentIdLink: string;
  equipmentName: string;
  eligibleCategory: string;
  femaRate: number;
  supportCosts: number;
}

/**
 * Parses a standard CSV line while respecting fields enclosed in double quotes.
 */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * General purpose parser for metadata field schemas.
 */
export const parseFieldSchema = (text: string): SchemaField[] => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  
  const fields: SchemaField[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length >= 6) {
      fields.push({
        fieldId: cols[0],
        displayLabel: cols[1],
        inputType: cols[2],
        dataType: cols[3],
        validation: cols[4],
        apiPayloadKey: cols[5]
      });
    }
  }
  return fields;
};

/**
 * Fetch and parse a form/screen metadata field schema.
 */
export const fetchFieldSchema = async (schemaName: string): Promise<SchemaField[]> => {
  try {
    const res = await fetch(`/schemas/${schemaName}.csv`);
    if (!res.ok) throw new Error(`Schema not found: ${schemaName}`);
    const text = await res.text();
    return parseFieldSchema(text);
  } catch (err) {
    console.error(`Failed to fetch schema: ${schemaName}`, err);
    return [];
  }
};

/**
 * Parses and fetches dropdown lookups configuration.
 */
export const fetchDropdownLookups = async (): Promise<DropdownLookup[]> => {
  try {
    const res = await fetch('/schemas/dropdown_lookups.csv');
    // If lookup file is missing, return empty or mock defaults
    if (!res.ok) return getDefaultLookups();
    
    const text = await res.text();
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const lookups: DropdownLookup[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      if (cols.length >= 3) {
        lookups.push({
          dropdownId: cols[0],
          optionValue: cols[1],
          displayText: cols[2]
        });
      }
    }
    return lookups;
  } catch (err) {
    console.error('Failed to fetch dropdown lookups, falling back to defaults.', err);
    return getDefaultLookups();
  }
};

/**
 * Static fallback lookups to ensure the system is operational even before spreadsheet edits
 */
function getDefaultLookups(): DropdownLookup[] {
  return [
    { dropdownId: 'incident_type', optionValue: 'wildfire', displayText: '🌲 Wildfire' },
    { dropdownId: 'incident_type', optionValue: 'earthquake', displayText: '🌋 Earthquake' },
    { dropdownId: 'incident_type', optionValue: 'flood', displayText: '🌊 Flooding / Water Rescue' },
    { dropdownId: 'incident_type', optionValue: 'hazmat', displayText: '🚨 HAZMAT Spill' },
    { dropdownId: 'incident_severity', optionValue: 'low', displayText: '🟢 Green (Routine / Monitoring)' },
    { dropdownId: 'incident_severity', optionValue: 'medium', displayText: '🟡 Amber (Elevated Response)' },
    { dropdownId: 'incident_severity', optionValue: 'high', displayText: '🔴 Red (Critical Emergency)' },
    { dropdownId: 'ics_period', optionValue: 'P1', displayText: 'Operational Period P1' },
    { dropdownId: 'ics_period', optionValue: 'P2', displayText: 'Operational Period P2' },
    { dropdownId: 'ics_period', optionValue: 'P3', displayText: 'Operational Period P3' },
    { dropdownId: 'ics_position', optionValue: 'Commander', displayText: 'Incident Commander' },
    { dropdownId: 'ics_position', optionValue: 'Logistics', displayText: 'Logistics Chief' },
    { dropdownId: 'ics_position', optionValue: 'Planning', displayText: 'Planning Section Chief' },
    { dropdownId: 'ics_position', optionValue: 'Ops', displayText: 'Operations Chief' },
    { dropdownId: 'unit_status', optionValue: 'active', displayText: '🟢 Active Duty' },
    { dropdownId: 'unit_status', optionValue: 'standby', displayText: '🟡 Standby Ready' },
    { dropdownId: 'unit_status', optionValue: 'released', displayText: '⚪ Released' }
  ];
}
