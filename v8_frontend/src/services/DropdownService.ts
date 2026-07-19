import { db } from './Firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';

export interface MissionType {
  key: string;
  label: string;
}

export interface MissionCategory {
  key: string;
  label: string;
  tagColor: string;
  dotColor: string;
  types: MissionType[];
}

export interface AlertTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'SMS' | 'EMAIL';
}

export interface Dropdowns {
  roster_status_options: string[];
  esf_designations: string[];
  approving_roles: string[];
  equipment_kinds: string[];
  facility_kinds: string[];
  personnel_kinds: string[];
  team_types: string[];
  sponsoring_agencies: string[];
  mission_categories: MissionCategory[];
  facility_types: string[];
  wa_counties: string[];
  alert_templates: AlertTemplate[];
  alert_recipient_groups: string[];
  wa_cities: string[];
}

export const DEFAULT_DROPDOWNS: Dropdowns = {
  roster_status_options: ['ACTIVE', 'STANDBY', 'INACTIVE'],
  esf_designations: [
    'ESF-1 (Transportation)',
    'ESF-2 (Communications)',
    'ESF-3 (Public Works)',
    'ESF-4 (Firefighting)',
    'ESF-5 (Emergency Management)',
    'ESF-6 (Mass Care & Shelter)',
    'ESF-7 (Resources & Logistics)',
    'ESF-8 (Public Health & Medical)',
    'ESF-10 (Hazardous Materials)',
    'ESF-13 (Public Safety & Security)'
  ],
  approving_roles: [
    'Incident Commander',
    'EOC Director',
    'Operations Section Chief',
    'Liaison Officer'
  ],
  equipment_kinds: ['AMBULANCE', 'SECURITY VEHICLE', 'BULLDOZER', 'COMMAND VEHICLE', 'WATER TENDER'],
  facility_kinds: ['MEDICAL TENT', 'MOBILE CLINIC', 'EVACUATION SHELTER', 'SUPPORT FACILITY'],
  personnel_kinds: ['MEDICAL STRIKE TEAM LEAD', 'WATCH OFFICER', 'LOGISTICS SPECIALIST', 'INCIDENT COMMANDER', 'INCIDENT RECON'],
  team_types: ['STRIKE TEAM', 'TASK FORCE', 'SECTOR GROUP', 'SUPPORT UNIT'],
  sponsoring_agencies: ['CASCADIA EM', 'CASCADIA LOG', 'LOCAL FIRE/EMS', 'MUTUAL AID'],
  mission_categories: [
    {
      key: 'event_support',
      label: 'Event Support',
      tagColor: 'text-teal-400 border-teal-500/20 bg-teal-500/5',
      dotColor: 'bg-teal-400',
      types: [
        { key: 'tribal_event', label: 'Tribal Event' },
        { key: 'parade', label: 'Parade' },
        { key: 'fair_festival', label: 'Fair | Festival' },
        { key: 'run_5k_10k', label: '5K | 10K Run' }
      ]
    },
    {
      key: 'exercise_drill',
      label: 'Exercise | Drill',
      tagColor: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
      dotColor: 'bg-blue-400',
      types: [
        { key: 'ert_exercise', label: 'ERT Exercise' },
        { key: 'cert_exercise', label: 'CERT Exercise' },
        { key: 'eoc_activation', label: 'EOC Activation' },
        { key: 'eoc_coop_drill', label: 'EOC COOP Drill' }
      ]
    },
    {
      key: 'natural_hazards',
      label: 'Natural Hazards',
      tagColor: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
      dotColor: 'bg-amber-500',
      types: [
        { key: 'wildfire', label: 'Wildfire' },
        { key: 'flood', label: 'Flood' },
        { key: 'earthquake', label: 'Earthquake' },
        { key: 'tsunami', label: 'Tsunami' },
        { key: 'volcano', label: 'Volcano' }
      ]
    },
    {
      key: 'man_made_hazards',
      label: 'Man Made Hazards',
      tagColor: 'text-red-400 border-red-500/20 bg-red-500/5',
      dotColor: 'bg-red-400',
      types: [
        { key: 'hazmat', label: 'Hazmat' },
        { key: 'civil_unrest', label: 'Civil Unrest' },
        { key: 'enemy_attack', label: 'Enemy Attack' }
      ]
    },
    {
      key: 'test_mission',
      label: 'Test Mission',
      tagColor: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
      dotColor: 'bg-emerald-400',
      types: [
        { key: 'ert_activation', label: 'ERT Activation' },
        { key: 'cert_activation', label: 'CERT Activation' },
        { key: 'eoc_activation', label: 'EOC Activation' },
        { key: 'coop_exercise', label: 'COOP Exercise' }
      ]
    }
  ],
  facility_types: [
    'Religious / Community Facility',
    'Government / Municipal Hall',
    'Educational Space (MOU)',
    'Commercial Warehouse'
  ],
  wa_counties: [
    'King County',
    'Snohomish County',
    'Pierce County',
    'Kitsap County'
  ],
  alert_templates: [
    {
      id: 'T-1',
      name: 'Logistics Warm Standby Notice',
      subject: 'LOGISTICS OPERATIONAL ALERT: WARM STAND-BY STAGE',
      body: 'ALERT: Bethel Church facility is placed on WARM STAND-BY. Verify access keys and physical safety checks are ready. Wait for formal activation instructions.',
      type: 'SMS'
    },
    {
      id: 'T-2',
      name: 'Active Emergency Shelter Order',
      subject: 'CRITICAL DISASTER NOTICE: ACTIVE SHELTER PROTOCOLS',
      body: 'CRITICAL DIRECTIVE: Open and staff all municipal shelter facilities. Deploy cots, activate auxiliary backup generators, and prepare to register arriving community members.',
      type: 'SMS'
    },
    {
      id: 'T-3',
      name: 'Training Exercise Briefing',
      subject: 'TRAINING & EXERCISE PROTOCOL: BRIEFING SCHEDULED',
      body: 'This is a test broadcast for training evaluation purposes. Exercise briefing will commence at 10:00 hours at the command outpost. Report attendance metrics.',
      type: 'EMAIL'
    }
  ],
  alert_recipient_groups: [
    'Primary Keyholders',
    'CERT Team Alpha',
    'All Operational Staff',
    'Tribal Council Leadership'
  ],
  wa_cities: [
    'Edmonds',
    'Seattle',
    'Everett',
    'Tacoma',
    'Bremerton',
    'Lynnwood'
  ]
};

