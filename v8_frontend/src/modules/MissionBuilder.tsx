import React, { useState, useEffect } from 'react';
import { dataBus } from '../services/DataBus';
import { 
  ClipboardCheck, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Edit2, 
  CheckCircle2, 
  FileText, 
  Printer,
  Sparkles
} from 'lucide-react';
import { db } from '../services/Firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { CanvaButton } from '../components/DesignSandbox';
import { useDropdowns } from '../services/DropdownService';
import { isAlertActiveOnDay } from '../utils/weatherCompiler';

// Custom Hooks & Sub-components
import { useIncidentWeather } from './MissionBuilder/hooks/useIncidentWeather';
import { Step1Scope } from './MissionBuilder/Step1Scope';
import { Step2Environment } from './MissionBuilder/Step2Environment';
import { Step3Staffing } from './MissionBuilder/Step3Staffing';
import { Step4Logistics } from './MissionBuilder/Step4Logistics';
import { Step5SOPs } from './MissionBuilder/Step5SOPs';
import { Step6Review } from './MissionBuilder/Step6Review';
import { ComplianceModal } from './MissionBuilder/ComplianceModal';

// Shared Interface Types matching existing schemas
interface Contact {
  id: string;
  name: string;
  role: string;
  esf: string;
  phone: string;
  email: string;
}

interface Facility {
  id: string;
  name: string;
  type: string;
  capacity: number;
}

// Baseline Initial Contacts (synced with Contact/Watch Center Lead)
const PRE_SEEDED_CONTACTS: Contact[] = [
  { id: '1', name: 'Michael Fearnehough', role: 'Watch Center Lead', esf: 'ESF-5 (Emergency Management)', phone: '(206) 786-5300', email: 'michael.b.fearnehough@gmail.com' },
  { id: '2', name: 'Lisa Jackson', role: 'Logistics Supervisor', esf: 'ESF-7 (Resources & Logistics)', phone: '(206) 555-0144', email: 'lisa.j@cascadia-em.com' },
  { id: '3', name: 'Tom Smith', role: 'Facilities Coordinator', esf: 'ESF-6 (Mass Care & Shelter)', phone: '(206) 555-0199', email: 'tom.smith@cascadia-em.com' }
];

// Baseline Support Facilities (synced with LogisticsFacilities)
const PRE_SEEDED_FACILITIES: Facility[] = [
  { id: 'FAC-1', name: 'Bethel Community Church', type: 'Religious / Community Facility', capacity: 75 },
  { id: 'FAC-2', name: 'Tribal Community Gymnasium', type: 'Government / Municipal Hall', capacity: 250 },
  { id: 'FAC-3', name: 'North High School Gym', type: 'Educational Space (MOU)', capacity: 400 }
];

// Incident classification properties mapping
interface IncidentClassificationData {
  title: string;
  defaultSop: string[];
  smartObjectives: string[];
  defaultWeather: string;
  defaultSafety: string;
}