class DropdownServiceManager {
  private currentDropdowns: Dropdowns = { ...DEFAULT_DROPDOWNS };
  private subscribers: Set<(data: Dropdowns) => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.loadFromCSV().then(() => {
      this.initFirestoreListener();
    });
  }

  private async loadFromCSV() {
    try {
      const res = await fetch('/schemas/dropdown_lookups.csv');
      if (!res.ok) {
        console.warn('⚠️ [LOG RECEIVED]: dropdown_lookups.csv not found, using compiled fallbacks.');
        return;
      }
      const text = await res.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      
      const rows: { dropdownId: string; optionValue: string; displayText: string }[] = [];
      const splitCSV = (line: string): string[] => {
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
      };

      for (let i = 1; i < lines.length; i++) {
        const cols = splitCSV(lines[i]);
        if (cols.length >= 3) {
          rows.push({
            dropdownId: cols[0],
            optionValue: cols[1],
            displayText: cols[2]
          });
        }
      }

      // Parse mission categories
      const categoryRows = rows.filter(r => r.dropdownId === 'incident_category');
      if (categoryRows.length > 0) {
        const dynamicCategories = categoryRows.map(catRow => {
          const catKey = catRow.optionValue;
          const typeRows = rows.filter(r => r.dropdownId === `${catKey}_type`);
          
          let tagColor = 'text-zinc-400 border-zinc-500/20 bg-zinc-500/5';
          let dotColor = 'bg-zinc-400';
          if (catKey === 'event_support') {
            tagColor = 'text-teal-400 border-teal-500/20 bg-teal-500/5';
            dotColor = 'bg-teal-400';
          } else if (catKey === 'exercise_drill') {
            tagColor = 'text-blue-400 border-blue-500/20 bg-blue-500/5';
            dotColor = 'bg-blue-400';
          } else if (catKey === 'natural_hazards') {
            tagColor = 'text-amber-500 border-amber-500/20 bg-amber-500/5';
            dotColor = 'bg-amber-500';
          } else if (catKey === 'man_made_hazards') {
            tagColor = 'text-red-400 border-red-500/20 bg-red-500/5';
            dotColor = 'bg-red-400';
          } else if (catKey === 'test_mission') {
            tagColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
            dotColor = 'bg-emerald-400';
          }

          return {
            key: catKey,
            label: catRow.displayText,
            tagColor,
            dotColor,
            types: typeRows.map(tr => ({
              key: tr.optionValue,
              label: tr.displayText
            }))
          };
        });

        this.currentDropdowns.mission_categories = dynamicCategories;
        console.log('📥 [CSV LOADED]: Successfully loaded and parsed mission categories from local CSV.');
        this.broadcast();
      }
    } catch (err) {
      console.error('🚨 Failed to parse local dropdown_lookups.csv:', err);
    }
  }

  private initFirestoreListener() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const dropdownDocRef = doc(db, 'app_settings', 'dropdowns');

    onSnapshot(dropdownDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('📥 [LOG RECEIVED]: Dropdowns successfully loaded from Firestore settings.');
        
        // Merge with defaults to prevent missing fields
        this.currentDropdowns = {
          roster_status_options: data.roster_status_options || DEFAULT_DROPDOWNS.roster_status_options,
          esf_designations: data.esf_designations || DEFAULT_DROPDOWNS.esf_designations,
          approving_roles: data.approving_roles || DEFAULT_DROPDOWNS.approving_roles,
          equipment_kinds: data.equipment_kinds || DEFAULT_DROPDOWNS.equipment_kinds,
          facility_kinds: data.facility_kinds || DEFAULT_DROPDOWNS.facility_kinds,
          personnel_kinds: data.personnel_kinds || DEFAULT_DROPDOWNS.personnel_kinds,
          team_types: data.team_types || DEFAULT_DROPDOWNS.team_types,
          sponsoring_agencies: data.sponsoring_agencies || DEFAULT_DROPDOWNS.sponsoring_agencies,
          facility_types: data.facility_types || DEFAULT_DROPDOWNS.facility_types,
          wa_counties: data.wa_counties || DEFAULT_DROPDOWNS.wa_counties,
          alert_templates: data.alert_templates || DEFAULT_DROPDOWNS.alert_templates,
          alert_recipient_groups: data.alert_recipient_groups || DEFAULT_DROPDOWNS.alert_recipient_groups,
          wa_cities: data.wa_cities || DEFAULT_DROPDOWNS.wa_cities,
          mission_categories: data.mission_categories || (this.currentDropdowns.mission_categories.length > 0 
            ? this.currentDropdowns.mission_categories 
            : DEFAULT_DROPDOWNS.mission_categories),
        };
      } else {
        console.warn('⚠️ [LOG RECEIVED]: No dropdown document found. Using offline defaults.');
        // If we have CSV categories, keep them
        const csvCategories = this.currentDropdowns.mission_categories;
        this.currentDropdowns = { ...DEFAULT_DROPDOWNS };
        if (csvCategories.length > 0) {
          this.currentDropdowns.mission_categories = csvCategories;
        }
      }
      this.broadcast();
    }, (error) => {
      console.error('🚨 [LOG RECEIVED]: Firestore dropdown subscription error. Running offline fallbacks:', error);
      const csvCategories = this.currentDropdowns.mission_categories;
      this.currentDropdowns = { ...DEFAULT_DROPDOWNS };
      if (csvCategories.length > 0) {
        this.currentDropdowns.mission_categories = csvCategories;
      }
      this.broadcast();
    });
  }

  public getDropdowns(): Dropdowns {
    return this.currentDropdowns;
  }

  public subscribe(callback: (data: Dropdowns) => void): () => void {
    this.subscribers.add(callback);
    // Trigger immediate execution with current cached values
    callback(this.currentDropdowns);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private broadcast() {
    this.subscribers.forEach((callback) => callback(this.currentDropdowns));
  }

  public async saveDropdowns(newDropdowns: Dropdowns): Promise<void> {
    // 1. Instantly update local memory cache & broadcast to React subscribers
    this.currentDropdowns = newDropdowns;
    this.broadcast();

    // 2. Attempt to publish to Firestore with a 2-second timeout to prevent hanging in offline environments
    const dropdownDocRef = doc(db, 'app_settings', 'dropdowns');
    try {
      await Promise.race([
        setDoc(dropdownDocRef, newDropdowns),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 2000))
      ]);
      console.log('✅ [SUCCESS]: Pulldown menu customizer settings successfully saved to Firestore.');
    } catch (err) {
      console.warn('⚠️ [OFFLINE FALLBACK]: Firestore write timed out or offline. Cached locally in memory:', err);
    }
  }
}

export const DropdownService = new DropdownServiceManager();

// React Hook to access and listen to dropdown changes in real-time
export const useDropdowns = () => {
  const [dropdowns, setDropdowns] = useState<Dropdowns>(DropdownService.getDropdowns());

  useEffect(() => {
    const unsubscribe = DropdownService.subscribe((data) => {
      setDropdowns({ ...data });
    });
    return unsubscribe;
  }, []);

  const saveDropdowns = async (updated: Dropdowns) => {
    await DropdownService.saveDropdowns(updated);
  };

  return { dropdowns, saveDropdowns };
};