const CLASSIFICATION_LIBRARY: Record<string, IncidentClassificationData> = {
  earthquake: {
    title: 'Seismic Incident / Earthquake',
    defaultSop: [
      'Conduct immediate structural safety sweep of EOC and command nodes.',
      'Establish primary communications bridge with State SEOC Warning Center.',
      'Request State-issued Disaster Mission Number for cost tracking.',
      'Deploy regional damage assessment teams to survey critical utility assets.',
      'Notify and dispatch standby volunteers to municipal shelter gymnasiums.'
    ],
    smartObjectives: [
      'Establish a fully functional EOC Command Base and verify satellite communication channels with State SEOC within 30 minutes of seismic detection.',
      'Deploy rapid-assessment field teams to survey structural integrity across all 5 key local facilities and register logs in active ledger within 2 hours.',
      'Open the Tribal Community Gymnasium shelter, register overnight cots, and verify keyholder standby statuses within 4 hours.'
    ],
    defaultWeather: 'Clear sky, low aftershock hazard. Temperature: 68°F. Wind: Calm.',
    defaultSafety: 'Full PPE required. Watch for structural cracks, loose masonry, and unstable overhangs. Ensure active buddy system is enforced.'
  },
  flood: {
    title: 'Severe Hydrological Flooding',
    defaultSop: [
      'Monitor live water level gauging and river gauges adjacent to lowlands.',
      'Establish emergency staging zones for sandbag and physical barriers deployment.',
      'Broadcast regional safety and voluntary evacuation alerts to low-lying properties.',
      'Identify backup sheltering resources with secondary high-ground layouts.',
      'Establish secure logistical shuttle pathways for non-ambulatory patrons.'
    ],
    smartObjectives: [
      'Deploy 10,000 sandbags to high-risk residential levees along lowland channels and establish monitoring points within 6 hours of flood warning.',
      'Notify and place North High School Gym on active standby shelter status and coordinate transportation assets for immediate shuttle operations within 3 hours.'
    ],
    defaultWeather: 'Heavy continuous rain, flood warnings active. Temperature: 52°F. Wind: SE 15-20 mph.',
    defaultSafety: 'Life jackets/PFDs required near water. Avoid crossing active water channels or walking through standing floodwaters. Watch for rapid current changes.'
  },
  wildfire: {
    title: 'Wildfire Incident / Forest Fire',
    defaultSop: [
      'Establish immediate perimeter coordination with State Department of Natural Resources.',
      'Pre-stage high-volume water tenders and heavy excavation equipment at tactical bases.',
      'Prepare evacuation notifications for residential properties adjacent to fire boundaries.',
      'Coordinate with regional air support and verify smoke clearance airspace safety.',
      'Deploy localized ambient air quality monitors near community shelter zones.'
    ],
    smartObjectives: [
      'Establish a unified field command post with municipal forestry officials and verify VHF communications within 45 minutes of fire dispatch.',
      'Erect containment lines around the primary EOC logistics facility and secure structural buffers within 3 hours.'
    ],
    defaultWeather: 'Dry, warm winds, low humidity. Temperature: 82°F. Wind: E 15-20 mph.',
    defaultSafety: 'Full wildland PPE and active respirator masks mandatory. Maintain clear safety zones and lookouts. Always verify two independent egress routes.'
  },
  tsunami: {
    title: 'Tsunami Evacuation & Emergency',
    defaultSop: [
      'Trigger immediate sirens and broadcast coastal evacuation alerts to low-lying sectors.',
      'Direct all field personnel and coastal patrols to immediately retreat to high ground.',
      'Coordinate high-ground evacuation staging and prepare watercraft rescue vessels.',
      'Monitor tide level telemetry and wave sensor feeds continuously.',
      'Establish communications bridge with Coast Guard and Pacific Tsunami Warning Center.'
    ],
    smartObjectives: [
      'Initiate sirens and verify 100% distribution of evacuation alerts to coastal residential areas within 15 minutes of warning.',
      'Secure 3 high-ground reception nodes with water, medical caches, and warming blankets within 60 minutes.'
    ],
    defaultWeather: 'Overcast, hazardous sea state warning. Temperature: 54°F. Wind: W 10-15 mph.',
    defaultSafety: 'Operate strictly above the 100-foot safety contour line. Do not re-enter the inundation zone until the official "All Clear" is authorized.'
  },
  volcano: {
    title: 'Volcanic Activity / Ashfall Emergency',
    defaultSop: [
      'Order immediate indoor sheltering for all active sectors to prevent ash inhalation.',
      'Verify backup generators intake filtration seals and pre-stage replacement air filters.',
      'Coordinate mudflow/lahar evacuation maps with local civil defense teams.',
      'Confirm potable water supply protection and cover auxiliary equipment reservoirs.',
      'Liaise with USGS Cascades Volcano Observatory for real-time seismic telemetry.'
    ],
    smartObjectives: [
      'Establish air filtration maintenance checks at all active shelters and replace EOC filters within 2 hours of ashfall onset.',
      'Verify the standby status of lahar evacuation sirens and coordinate emergency transport vehicles within 60 minutes.'
    ],
    defaultWeather: 'Ashfall advisory active, dense particle haze. Temperature: 62°F. Wind: NE 10 mph.',
    defaultSafety: 'High-impact N95 or PAPR respirators and sealed eye goggles mandatory for all outdoor movements. Limit mechanical operation to avoid engine ash damage.'
  },
  civil_unrest: {
    title: 'Civil Unrest / Local Security Incident',
    defaultSop: [
      'Secure EOC perimeter fencing and restrict access strictly to credentialed personnel.',
      'Liaise with local law enforcement and tribal police to monitor security corridors.',
      'De-escalate incident sites and route logistical transport away from protest zones.',
      'Enable secondary secure communications networks and standby backup command post.',
      'Maintain strict neutral stance and prioritize civilian safety and facility security.'
    ],
    smartObjectives: [
      'Secure all EOC ingress points, activate electronic access controls, and establish police liaison desk within 30 minutes.',
      'Re-route standard logistics delivery channels to designated alternative corridors within 2 hours.'
    ],
    defaultWeather: 'Clear night conditions. Temperature: 58°F. Wind: Calm.',
    defaultSafety: 'Maintain high situational awareness. Do not engage or self-deploy. Stay within secure facility perimeters and report all security breaches immediately.'
  },
  enemy_attack: {
    title: 'Enemy Attack / National Security Emergency',
    defaultSop: [
      'Activate immediate government continuity protocols and secure shelter zones.',
      'Switch EOC operations to fully enclosed, EMP-shielded, and subterranean layouts.',
      'Enable satellite and secure tactical radio systems; enforce strict comms discipline.',
      'Establish liaison desk with FEMA, National Guard, and Northern Command.',
      'Initiate critical infrastructure protection protocols for utilities and water reservoirs.'
    ],
    smartObjectives: [
      'Transition entire EOC command staff to hardened underground shelter and activate isolated generator power within 15 minutes.',
      'Establish redundant satellite communications bridge with State SEOC and federal agencies within 30 minutes.'
    ],
    defaultWeather: 'Overcast, low visibility. Temperature: 45°F. Wind: Calm.',
    defaultSafety: 'Enforce absolute blackout protocols at night. Shelter in place within structurally hardened bunkers. Monitor CBRN detectors continuously.'
  },
  hazmat: {
    title: 'Hazardous Materials Release',
    defaultSop: [
      'Establish warm and hot zone perimeters based on wind dispersion telemetry.',
      'Liaise with responding industrial or transport hazmat containment specialists.',
      'Order immediate downwind evacuation or shelter-in-place instructions for public.',
      'Stage decontamination trailers and specialized medical units at cold zone boundary.',
      'Monitor localized stormwater runoff to prevent toxic contamination of municipal reservoirs.'
    ],
    smartObjectives: [
      'Deploy dispersion plume sensors, map hot zone boundaries, and establish decontamination station within 60 minutes.',
      'Complete absolute evacuation of downwind sectors within 2 hours of toxic chemical release detection.'
    ],
    defaultWeather: 'Steady wind direction, clear visibility. Temperature: 65°F. Wind: NW 8 mph.',
    defaultSafety: 'Hazmat Level A/B suits mandatory inside hot and warm zones. Do not enter downwind plume without certified chemical protective gear. Enforce strict personal decontamination.'
  },
  severe_weather: {
    title: 'Severe Winter / Storm Event',
    defaultSop: [
      'Activate cold-weather sheltering agreements with partner churches.',
      'Pre-stage emergency backup generators and fuel cell reservoirs at command shelters.',
      'Deploy sand and snow plowing assets along primary emergency services transit lanes.',
      'Activate public warm-rehab shelter locations for homeless or vulnerable groups.',
      'Broadcast safety warnings on operational limits to all active patrol personnel.'
    ],
    smartObjectives: [
      'Open Bethel Community Church as an active warming center with operational warm meals, water, and power outlets within 2 hours of blizzard alert.',
      'Pre-stage commercial backup generators at EOC and critical shelters and confirm load testing by certified technicians within 4 hours.'
    ],
    defaultWeather: 'Blizzard conditions, active snow storm, extreme wind-chill. Temperature: 18°F (feels like 2°F). Wind: N 25-35 mph.',
    defaultSafety: 'Restrict cold exposure to 15-minute intervals. Watch for signs of hypothermia and frostbite. Ensure all backup diesel heaters are fully ventilated.'
  },
  search_and_rescue: {
    title: 'Search & Rescue (SAR) Incident',
    defaultSop: [
      'Establish SAR Unified Command Post at the last known location coordinates.',
      'Check in and register active rescue canine teams and volunteer CERT operators.',
      'Map topography and grid areas utilizing unified search coordinates.',
      'Confirm radio repeater connectivity across search valleys and blind spots.',
      'Ensure standby emergency medical assets are placed at incident Command Post.'
    ],
    smartObjectives: [
      'Establish a SAR Unified Command Post, map search grids 1-12, and distribute tactical handheld repeaters to 3 ground teams within 60 minutes.',
      'Conduct complete high-probability grid sweeps across sector Alpha and report findings back to Command center within 4 hours.'
    ],
    defaultWeather: 'Temperature dropping rapidly at night, moderate winds. Temperature: 42°F. Wind: W 10-15 mph.',
    defaultSafety: 'Check in every 30 minutes via GPS tracker. Ensure rescue teams operate strictly in buddy pairs with headlamps and cold-weather survival gear.'
  },
  planned_event: {
    title: 'Planned Event / Cultural Gathering',
    defaultSop: [
      'Verify parking layout, event egress, and crowd barrier configurations.',
      'Stage localized first-aid stations and assign volunteer safety coordinators.',
      'Review incident checklists with local municipal and joint fire representatives.',
      'Issue identification credentials and log active shifts on master roster.',
      'Distribute template alert alerts to key stakeholders and coordinators.'
    ],
    smartObjectives: [
      'Verify 100% of volunteer assignments, distribute credentials, and stage first-aid support assets at sector zones prior to event opening at 0800 hours.',
      'Conduct standard radio communication checks every 2 hours with security and medical liaisons and log active states on the ledger.'
    ],
    defaultWeather: 'Sunny conditions, high UV index. Temperature: 78°F. Wind: SW 5 mph.',
    defaultSafety: 'Ensure all hydration stations are fully stocked and accessible. Keep vehicle emergency access lanes clear at all times. Watch for heat stress.'
  },
  tribal_event: {
    title: 'Tribal Event / Gathering',
    defaultSop: [
      'Verify parking layout, event egress, and crowd barrier configurations.',
      'Stage localized first-aid stations and assign volunteer safety coordinators.',
      'Review incident checklists with local municipal and joint fire representatives.',
      'Issue identification credentials and log active shifts on master roster.',
      'Distribute template alert alerts to key stakeholders and coordinators.'
    ],
    smartObjectives: [
      'Verify 100% of volunteer assignments, distribute credentials, and stage first-aid support assets at sector zones prior to event opening at 0800 hours.',
      'Conduct standard radio communication checks every 2 hours with security and medical liaisons and log active states on the ledger.'
    ],
    defaultWeather: 'Partly cloudy, mild temperatures. Temperature: 70°F. Wind: W 5-10 mph.',
    defaultSafety: 'Monitor hydration. Ensure clear access paths for emergency vehicles. Coordinate shift logs with Tribal Liaison.'
  },
  ert_exercise: {
    title: 'ERT Exercise / Drill',
    defaultSop: [
      'Establish ERT radio command channel and verify volunteer frequencies.',
      'Initiate check-in logging for all responding drill participants.',
      'Simulate localized communication blackout and switch to backup HF frequencies.',
      'Verify emergency power transfer at the test shelter location.',
      'Conduct debriefing and assemble active-ledger drill records.'
    ],
    smartObjectives: [
      'Deploy volunteer teams to 3 test sectors and verify communication signal strength within 45 minutes of drill start.',
      'Successfully process simulated damage logs in the active ledger for 10 mock locations within 2 hours.'
    ],
    defaultWeather: 'Simulated adverse conditions. Live Weather: Overcast. Temperature: 58°F. Wind: N 10 mph.',
    defaultSafety: 'Safety first. Maintain awareness of actual non-drill hazards. Use "This is a Drill" prefix in all radio transmissions.'
  },
  high_heat: {
    title: 'High Heat / Extreme Warmth Advisory',
    defaultSop: [
      'Activate community hydration and cooling center networks.',
      'Deploy public safety advisories on heat exhaustion risks.',
      'Monitor power grid load and contact local utilities for status updates.',
      'Stage cold hydration stocks at all operational sector stations.',
      'Implement mandatory shift rotation for outdoor response staff.'
    ],
    smartObjectives: [
      'Establish and verify cooling shelter capacity and ice stocks at 2 municipal sites within 3 hours.',
      'Establish twice-hourly health checks for all deployed field personnel.'
    ],
    defaultWeather: 'Extreme heat warning active. Temperature: 104°F. Wind: Calm.',
    defaultSafety: 'Enforce 20-minute operational limits on outdoor work. Provide cold water and electrolyte drinks. Monitor for heat stroke signs.'
  },
  high_winds: {
    title: 'High Wind Event / Storm Advisory',
    defaultSop: [
      'Monitor falling trees, branches, and wind-blown debris hazards.',
      'Pre-stage emergency response chain-saw crews at strategic arterial roads.',
      'Identify localized electrical grid blackouts and coordinate backup generator operations.',
      'Ensure secure tie-downs on all temporary logistical field shelters.',
      'Deploy localized alerts warning residents to secure physical outdoor property.'
    ],
    smartObjectives: [
      'Mobilize and pre-stage emergency debris removal teams at north and south base stations within 90 minutes of high wind alert.',
      'Check in twice-hourly via tactical VHF repeaters with Snohomish County PUD electrical repair crews.'
    ],
    defaultWeather: 'High wind warnings active, dangerous gusts. Temperature: 48°F. Wind: S 30-45 mph (gusts up to 60 mph).',
    defaultSafety: 'Avoid working under mature tree canopies. Exercise extreme caution on high-profile response vehicles. Wear high-impact eye protection.'
  }
};

const DEFAULT_CLASSIFICATION_CATEGORIES = [
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
];

const MissionBuilder: React.FC = () => {
  const { dropdowns } = useDropdowns();
  const CLASSIFICATION_CATEGORIES = dropdowns?.mission_categories || DEFAULT_CLASSIFICATION_CATEGORIES;

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(() => {
    return dataBus.getCache<1 | 2 | 3 | 4 | 5 | 6>('mission_builder_step') || 1;
  });
  const [showComplianceModal, setShowComplianceModal] = useState<boolean>(false);
  const [isActivated, setIsActivated] = useState<boolean>(() => {
    return dataBus.getCache<boolean>('mission_builder_is_activated') || false;
  });
  const [isEditing, setIsEditing] = useState<boolean>(() => {
    return dataBus.getCache<boolean>('mission_builder_is_editing') || false;
  });

  // Dynamic Database-Driven Classification Library
  const [classificationLibrary, setClassificationLibrary] = useState<Record<string, IncidentClassificationData>>(CLASSIFICATION_LIBRARY);

  useEffect(() => {
    const loadAndSeedTemplates = async () => {
      try {
        console.log('📥 [FIRESTORE SYNC]: Fetching incident templates from database...');
        const querySnapshot = await getDocs(collection(db, 'incident_templates'));
        
        if (querySnapshot.empty) {
          console.log('⚠️ [FIRESTORE SYNC]: Database is empty. Seeding classification templates to Firestore...');
          const batch = writeBatch(db);
          
          Object.entries(CLASSIFICATION_LIBRARY).forEach(([key, value]) => {
            const docRef = doc(db, 'incident_templates', key);
            batch.set(docRef, value);
          });
          
          await batch.commit();
          console.log('✅ [FIRESTORE SYNC]: Successfully pre-seeded all classification templates to Firestore!');
          return;
        }

        const dbLibrary: Record<string, IncidentClassificationData> = {};
        querySnapshot.forEach((doc) => {
          dbLibrary[doc.id] = doc.data() as IncidentClassificationData;
        });

        console.log(`📥 [LOG RECEIVED]: Successfully loaded ${Object.keys(dbLibrary).length} incident templates from database.`);
        setClassificationLibrary(dbLibrary);
      } catch (err) {
        console.error('🚨 [FIRESTORE SYNC]: Error loading or seeding incident templates:', err);
      }
    };

    loadAndSeedTemplates();
  }, []);

  // STEP 1: Incident Scope States
  const [missionName, setMissionName] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_mission_name') || 'CASCADIA-EXERCISE-2026';
  });
  const [category, setCategory] = useState<'PLANNED' | 'TRAINING' | 'INCIDENT'>(() => {
    return dataBus.getCache<'PLANNED' | 'TRAINING' | 'INCIDENT'>('mission_builder_category') || 'PLANNED';
  });
  const [seocMissionNum, setSeocMissionNumber] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_seoc_mission_num') || 'WA-SEOC-26-0042';
  });
  const [classification, setClassification] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_classification') || 'tribal_event';
  });
  const [classCategory, setClassCategory] = useState<string>(() => {
    const cachedClass = dataBus.getCache<string>('mission_builder_classification') || 'tribal_event';
    const foundCategory = CLASSIFICATION_CATEGORIES.find(cat => 
      cat.types.some(t => t.key === cachedClass)
    );
    const initialCat = foundCategory ? foundCategory.key : 'event_support';
    return dataBus.getCache<string>('mission_builder_class_category') || initialCat;
  });
  const [opPeriodCode, setOpPeriodCode] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_op_period_code') || 'OP-01';
  });
  const [eventStartDate, setEventStartDate] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_event_start_date') || '2026-07-07';
  });
  const [eventStartTime, setEventStartTime] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_event_start_time') || '06:00';
  });
  const [eventEndDate, setEventEndDate] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_event_end_date') || '2026-07-07';
  });
  const [eventEndTime, setEventEndTime] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_event_end_time') || '18:00';
  });

  const [address, setAddress] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_address') || '';
  });
  const [city, setCity] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_city') || '';
  });
  const [county, setCounty] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_county') || '';
  });
  const [state, setState] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_state') || 'Washington';
  });

  const [zipCode, setZipCode] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_zip_code') || '98020';
  });

  // central meteorological compiler state managed by useIncidentWeather custom hook
  const initialForecastText = dataBus.getCache<string>('mission_builder_weather_forecast') || 
    (CLASSIFICATION_LIBRARY[classification]?.defaultWeather || '');
  const initialForecastArray = dataBus.getCache<any[]>('mission_builder_forecast') || [];
  const initialAlertsArray = dataBus.getCache<any[]>('mission_builder_alerts') || [];
  const initialCoords = dataBus.getCache<[number, number]>('mission_builder_coords') || [47.8107, -122.3774];
  const initialLastGeocoded = dataBus.getCache<string>('mission_builder_last_geocoded_location') || '';

  const {
    fetchingWeather,
    weatherForecast,
    missionForecast,
    missionAlerts,
    weatherCoords,
    setWeatherForecast,
    setMissionForecast,
    setMissionAlerts,
    handlePullWeatherByZip,
    handlePullWeatherByIncidentLocation
  } = useIncidentWeather(
    initialForecastText,
    initialForecastArray,
    initialAlertsArray,
    initialCoords,
    initialLastGeocoded
  );

  const [safetyMessage, setSafetyMessage] = useState<string>(() => {
    const cachedClass = dataBus.getCache<string>('mission_builder_classification') || 'earthquake';
    const defaultSafety = CLASSIFICATION_LIBRARY[cachedClass]?.defaultSafety || '';
    return dataBus.getCache<string>('mission_builder_safety_message') || defaultSafety;
  });

  // STEP 3: Who States (ICS Command Mapping)
  const [commanderId, setCommanderId] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_commander_id') || '1';
  });
  const [operationsId, setOperationsId] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_operations_id') || '2';
  });
  const [logisticsId, setLogisticsId] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_logistics_id') || '3';
  });
  const [safetyId, setSafetyId] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_safety_id') || '1';
  });
  const [pioId, setPIOId] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_pio_id') || '2';
  });

  // STEP 4: Where States (Facility Assignments)
  const [assignedFacilityIds, setAssignedFacilityIds] = useState<string[]>(() => {
    return dataBus.getCache<string[]>('mission_builder_assigned_facility_ids') || ['FAC-2'];
  });
  const [facilityInitialStates, setFacilityInitialStatuses] = useState<Record<string, 'COLD' | 'STANDBY' | 'ACTIVE'>>(() => {
    return dataBus.getCache<Record<string, 'COLD' | 'STANDBY' | 'ACTIVE'>>('mission_builder_facility_initial_states') || {
      'FAC-1': 'COLD',
      'FAC-2': 'STANDBY',
      'FAC-3': 'COLD'
    };
  });

  // STEP 5: How States (Objectives & SOP)
  const [objectives, setObjectives] = useState<string[]>(() => {
    return dataBus.getCache<string[]>('mission_builder_objectives') || [
      'Establish Unified Command and confirm secure radio channels with all responding units.'
    ];
  });
  const [newObjective, setNewObjective] = useState('');

  // Branding States
  const [agencyName, setAgencyName] = useState<string>(() => {
    return dataBus.getCache<string>('mission_builder_agency_name') || 'Cascadia Emergency Management';
  });
  const [agencyLogo, setAgencyLogo] = useState<string | null>(() => {
    return dataBus.getCache<string | null>('mission_builder_agency_logo') || null;
  });

  // Auto-Update Templates on Classification Change
  const handleClassificationTemplateSync = (newClass: string) => {
    const template = classificationLibrary[newClass] || CLASSIFICATION_LIBRARY[newClass];
    if (template) {
      setWeatherForecast(template.defaultWeather);
      setSafetyMessage(template.defaultSafety);
      setObjectives([...template.smartObjectives]);
    }
  };

  // Cache persistence side effect
  useEffect(() => {
    dataBus.setCache('mission_builder_step', step);
    dataBus.setCache('mission_builder_is_activated', isActivated);
    dataBus.setCache('mission_builder_is_editing', isEditing);
    dataBus.setCache('mission_builder_mission_name', missionName);
    dataBus.setCache('mission_builder_category', category);
    dataBus.setCache('mission_builder_seoc_mission_num', seocMissionNum);
    dataBus.setCache('mission_builder_classification', classification);
    dataBus.setCache('mission_builder_class_category', classCategory);
    dataBus.setCache('mission_builder_op_period_code', opPeriodCode);
    dataBus.setCache('mission_builder_event_start_date', eventStartDate);
    dataBus.setCache('mission_builder_event_start_time', eventStartTime);
    dataBus.setCache('mission_builder_event_end_date', eventEndDate);
    dataBus.setCache('mission_builder_event_end_time', eventEndTime);
    dataBus.setCache('mission_builder_address', address);
    dataBus.setCache('mission_builder_city', city);
    dataBus.setCache('mission_builder_county', county);
    dataBus.setCache('mission_builder_state', state);
    dataBus.setCache('mission_builder_zip_code', zipCode);
    dataBus.setCache('mission_builder_weather_forecast', weatherForecast);
    dataBus.setCache('mission_builder_safety_message', safetyMessage);
    dataBus.setCache('mission_builder_forecast', missionForecast);
    dataBus.setCache('mission_builder_alerts', missionAlerts);
    if (weatherCoords) {
      dataBus.setCache('mission_builder_coords', weatherCoords);
    }
    dataBus.setCache('mission_builder_commander_id', commanderId);
    dataBus.setCache('mission_builder_operations_id', operationsId);
    dataBus.setCache('mission_builder_logistics_id', logisticsId);
    dataBus.setCache('mission_builder_safety_id', safetyId);
    dataBus.setCache('mission_builder_pio_id', pioId);
    dataBus.setCache('mission_builder_assigned_facility_ids', assignedFacilityIds);
    dataBus.setCache('mission_builder_facility_initial_states', facilityInitialStates);
    dataBus.setCache('mission_builder_objectives', objectives);
    dataBus.setCache('mission_builder_agency_name', agencyName);
    dataBus.setCache('mission_builder_agency_logo', agencyLogo);
  }, [
    step, isActivated, isEditing, missionName, category, seocMissionNum,
    classification, classCategory, opPeriodCode, eventStartDate, eventStartTime,
    eventEndDate, eventEndTime, address, city, county, state, zipCode,
    weatherForecast, safetyMessage, missionForecast, missionAlerts, weatherCoords,
    commanderId, operationsId, logisticsId, safetyId, pioId,
    assignedFacilityIds, facilityInitialStates, objectives, agencyName, agencyLogo
  ]);

  // Stepper handlers
  const handleNext = () => {
    if (step < 6) setStep((step + 1) as any);
  };

  const handlePrev = () => {
    if (step > 1) setStep((step - 1) as any);
  };

  // Facility assignments updates
  const handleFacilityToggle = (id: string) => {
    setAssignedFacilityIds(prev => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter(fid => fid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleFacilityStateChange = (id: string, status: 'COLD' | 'STANDBY' | 'ACTIVE') => {
    setFacilityInitialStatuses(prev => ({
      ...prev,
      [id]: status
    }));
  };

  // Objectives updates
  const handleAddObjective = () => {
    if (!newObjective.trim()) return;
    setObjectives(prev => [...prev, newObjective.trim()]);
    setNewObjective('');
  };

  const handleRemoveObjective = (idx: number) => {
    setObjectives(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAdoptObjective = (obj: string) => {
    if (objectives.includes(obj)) return;
    setObjectives(prev => [...prev, obj]);
  };

  // Activate Mission Execution
  const handleActivateMission = () => {
    const activeClassData = classificationLibrary[classification] || CLASSIFICATION_LIBRARY[classification];
    const cmdName = PRE_SEEDED_CONTACTS.find(c => c.id === commanderId)?.name || 'N/A';
    
    // Broadcast parameters across Sentinel Pub/Sub Bus
    dataBus.broadcast({
      type: 'DISPATCH',
      origin: 'MISSION BUILDER',
      payload: {
        message: isEditing 
          ? `🚨 ACTIVE EOC COMMAND UPDATED: ${missionName} Under Mission Number [${seocMissionNum}] has been updated and is LIVE. Operational Period: ${opPeriodCode}.`
          : `🚨 ACTIVE EOC COMMAND ACTIVATED: ${missionName} Under Mission Number [${seocMissionNum}] is officially LIVE. Operational Period: ${opPeriodCode}.`,
        missionDetails: {
          name: missionName,
          category,
          missionNumber: seocMissionNum,
          classification: activeClassData.title,
          opPeriod: opPeriodCode,
          eventStartDate,
          eventStartTime,
          eventEndDate,
          eventEndTime,
          commandOfficer: cmdName,
          objectivesCount: objectives.length,
          facilityCount: assignedFacilityIds.length,
          agencyName,
          agencyLogo
        }
      },
      severity: 'high'
    });

    // Also broadcast associated standby/active messages for assigned facilities
    assignedFacilityIds.forEach(facilityId => {
      const facility = PRE_SEEDED_FACILITIES.find(f => f.id === facilityId);
      const startingStatus = facilityInitialStates[facilityId] || 'COLD';
      if (facility && startingStatus !== 'COLD') {
        dataBus.broadcast({
          type: 'LOGISTICS',
          origin: 'MISSION BUILDER',
          payload: {
            message: `Facility ${facility.name} auto-configured to starting state [${startingStatus}] for Mission ${missionName}.`,
            facilityStatus: startingStatus,
            facilityId: facilityId
          },
          severity: 'medium'
        });
      }
    });

    setIsActivated(true);
    setIsEditing(false); // Reset editing mode
  };

  const activeClassData = classificationLibrary[classification] || classificationLibrary.earthquake || CLASSIFICATION_LIBRARY.earthquake;
  const activeCategoryData = CLASSIFICATION_CATEGORIES.find(cat => cat.key === classCategory);

  return (
    <>
      {/* Screen View */}
      <div className="space-y-6 print:hidden">
      
        {/* Page Header */}
        <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase text-zinc-100 tracking-wider flex items-center gap-2 flex-wrap">
              <ClipboardCheck className="text-amber-500 h-8 w-auto" />
              Mission Setup
              {isEditing && (
                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-full uppercase ml-2 shadow-[0_0_10px_rgba(245,158,11,0.1)] flex items-center gap-1.5">
                  <Edit2 size={10} />
                  Modifying Active Plan
                </span>
              )}
            </h1>
            <p className="text-sm text-zinc-500 font-medium print:hidden">
              Pre-configure incidents, assign command teams, map logistics, and generate SMART objectives.
            </p>
          </div>

          {/* Custom Progress Steps Visual */}
          {!isActivated && (
            <div className="flex items-center gap-4 flex-wrap print:hidden">
              <CanvaButton 
                variant="secondary"
                onClick={() => setShowComplianceModal(true)}
                className="px-3.5 py-1.5 text-[10px] uppercase font-black tracking-wider text-amber-500 border-amber-500/20 hover:bg-amber-500/10 flex items-center gap-1.5 cursor-pointer h-9 rounded-lg"
              >
                <ClipboardCheck size={14} className="text-amber-500 animate-pulse" />
                Compliance Preview
              </CanvaButton>

              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-900 px-4 py-2.5 rounded-xl font-mono text-[10px] font-black text-zinc-400">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <React.Fragment key={s}>
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center border ${
                      step === s 
                        ? 'bg-amber-500 border-amber-500 text-black font-extrabold shadow-[0_0_10px_rgba(245,158,11,0.25)]' 
                        : step > s 
                        ? 'bg-zinc-800 border-zinc-800 text-zinc-300' 
                        : 'border-zinc-800 text-zinc-600'
                    }`}>
                      {s}
                    </span>
                    {s < 6 && <span className="text-zinc-800">·</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {isActivated ? (
          /* SUCCESS SUMMARY COMPONENT */
          <div className="space-y-6">
            <div className="glass-card p-8 border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.06)] space-y-6 text-center">
              <div className="h-16 w-16 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-zinc-100 uppercase tracking-wider">Mission Command Initialized</h2>
                <p className="text-xs font-mono font-bold text-green-500 tracking-wider uppercase">
                  ✅ Operational Status [ACTIVE] · {seocMissionNum} Deployed
                </p>
              </div>

              <p className="text-sm text-zinc-400 font-medium max-w-xl mx-auto leading-relaxed">
                Your EOC Mission profile is officially registered on the Sentinel active ledger. Pre-seeded logs have been broadcast to corresponding Dashboard registers. Standard operational alerts are prepared for deployment.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <CanvaButton 
                  variant="primary"
                  onClick={() => {
                    setIsEditing(true);
                    setIsActivated(false);
                    setStep(1);
                  }}
                  className="px-8 py-3.5 text-xs tracking-wider"
                >
                  <Edit2 size={14} className="mr-2" />
                  Modify Current Plan
                </CanvaButton>

                <CanvaButton 
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setIsActivated(false);
                    setStep(1);
                    setMissionName('CASCADIA-EXERCISE-2026');
                    setCategory('TRAINING');
                    setSeocMissionNumber('WA-SEOC-26-0042');
                    setClassification('earthquake');
                    setOpPeriodCode('OP-01');
                    setCommanderId('1');
                    setOperationsId('2');
                    setLogisticsId('3');
                    setSafetyId('1');
                    setPIOId('2');
                    setAssignedFacilityIds(['FAC-2']);
                    setFacilityInitialStatuses({
                      'FAC-1': 'COLD',
                      'FAC-2': 'STANDBY',
                      'FAC-3': 'COLD'
                    });
                    setObjectives(['Establish Unified Command and confirm secure radio channels with all responding units.']);
                    setWeatherForecast((classificationLibrary.earthquake || CLASSIFICATION_LIBRARY.earthquake).defaultWeather);
                    setSafetyMessage((classificationLibrary.earthquake || CLASSIFICATION_LIBRARY.earthquake).defaultSafety);
                    setAgencyName('Cascadia Emergency Management');
                    setAgencyLogo(null);
                    setAddress('');
                    setCity('');
                    setCounty('');
                    setState('Washington');
                    setZipCode('98020');
                  }} 
                  className="px-8 py-3.5 text-xs tracking-wider"
                >
                  Configure New Mission Profile
                </CanvaButton>
              </div>
            </div>

            {/* ICS-201 BRIEFING COMPRESSED CARD */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-amber-500" />
                  <h3 className="text-sm font-extrabold uppercase text-zinc-100 tracking-wider">Live ICS-201 Incident Brief Records</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold text-amber-500 uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer print:hidden"
                >
                  <Printer size={14} />
                  Print Final Compliance Report
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-xs leading-normal">
                <div>
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block">Mission Name</span>
                  <span className="font-extrabold text-zinc-200">{missionName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block">SEOC Mission ID</span>
                  <span className="font-mono font-bold text-amber-500">{seocMissionNum}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block">Incident Classification</span>
                  <span className="font-extrabold text-zinc-200">{activeClassData.title}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block">Operational Period</span>
                  <span className="font-extrabold text-zinc-200">{opPeriodCode}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block">Event Start</span>
                  <span className="font-mono font-bold text-zinc-200">{eventStartDate} {eventStartTime}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide block">Event Stop</span>
                  <span className="font-mono font-bold text-zinc-200">{eventEndDate} {eventEndTime}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STEPPERS MULTI-CARD PANEL */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Main Stepper Card (Step Content) */}
            <div className={`glass-card p-6 space-y-6 ${step === 5 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              
              {/* Step 1 Component */}
              {step === 1 && (
                <Step1Scope
                  missionName={missionName}
                  setMissionName={setMissionName}
                  setCategory={setCategory}
                  seocMissionNum={seocMissionNum}
                  setSeocMissionNumber={setSeocMissionNumber}
                  classification={classification}
                  setClassification={(newClass) => {
                    setClassification(newClass);
                    handleClassificationTemplateSync(newClass);
                  }}
                  classCategory={classCategory}
                  setClassCategory={setClassCategory}
                  opPeriodCode={opPeriodCode}
                  setOpPeriodCode={setOpPeriodCode}
                  eventStartDate={eventStartDate}
                  setEventStartDate={setEventStartDate}
                  eventStartTime={eventStartTime}
                  setEventStartTime={setEventStartTime}
                  eventEndDate={eventEndDate}
                  setEventEndDate={setEventEndDate}
                  eventEndTime={eventEndTime}
                  setEventEndTime={setEventEndTime}
                  address={address}
                  setAddress={setAddress}
                  city={city}
                  setCity={setCity}
                  county={county}
                  setCounty={setCounty}
                  state={state}
                  setState={setState}
                  zipCode={zipCode}
                  setZipCode={setZipCode}
                  setWeatherForecast={setWeatherForecast}
                  setSafetyMessage={setSafetyMessage}
                  classificationLibrary={classificationLibrary}
                  activeCategoryData={activeCategoryData}
                  classificationCategories={CLASSIFICATION_CATEGORIES}
                />
              )}

              {/* Step 2 Component */}
              {step === 2 && (
                <Step2Environment
                  fetchingWeather={fetchingWeather}
                  zipCode={zipCode}
                  setZipCode={setZipCode}
                  weatherForecast={weatherForecast}
                  setWeatherForecast={setWeatherForecast}
                  safetyMessage={safetyMessage}
                  setSafetyMessage={setSafetyMessage}
                  missionForecast={missionForecast}
                  setMissionForecast={setMissionForecast}
                  missionAlerts={missionAlerts}
                  setMissionAlerts={setMissionAlerts}
                  weatherCoords={weatherCoords}
                  handlePullWeatherByZip={handlePullWeatherByZip}
                  handlePullWeatherByIncidentLocation={() => handlePullWeatherByIncidentLocation(address, city, county, state, zipCode)}
                  agencyName={agencyName}
                  setAgencyName={setAgencyName}
                  agencyLogo={agencyLogo}
                  setAgencyLogo={setAgencyLogo}
                />
              )}

              {/* Step 3 Component */}
              {step === 3 && (
                <Step3Staffing
                  commanderId={commanderId}
                  setCommanderId={setCommanderId}
                  operationsId={operationsId}
                  setOperationsId={setOperationsId}
                  logisticsId={logisticsId}
                  setLogisticsId={setLogisticsId}
                  safetyId={safetyId}
                  setSafetyId={setSafetyId}
                  pioId={pioId}
                  setPIOId={setPIOId}
                  contacts={PRE_SEEDED_CONTACTS}
                />
              )}

              {/* Step 4 Component */}
              {step === 4 && (
                <Step4Logistics
                  facilities={PRE_SEEDED_FACILITIES}
                  assignedFacilityIds={assignedFacilityIds}
                  facilityInitialStates={facilityInitialStates}
                  handleFacilityToggle={handleFacilityToggle}
                  handleFacilityStateChange={handleFacilityStateChange}
                />
              )}

              {/* Step 5 Component */}
              {step === 5 && (
                <Step5SOPs
                  activeClassData={activeClassData}
                  objectives={objectives}
                  newObjective={newObjective}
                  setNewObjective={setNewObjective}
                  handleAddObjective={handleAddObjective}
                  handleRemoveObjective={handleRemoveObjective}
                />
              )}

              {/* Step 6 Component */}
              {step === 6 && (
                <Step6Review
                  missionName={missionName}
                  seocMissionNum={seocMissionNum}
                  opPeriodCode={opPeriodCode}
                  activeClassData={activeClassData}
                  eventStartDate={eventStartDate}
                  eventStartTime={eventStartTime}
                  eventEndDate={eventEndDate}
                  eventEndTime={eventEndTime}
                  address={address}
                  city={city}
                  county={county}
                  state={state}
                  weatherForecast={weatherForecast}
                  safetyMessage={safetyMessage}
                  commanderId={commanderId}
                  operationsId={operationsId}
                  logisticsId={logisticsId}
                  assignedFacilityIds={assignedFacilityIds}
                  facilityInitialStates={facilityInitialStates}
                  objectives={objectives}
                  contacts={PRE_SEEDED_CONTACTS}
                  facilities={PRE_SEEDED_FACILITIES}
                />
              )}

              {/* Stepper Navigation Footers */}
              <div className="flex items-center justify-between border-t border-zinc-900 pt-4 mt-6 print:hidden">
                <button 
                  type="button"
                  onClick={handlePrev} 
                  disabled={step === 1}
                  className={`eoc-button ${step === 1 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <ChevronLeft size={16} />
                  Back
                </button>

                {step === 6 ? (
                  isEditing ? (
                    <button 
                      type="button"
                      onClick={handleActivateMission}
                      className="eoc-button-primary bg-amber-500 hover:bg-amber-600 border-amber-400 text-black px-6 shadow-[0_0_15px_rgba(245,158,11,0.15)] select-none cursor-pointer"
                    >
                      <Check size={16} />
                      COMMIT PLAN UPDATES
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={handleActivateMission}
                      className="eoc-button-primary bg-green-500 hover:bg-green-600 border-green-400 text-black px-6 shadow-[0_0_15px_rgba(34,197,94,0.15)] select-none cursor-pointer"
                    >
                      <Check size={16} />
                      ACTIVATE EOC CORE
                    </button>
                  )
                ) : (
                  <button 
                    type="button"
                    onClick={handleNext} 
                    className="eoc-button-primary px-6"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>

            </div>

            {/* Step 5 Right-Side Panel Stack */}
            {step === 5 && (
              <div className="space-y-6 w-full md:w-[350px] shrink-0">
                
                {/* SMART Objective Advisor */}
                <div className="glass-card p-5 space-y-4 border-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.03)] select-none">
                  <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                    <Sparkles size={16} className="text-amber-500" />
                    <h3 className="text-xs font-black uppercase text-zinc-100 tracking-wider">SMART Objective Advisor</h3>
                  </div>
                  
                  <p className="text-[10px] text-zinc-500 font-bold leading-normal uppercase">
                    ⚡ SELECT ADVISOR TEMPLATES TO INJECT COMPLIANT SMART OBJECTIVES INSTANTLY:
                  </p>

                  <div className="space-y-3 pt-1 max-h-[350px] overflow-y-auto pr-1">
                    {activeClassData.smartObjectives.map((obj, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 bg-[#0a0a0c]/60 border border-zinc-900 rounded-xl space-y-2.5 flex flex-col justify-between"
                      >
                        <p className="text-[11px] font-bold text-zinc-300 leading-normal">
                          "{obj}"
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAdoptObjective(obj)}
                          className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-500 rounded-md text-[9px] font-extrabold uppercase tracking-wider text-center transition-all cursor-pointer"
                        >
                          + Adopt Objective
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* Centered Compliance Modal */}
      <ComplianceModal
        showComplianceModal={showComplianceModal}
        setShowComplianceModal={setShowComplianceModal}
        missionName={missionName}
        seocMissionNum={seocMissionNum}
        opPeriodCode={opPeriodCode}
        classification={classification}
        classCategory={classCategory}
        eventStartDate={eventStartDate}
        eventStartTime={eventStartTime}
        eventEndDate={eventEndDate}
        eventEndTime={eventEndTime}
        address={address}
        city={city}
        county={county}
        state={state}
        weatherForecast={weatherForecast}
        safetyMessage={safetyMessage}
        agencyName={agencyName}
        agencyLogo={agencyLogo}
        commanderId={commanderId}
        operationsId={operationsId}
        logisticsId={logisticsId}
        assignedFacilityIds={assignedFacilityIds}
        facilityInitialStates={facilityInitialStates}
        objectives={objectives}
        contacts={PRE_SEEDED_CONTACTS}
        facilities={PRE_SEEDED_FACILITIES}
        activeClassData={activeClassData}
        activeCategoryData={activeCategoryData}
      />

      {/* Printable High-Contrast ICS-201 Layout (ONLY Visible on Print) */}
      <div className="hidden print:block bg-white text-black p-4 font-sans text-[10px] leading-relaxed space-y-4 max-w-[8.5in] mx-auto">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
              font-family: 'Arial', 'Helvetica', sans-serif !important;
            }
            .print-border-all {
              border: 1px solid black !important;
            }
            .print-border-b {
              border-bottom: 1px solid black !important;
            }
            .print-border-r {
              border-right: 1px solid black !important;
            }
            .print-grid-cols-4 {
              display: grid !important;
              grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            }
            .print-grid-cols-3 {
              display: grid !important;
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            }
            .print-grid-cols-2 {
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
        `}} />

        {/* Master Print Header Section */}
        <div className="border-[3px] border-black p-4 flex justify-between items-center bg-white text-black">
          <div className="flex items-center gap-4">
            <img 
              src="/assets/logo/cem_logo.png" 
              alt="Cascadia EM Logo" 
              className="h-12 w-auto object-contain"
              onError={e => (e.target as any).style.display = 'none'} 
            />
            <div>
              <div className="text-[10px] font-black tracking-widest text-zinc-800">CASCADIA EMERGENCY MANAGEMENT</div>
              <h1 className="text-xl font-black uppercase tracking-wide mt-0.5">MISSION PLAN</h1>
              <div className="text-[8px] font-mono font-bold text-zinc-500 mt-1 uppercase">
                GENERATED: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} · SECURE ACTIVE LEDGER RECORD
              </div>
            </div>
          </div>
          <div className="border-l-2 border-black pl-4 text-right">
            <div className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-wider">MISSION ID</div>
            <div className="text-lg font-black font-mono tracking-tight text-zinc-900">{seocMissionNum}</div>
          </div>
        </div>

        {/* SECTION 1: MISSION PROFILE & SCOPE */}
        <div className="border-2 border-black rounded overflow-hidden">
          <div className="bg-zinc-100 px-3 py-1 font-black text-[9px] border-b-2 border-black uppercase tracking-wider">
            SECTION 1: MISSION PROFILE & SCOPE
          </div>
          <div className="grid grid-cols-4 divide-x divide-black text-left text-[9px] font-bold">
            <div className="p-2.5">
              <div className="text-[8px] font-black text-zinc-500 uppercase">MISSION CODE NAME</div>
              <div className="font-extrabold text-[11px] mt-0.5 uppercase text-zinc-900">{missionName}</div>
            </div>
            <div className="p-2.5">
              <div className="text-[8px] font-black text-zinc-500 uppercase">MISSION CATEGORY</div>
              <div className="font-extrabold text-[11px] mt-0.5 uppercase text-zinc-900">{category}</div>
            </div>
            <div className="p-2.5">
              <div className="text-[8px] font-black text-zinc-500 uppercase">INCIDENT SOP CLASSIFICATION</div>
              <div className="font-extrabold text-[11px] mt-0.5 text-zinc-900">{activeClassData?.title}</div>
            </div>
            <div className="p-2.5">
              <div className="text-[8px] font-black text-zinc-500 uppercase">OPERATIONAL PERIOD</div>
              <div className="font-extrabold text-[11px] mt-0.5 text-zinc-900">{opPeriodCode}</div>
            </div>
          </div>
        </div>

        {/* SECTION 2: NIMS COMMAND STRUCTURE (ICS) */}
        <div className="border-2 border-black rounded overflow-hidden">
          <div className="bg-zinc-100 px-3 py-1 font-black text-[9px] border-b-2 border-black uppercase tracking-wider">
            SECTION 2: NIMS COMMAND STRUCTURE (ICS)
          </div>
          <div className="grid grid-cols-3 divide-x divide-black text-left text-[9px] font-bold border-b border-black">
            <div className="p-2.5">
              <div className="text-[8px] font-black text-zinc-500 uppercase">INCIDENT COMMANDER (IC)</div>
              <div className="font-extrabold text-[10px] mt-0.5 text-zinc-900">
                {PRE_SEEDED_CONTACTS.find(c => c.id === commanderId)?.name || 'Unassigned'}
              </div>
              <div className="font-mono text-[8px] text-zinc-500 mt-0.5">
                {PRE_SEEDED_CONTACTS.find(c => c.id === commanderId)?.phone}
              </div>
            </div>
            <div className="p-2.5">
              <div className="text-[8px] font-black text-zinc-500 uppercase">OPERATIONS SECTION CHIEF</div>
              <div className="font-extrabold text-[10px] mt-0.5 text-zinc-900">
                {PRE_SEEDED_CONTACTS.find(c => c.id === operationsId)?.name || 'Unassigned'}
              </div>
              <div className="font-mono text-[8px] text-zinc-500 mt-0.5">
                {PRE_SEEDED_CONTACTS.find(c => c.id === operationsId)?.phone}
              </div>
            </div>
            <div className="p-2.5">
              <div className="text-[8px] font-black text-zinc-500 uppercase">LOGISTICS SECTION CHIEF</div>
              <div className="font-extrabold text-[10px] mt-0.5 text-zinc-900">
                {PRE_SEEDED_CONTACTS.find(c => c.id === logisticsId)?.name || 'Unassigned'}
              </div>
              <div className="font-mono text-[8px] text-zinc-500 mt-0.5">
                {PRE_SEEDED_CONTACTS.find(c => c.id === logisticsId)?.phone}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-black text-left text-[9px] font-bold">
            <div className="p-2.5">
              <div className="text-[8px] font-black text-zinc-500 uppercase">INCIDENT SAFETY OFFICER</div>
              <div className="font-extrabold text-[10px] mt-0.5 text-zinc-900">
                {PRE_SEEDED_CONTACTS.find(c => c.id === safetyId)?.name || 'Unassigned'}
              </div>
              <div className="font-mono text-[8px] text-zinc-500 mt-0.5">
                {PRE_SEEDED_CONTACTS.find(c => c.id === safetyId)?.phone}
              </div>
            </div>
            <div className="p-2.5">
              <div className="text-[8px] font-black text-zinc-500 uppercase">PUBLIC INFORMATION OFFICER (PIO)</div>
              <div className="font-extrabold text-[10px] mt-0.5 text-zinc-900">
                {PRE_SEEDED_CONTACTS.find(c => c.id === pioId)?.name || 'Unassigned'}
              </div>
              <div className="font-mono text-[8px] text-zinc-500 mt-0.5">
                {PRE_SEEDED_CONTACTS.find(c => c.id === pioId)?.phone}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: INCIDENT SAFETY & ENVIRONMENTAL BRIEFING */}
        <div className="border-2 border-black rounded overflow-hidden">
          <div className="bg-zinc-100 px-3 py-1 font-black text-[9px] border-b-2 border-black uppercase tracking-wider">
            SECTION 3: INCIDENT SAFETY & ENVIRONMENTAL BRIEFING
          </div>
          <div className="grid grid-cols-2 divide-x divide-black text-left text-[9px] font-bold">
            <div className="p-3">
              <div className="text-[8px] font-black text-zinc-500 uppercase mb-1">WEATHER FORECAST BRIEFING</div>
              <p className="text-[10px] font-semibold leading-relaxed text-zinc-800">
                {weatherForecast || 'Standard weather conditions.'}
              </p>
            </div>
            <div className="p-3">
              <div className="text-[8px] font-black text-zinc-500 uppercase mb-1">OPERATIONAL SAFETY MESSAGE</div>
              <p className="text-[10px] font-semibold leading-relaxed text-zinc-800">
                {safetyMessage || 'Follow standard NIMS safety protocols.'}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3A: 7-DAY METEOROLOGICAL OUTLOOK */}
        <div className="border-2 border-black rounded p-3 space-y-2">
          <div className="font-black text-[9px] uppercase tracking-wider text-zinc-700">SECTION 3A: 7-DAY METEOROLOGICAL OUTLOOK</div>
          <div className="grid grid-cols-7 gap-2">
            {missionForecast.slice(0, 7).map((day, idx) => {
              const lowerCond = day.condition.toLowerCase();
              const matchingRedFlag = missionAlerts.find(alert => {
                const isRedFlag = alert.type.toLowerCase().includes('red flag') || 
                                  alert.headline.toLowerCase().includes('red flag') || 
                                  alert.description.toLowerCase().includes('red flag');
                if (!isRedFlag) return false;
                return isAlertActiveOnDay(day.dateStr, alert.onset, alert.ends);
              });

              const matchingFireWeather = missionAlerts.find(alert => {
                const isFireWeather = alert.type.toLowerCase().includes('fire weather') || 
                                      alert.headline.toLowerCase().includes('fire weather') || 
                                      alert.description.toLowerCase().includes('fire weather');
                if (!isFireWeather) return false;
                return isAlertActiveOnDay(day.dateStr, alert.onset, alert.ends);
              });

              let alertBadge = null;
              let borderStyle = "border-zinc-300";
              let bgStyle = "bg-white";

              if (matchingRedFlag || lowerCond.includes('red flag')) {
                alertBadge = <div className="bg-red-600 text-white text-[7px] font-black py-0.5 tracking-wider uppercase text-center border-b border-black">RED FLAG</div>;
                borderStyle = "border-red-600 border-2";
              } else if (matchingFireWeather || lowerCond.includes('fire weather')) {
                alertBadge = <div className="bg-amber-500 text-black text-[7px] font-black py-0.5 tracking-wider uppercase text-center border-b border-black">FIRE WEATHER</div>;
                borderStyle = "border-amber-500 border-2";
              }

              return (
                <div key={idx} className={`border rounded overflow-hidden text-center flex flex-col justify-between ${borderStyle} ${bgStyle}`}>
                  {alertBadge || <div className="text-[7px] text-zinc-500 font-bold py-0.5 uppercase border-b border-zinc-200">{day.dayName}</div>}
                  <div className="p-1 space-y-0.5 flex-1 flex flex-col justify-between">
                    <div className="text-[10px] font-black uppercase tracking-wider mt-1">{day.dayName}</div>
                    <div className="text-[8px] font-semibold text-zinc-600 my-0.5 leading-tight">{day.condition}</div>
                    <div className="text-[11px] font-black text-zinc-900">{day.tempMax}° / {day.tempMin}°</div>
                    <div className="text-[7px] text-zinc-500 font-bold mt-1 uppercase leading-snug">
                      Wind: {day.windSpeed} mph<br />
                      Gust: {day.windGust} mph
                    </div>
                  </div>
                </div>
              );
            })}
            {missionForecast.length === 0 && (
              <div className="col-span-7 py-3 text-center text-zinc-500 italic">
                No active meteorological telemetry synchronized.
              </div>
            )}
          </div>
          <div className="flex justify-between items-center text-[8px] font-bold text-zinc-500 mt-1 uppercase">
            <span>Agency context: Cascadia Emergency Management</span>
            <span className="underline">Verify Active NWS MapClick Radar/Telemetry ({weatherCoords ? `${weatherCoords[0].toFixed(4)}, ${weatherCoords[1].toFixed(4)}` : '47.8107, -122.3774'})</span>
          </div>
        </div>

        {/* SECTION 4: LOGISTICAL SUPPORT SHELTER NODES ASSIGNED */}
        <div className="border-2 border-black rounded overflow-hidden">
          <div className="bg-zinc-100 px-3 py-1 font-black text-[9px] border-b-2 border-black uppercase tracking-wider">
            SECTION 4: LOGISTICAL SUPPORT SHELTER NODES ASSIGNED
          </div>
          <table className="w-full text-left text-[9px] divide-y divide-black font-bold">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 uppercase text-[8px] border-b border-black">
                <th className="px-3 py-2 border-r border-black">FACILITY NAME</th>
                <th className="px-3 py-2 border-r border-black">TYPE</th>
                <th className="px-3 py-2 border-r border-black">CAPACITY</th>
                <th className="px-3 py-2">INITIAL ACTIVATION STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black text-zinc-900">
              {assignedFacilityIds.map(fid => {
                const fac = PRE_SEEDED_FACILITIES.find(f => f.id === fid);
                const status = facilityInitialStates[fid] || 'COLD';
                return (
                  <tr key={fid}>
                    <td className="px-3 py-2 border-r border-black">{fac?.name || 'Unknown Facility'}</td>
                    <td className="px-3 py-2 border-r border-black">{fac?.type || 'Support Facility'}</td>
                    <td className="px-3 py-2 border-r border-black">{fac?.capacity || 'N/A'}</td>
                    <td className="px-3 py-2 uppercase font-extrabold text-zinc-950">
                      {status === 'ACTIVE' ? 'STANDBY (WARM)' : status === 'STANDBY' ? 'STANDBY (WARM)' : 'COLD (INACTIVE)'}
                    </td>
                  </tr>
                );
              })}
              {assignedFacilityIds.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-center italic text-zinc-500">
                    No logistical facilities assigned to this mission.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SECTION 5: INCIDENT OPERATIONAL OBJECTIVES */}
        <div className="border-2 border-black rounded overflow-hidden">
          <div className="bg-zinc-100 px-3 py-1 font-black text-[9px] border-b-2 border-black uppercase tracking-wider">
            SECTION 5: INCIDENT OPERATIONAL OBJECTIVES (SMART OBJECTIVES)
          </div>
          <div className="p-3 space-y-2">
            <ul className="list-decimal list-inside space-y-1.5 text-[10px] font-bold text-zinc-800">
              {objectives.map((obj, idx) => (
                <li key={idx} className="leading-relaxed">
                  {obj}
                </li>
              ))}
              {objectives.length === 0 && (
                <li className="italic text-zinc-500 list-none text-center">
                  No incident operational objectives defined for this mission.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* INCIDENT COMMANDER SIGNATURE SECTION */}
        <div className="border-2 border-black rounded p-4 flex justify-between items-center mt-6 pt-10 pb-6">
          <div className="w-[45%] border-t border-black pt-1.5 text-center text-[9px] font-black uppercase text-zinc-600">
            INCIDENT COMMANDER SIGNATURE
          </div>
          <div className="w-[45%] border-t border-black pt-1.5 text-center text-[9px] font-black uppercase text-zinc-600">
            DATE / TIME OF CERTIFICATION
          </div>
        </div>

        <div className="text-center text-[8px] font-black uppercase text-zinc-500 tracking-wider">
          CASCADIA EMERGENCY MANAGEMENT OPERATIONAL MISSION PLAN
        </div>

      </div>
    </>
  );
};

export default MissionBuilder;
