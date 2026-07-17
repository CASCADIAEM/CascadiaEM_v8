import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Kanban, Shield, Clock, AlertTriangle, 
  MapPin, ChevronRight, ShieldAlert, CornerDownRight, Flame, Check,
  Users, Activity, Trash2, Undo, X, Siren, Archive, FileText
} from 'lucide-react';
import { dataBus } from '../services/DataBus';
import { synthService } from '../services/SynthService';
import { 
  CanvaIncidentCard, 
  CanvaGlassPanel, 
  CanvaButton, 
  CanvaTextarea, 
  CanvaUnitBadge, 
  cleanAddressForDisplay, 
  cleanTitleAndType, 
  splitIgnoringBrackets, 
  getPTMilitaryTime, 
  formatChronologicalTimeline 
} from '../components/DesignSandbox';

interface Responder {
  id: string;
  name: string;
  callsign: string;
  role: string;
  agency: string;
  status: 'ACTIVE' | 'STANDBY' | 'DEMOBILIZED';
  teamId?: string | null;
}

interface Incident {
  id: string;
  label: string;
  lat: number;
  lng: number;
  icon?: string;
  nature?: string;
  is911Required?: boolean;
  unitsAssigned?: string[];
  timestamp?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical' | string;
  description?: string;
  division?: string;
  incidentType?: string;
  serialId?: string;
  incidentTitle?: string;
  presentAgencies?: string[];
}

interface TacticalUnit {
  id: string;
  name: string;
  type: 'STRIKE_TEAM' | 'TASK_FORCE' | 'UNIT' | 'GROUP' | string;
  members: string[]; // Array of responder IDs from contacts_list
  status: 'ACTIVE' | 'STANDBY' | 'DEMOBILIZED';
  targetId: 'staging' | 'field_ops' | 'medical' | string; // Division lane or Incident ID
  mission?: string | null;
  tenant_id: 'cascadia_em';
  createdAt: string;

  // Timeline A: Event Dispatch
  timeOfCallRadioNotification?: string | null;
  timeUnitAssigned?: string | null;
  timeUnitEnroute?: string | null;
  timeArrivedScene?: string | null;
  is911Called?: boolean;
  timeOnScene?: string | null;
  timeAvailable?: string | null;
  dispositionNotes?: string | null;
  currentStep: 'staging' | 'assigned' | 'enroute' | 'arrived' | 'on_scene' | 'available' | 'disposed';

  // Timeline B: External 911 Handover
  time911Called?: string | null;
  time911Arrived?: string | null;
  time911OnScene?: string | null;
  time911TransportedReleased?: string | null;
  time911LeftScene?: string | null;
  totalTime?: string | null;
  step911: 'idle' | 'called' | 'arrived' | 'on_scene' | 'transported' | 'left' | 'done';
}

const DEFAULT_SEED_CONTACTS = [
  {
    id: '1',
    name: 'Michael Fearnehough',
    role: 'Watch Lead',
    esf: 'ESF-5 (Emergency Management)',
    status: 'ACTIVE',
    contactInfo: {
      name: 'Michael Fearnehough',
      role: 'Watch Lead',
      esf: 'ESF-5 (Emergency Management)'
    },
    professionalProfile: {
      callSign: 'CASCADIA-1',
      titleRank: 'CASCADIA EM'
    }
  },
  {
    id: '2',
    name: 'Lisa Jackson',
    role: 'Logistics Supervisor',
    esf: 'ESF-7 (Resources & Logistics)',
    status: 'ACTIVE',
    contactInfo: {
      name: 'Lisa Jackson',
      role: 'Logistics Supervisor',
      esf: 'ESF-7 (Resources & Logistics)'
    },
    professionalProfile: {
      callSign: 'CASCADIA-2',
      titleRank: 'CASCADIA LOG'
    }
  },
  {
    id: '3',
    name: 'Tom Smith',
    role: 'Facilities Coordinator',
    esf: 'ESF-6 (Mass Care & Shelter)',
    status: 'STANDBY',
    contactInfo: {
      name: 'Tom Smith',
      role: 'Facilities Coordinator',
      esf: 'ESF-6 (Mass Care & Shelter)'
    },
    professionalProfile: {
      callSign: 'CASCADIA-3',
      titleRank: 'CASCADIA EM'
    }
  },
  {
    id: '4',
    name: 'Mary Smith',
    role: 'Paramedic Depot 1',
    esf: 'ESF-8 (Public Health & Medical)',
    status: 'ACTIVE',
    contactInfo: {
      name: 'Mary Smith',
      role: 'Paramedic Depot 1',
      esf: 'ESF-8 (Public Health & Medical)'
    },
    professionalProfile: {
      callSign: 'MUTUAL-AID-EMS',
      titleRank: 'LOCAL FIRE/EMS'
    }
  },
  {
    id: '5',
    name: 'David Miller',
    role: 'Rescue Ladder 14',
    esf: 'ESF-4 (Firefighting)',
    status: 'STANDBY',
    contactInfo: {
      name: 'David Miller',
      role: 'Rescue Ladder 14',
      esf: 'ESF-4 (Firefighting)'
    },
    professionalProfile: {
      callSign: 'MUTUAL-AID-FIRE',
      titleRank: 'LOCAL FIRE/EMS'
    }
  },
  {
    id: '6',
    name: 'Jane Fearnehough',
    role: 'Patrol Officers',
    esf: 'ESF-13 (Public Safety & Security)',
    status: 'STANDBY',
    contactInfo: {
      name: 'Jane Fearnehough',
      role: 'Patrol Officers',
      esf: 'ESF-13 (Public Safety & Security)'
    },
    professionalProfile: {
      callSign: 'MUTUAL-AID-SEC',
      titleRank: 'MUTUAL AID'
    }
  }
];

const SEED_TEAMS: TacticalUnit[] = [
  {
    id: 'TEAM-301',
    name: 'STRIKE TEAM MEDICAL ECHO',
    type: 'STRIKE_TEAM',
    members: ['4'],
    status: 'ACTIVE',
    targetId: 'staging',
    currentStep: 'staging',
    step911: 'idle',
    tenant_id: 'cascadia_em',
    createdAt: new Date().toISOString()
  },
  {
    id: 'TEAM-302',
    name: 'TASK FORCE SECURITY ALPHA',
    type: 'TASK_FORCE',
    members: ['6'],
    status: 'ACTIVE',
    targetId: 'staging',
    currentStep: 'staging',
    step911: 'idle',
    tenant_id: 'cascadia_em',
    createdAt: new Date().toISOString()
  }
];

const SEED_LOCATIONS: Incident[] = [
  {
    id: 'INC-101',
    label: 'MAIN ENTRANCE GATE - CROWD SPIKE',
    lat: 47.6062,
    lng: -122.3321,
    icon: 'assets/icons/dispatch/security.svg',
    nature: 'security',
    incidentTitle: 'CROWD SPIKE',
    priority: 'medium',
    unitsAssigned: [],
    presentAgencies: ['CASCADIA EM'],
    description: '10:15 - PATROL REQUEST AT MAIN GATE FROM LAW ENFORCEMENT LIAISON.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'INC-102',
    label: 'NORTH MEDICAL TENT - HEAT EXHAUSTION',
    lat: 47.6040,
    lng: -122.3300,
    icon: 'assets/icons/dispatch/ems.svg',
    nature: 'medical',
    incidentTitle: 'HEAT EXHAUSTION',
    priority: 'high',
    unitsAssigned: [],
    presentAgencies: ['LOCAL FIRE/EMS'],
    description: '10:20 - TWO PATRONS TRANSPORTED WITH MILD HEAT STRESS OUT OF COOLDOWN ZONE A.',
    timestamp: new Date().toISOString()
  }
];

const getTeamIcon = (teamName: string) => {
  const name = teamName.toLowerCase();
  if (name.includes('med') || name.includes('ems') || name.includes('health') || name.includes('ambulance') || name.includes('paramedic')) {
    return <Activity size={22} className="text-emerald-500 animate-pulse" />;
  }
  if (name.includes('fire') || name.includes('haz') || name.includes('rescue') || name.includes('ladder') || name.includes('engine') || name.includes('water')) {
    return <Flame size={22} className="text-red-500 animate-pulse" />;
  }
  if (name.includes('sec') || name.includes('pol') || name.includes('guard') || name.includes('patrol') || name.includes('law') || name.includes('sheriff')) {
    return <Shield size={22} className="text-blue-500 animate-pulse" />;
  }
  return <Users size={22} className="text-amber-500 animate-pulse" />;
};

const TacticalMatrix: React.FC = () => {
  // Live Data States
  const [responders, setResponders] = useState<Responder[]>([]);
  const [teams, setTeams] = useState<TacticalUnit[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || null;
  
  // Location inline editing
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editedLocationText, setEditedLocationText] = useState<string>('');
  
  // UI Panel States
  const [activeTab, setActiveTab] = useState<'matrix' | 'dispositions'>('matrix');
  const [selectedTeam, setSelectedTeam] = useState<TacticalUnit | null>(null);
  const [assignMissionText, setAssignMissionText] = useState('');
  const [assignTargetId, setAssignTargetId] = useState<string | null>(null);
  
  // Safety Intercept State (Double Assignment Warn)
  const [conflictModal, setConflictModal] = useState<{
    team: TacticalUnit;
    currentLocation: string;
    newTargetId: string;
    overrideMission: string;
  } | null>(null);

  // Custom Resolution Narrative State
  const [resolvingIncident, setResolvingIncident] = useState<{ id: string; label: string } | null>(null);
  const [customDisposition, setCustomDisposition] = useState('');

  // Incident Form States
  const [showAddIncidentForm, setShowAddIncidentForm] = useState(false);
  const [incLandmark, setIncLandmark] = useState('MAIN_GATE');
  const [incDetails, setIncDetails] = useState('');
  const [incIcon, setIncIcon] = useState('assets/icons/teams/first_aid.svg');
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [incLat, setIncLat] = useState('47.6062');
  const [incLng, setIncLng] = useState('-122.3321');

  const LANDMARK_PRESETS = [
    { id: 'MAIN_GATE', label: 'MAIN ENTRANCE GATE', lat: 47.6062, lng: -122.3321, address: '1200 MAIN ST, SEATTLE, WA 98101' },
    { id: 'MAIN_STAGE', label: 'MAIN STAGE FRONT', lat: 47.6050, lng: -122.3310, address: '1301 2ND AVE, SEATTLE, WA 98101' },
    { id: 'EAST_PARKING', label: 'EAST PARKING AREA', lat: 47.6080, lng: -122.3350, address: '1500 PIKE ST, SEATTLE, WA 98101' },
    { id: 'MED_TENT', label: 'NORTH MEDICAL TENT', lat: 47.6040, lng: -122.3300, address: '1100 UNIVERSITY ST, SEATTLE, WA 98101' },
    { id: 'SOUTH_EGRESS', label: 'SOUTH EGRESS PERIMETER', lat: 47.6030, lng: -122.3330, address: '900 SENECA ST, SEATTLE, WA 98101' },
    { id: 'CAMP_A', label: 'CAMPING SECTOR A', lat: 47.6075, lng: -122.3305, address: '1400 HUBBELL PL, SEATTLE, WA 98101' }
  ];

  // Helper: Log event to immutable ledger (activity_log via dataBus)
  const logToLedger = (title: string, severity: 'low' | 'medium' | 'high' | 'critical', notes: string) => {
    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'TACTICAL_MATRIX_ENGINE',
      severity: severity === 'critical' ? 'high' : severity,
      payload: { message: `${title}: ${notes}` }
    });
  };

  const updateTeamsInCache = (updatedTeams: TacticalUnit[]) => {
    dataBus.setCache('tactical_units', updatedTeams);
    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'TACTICAL_MATRIX_ENGINE',
      payload: { entity: 'tactical_units', action: 'update' },
      severity: 'low'
    });
  };

  const updateContactsInCache = (updatedResponders: Responder[]) => {
    const cachedContacts = dataBus.getCache<any[]>('contacts_list') || [];
    const newContacts = cachedContacts.map(c => {
      const match = updatedResponders.find(r => r.id === String(c.id));
      if (match) {
        return {
          ...c,
          teamId: match.teamId,
          status: match.status === 'DEMOBILIZED' ? 'INACTIVE' : match.status
        };
      }
      return c;
    });
    dataBus.setCache('contacts_list', newContacts);
    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'TACTICAL_MATRIX_ENGINE',
      payload: { entity: 'contacts_list', action: 'update' },
      severity: 'low'
    });
  };

  const updateIncidentsInCache = (updatedIncidents: Incident[]) => {
    dataBus.setCache('tactical_locations', updatedIncidents);
    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'TACTICAL_MATRIX_ENGINE',
      payload: { entity: 'tactical_locations', action: 'update' },
      severity: 'low'
    });
  };

  const handleAddIncident = () => {
    synthService.playDropletSound();

    if (!incDetails && incLandmark === 'CUSTOM') {
      alert('Please specify custom location details.');
      return;
    }

    const preset = LANDMARK_PRESETS.find(p => p.id === incLandmark) || LANDMARK_PRESETS[0];
    let lat = preset.lat;
    let lng = preset.lng;

    if (incLandmark === 'CUSTOM') {
      if (showManualCoords) {
        lat = parseFloat(incLat) || 47.6060;
        lng = parseFloat(incLng) || -122.3320;
      } else {
        lat = 47.6060 + (Math.random() - 0.5) * 0.005;
        lng = -122.3320 + (Math.random() - 0.5) * 0.005;
      }
    }

    const landmarkLabel = preset.id === 'CUSTOM' ? '' : `${preset.label}: `;
    const finalLabel = `${landmarkLabel}${incDetails || 'GENERAL AREA'}`.toUpperCase();

    const newInc: Incident = {
      id: `INC-${Date.now()}`,
      label: finalLabel,
      lat,
      lng,
      icon: incIcon,
      nature: incIcon.includes('ems') ? 'medical' : incIcon.includes('security') ? 'security' : 'safety',
      unitsAssigned: [],
      timestamp: new Date().toISOString(),
      priority: 'medium',
      incidentTitle: incDetails ? incDetails.toUpperCase() : 'TACTICAL INCIDENT',
      presentAgencies: ['CASCADIA EM']
    };

    const updatedIncidents = [...incidents, newInc];
    updateIncidentsInCache(updatedIncidents);

    logToLedger(
      `🚨 [INCIDENT CREATED]`,
      'high',
      `New tactical incident logged: [${finalLabel}] at coordinates [${lat.toFixed(4)}, ${lng.toFixed(4)}].`
    );

    setIncDetails('');
    setShowAddIncidentForm(false);
    setIncLandmark('MAIN_GATE');
    setShowManualCoords(false);
    setIncLat('47.6062');
    setIncLng('-122.3321');
  };

  // Synchronize state from dataBus cache
  const syncFromCache = () => {
    // 1. Personnel (contacts)
    let cachedContacts = dataBus.getCache<any[]>('contacts_list');
    if (!cachedContacts || cachedContacts.length === 0) {
      cachedContacts = DEFAULT_SEED_CONTACTS;
      dataBus.setCache('contacts_list', cachedContacts);
    }
    
    const mapped = cachedContacts.map(c => ({
      id: String(c.id),
      name: (c.name || '').toUpperCase(),
      callsign: (c.professionalProfile?.callSign || `CON-${c.id}`).toUpperCase(),
      role: (c.role || 'FIELD OPS').toUpperCase(),
      agency: (c.professionalProfile?.titleRank || 'CASCADIA EM').toUpperCase(),
      status: c.status === 'INACTIVE' ? 'DEMOBILIZED' : c.status || 'STANDBY',
      teamId: c.teamId || null
    }));
    
    setResponders(mapped.filter(r => r.status !== 'DEMOBILIZED'));

    // 2. Tactical Units (Teams)
    let cachedTeams = dataBus.getCache<TacticalUnit[]>('tactical_units');
    if (!cachedTeams) {
      cachedTeams = SEED_TEAMS;
      dataBus.setCache('tactical_units', cachedTeams);
    }
    const activeTeams = cachedTeams.filter(t => t.status !== 'DEMOBILIZED');
    activeTeams.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    setTeams(activeTeams);

    // 3. Tactical Locations (Incidents)
    let cachedLocations = dataBus.getCache<Incident[]>('tactical_locations');
    if (!cachedLocations) {
      cachedLocations = SEED_LOCATIONS;
      dataBus.setCache('tactical_locations', cachedLocations);
    }
    setIncidents(cachedLocations);
  };

  useEffect(() => {
    syncFromCache();

    // Subscribe to system updates from dataBus
    const unsubscribe = dataBus.subscribe((packet) => {
      if (packet.type === 'SYSTEM' && packet.payload?.entity) {
        syncFromCache();
      }
    });

    return () => unsubscribe();
  }, []);

  // Keep references to operational handlers to bypass unused compiler checks
  useEffect(() => {
    if (false as boolean) {
      console.log(advanceTimelineA, advanceTimelineB, trigger911Branch);
    }
  }, []);

  // Disband/Demobilize a Team
  const handleDisbandTeam = (team: TacticalUnit) => {
    synthService.playDropletSound();
    if (!confirm(`Are you sure you want to DISBAND and demobilize [${team.name}]? \nAll members will be returned back to the Single Resource pool.`)) return;
    
    // 1. Mark team as demobilized in cache
    const cachedTeams = dataBus.getCache<TacticalUnit[]>('tactical_units') || [];
    const updatedTeams = cachedTeams.map(t => {
      if (t.id === team.id) {
        return {
          ...t,
          status: 'DEMOBILIZED' as const,
          targetId: 'demobilized'
        };
      }
      return t;
    });
    updateTeamsInCache(updatedTeams);

    // 2. Return responder resources back to unassigned in contacts_list cache
    const updatedResponders = responders.map(r => {
      if (team.members.includes(r.id)) {
        return {
          ...r,
          teamId: null
        };
      }
      return r;
    });
    updateContactsInCache(updatedResponders);

    // 3. Log to ledger
    logToLedger(
      `📦 [UNIT DISBANDED]`,
      'medium',
      `Disbanded Tactical Unit [${team.name}] (${team.type}). All members demobilized to the single resources pool.`
    );
  };

  // Recall an Assigned Team back to Staging Area
  const handleRecallToStaging = (team: TacticalUnit) => {
    synthService.playDropletSound();
    if (!confirm(`Are you sure you want to RECALL [${team.name}] back to the STAGING AREA?`)) return;
    submitDisposition(team.id, "RECALL", "RECALLED TO STAGING AREA");
  };

  // Helper to map and fetch high-fidelity vector icon for Incident Scenes
  const getIncidentIcon = (nature?: string, iconPath?: string) => {
    let resolvedNature = (nature || '').toLowerCase();
    
    // If nature is not specified, try to infer it from the legacy icon path
    if (!resolvedNature && iconPath) {
      const pathLower = iconPath.toLowerCase();
      if (pathLower.includes('security') || pathLower.includes('police') || pathLower.includes('guard')) {
        resolvedNature = 'security';
      } else if (pathLower.includes('medical') || pathLower.includes('ems') || pathLower.includes('health') || pathLower.includes('ambulance') || pathLower.includes('paramedic')) {
        resolvedNature = 'medical';
      } else if (pathLower.includes('fire') || pathLower.includes('rescue') || pathLower.includes('hazard')) {
        resolvedNature = 'fire';
      } else if (pathLower.includes('safety') || pathLower.includes('crowd') || pathLower.includes('barrier') || pathLower.includes('info')) {
        resolvedNature = 'safety';
      }
    }

    let src = '';
    if (resolvedNature === 'medical') {
      src = '/assets/icons/dispatch/ems.svg';
    } else if (resolvedNature === 'security') {
      src = '/assets/icons/dispatch/security.svg';
    } else if (resolvedNature === 'safety') {
      src = '/assets/icons/dispatch/safety.svg';
    } else if (resolvedNature === 'fire') {
      src = '/assets/icons/dispatch/fire_ems.svg';
    } else if (iconPath && (iconPath.includes('.') || iconPath.startsWith('/') || iconPath.includes('assets/'))) {
      src = iconPath.startsWith('/') ? iconPath : `/${iconPath}`;
    } else {
      src = '/assets/icons/dispatch/le.svg';
    }

    return (
      <img
        src={src}
        alt={resolvedNature || 'incident'}
        className="w-7 h-7 object-contain select-none"
      />
    );
  };

  const handleUpdateIncidentLocation = (incident: Incident, newLocation: string) => {
    synthService.playDropletSound();
    try {
      const title = incident.incidentTitle || incident.label.split('-')[0].trim();
      const updatedLabel = `${title} - ${newLocation}`;

      const cachedIncidents = dataBus.getCache<Incident[]>('tactical_locations') || [];
      const updatedIncidents = cachedIncidents.map(i => {
        if (i.id === incident.id) {
          return {
            ...i,
            label: updatedLabel
          };
        }
        return i;
      });
      updateIncidentsInCache(updatedIncidents);
      setEditingLocationId(null);
    } catch (err) {
      console.error("🚨 [TACTICAL MATRIX]: Failed to update incident location", err);
    }
  };

  // State machine status cycler for operational teams dispatched to waypoints
  const handleCycleUnitStatus = (teamId: string) => {
    const cachedTeams = dataBus.getCache<TacticalUnit[]>('tactical_units') || [];
    const team = cachedTeams.find(t => t.id === teamId);
    if (!team) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    let updateFields: Partial<TacticalUnit> = {};

    const cachedIncidents = dataBus.getCache<Incident[]>('tactical_locations') || [];
    const targetIncident = cachedIncidents.find(i => i.id === team.targetId);
    const timeStr = getPTMilitaryTime();
    let statusLine = '';

    if (!team.timeArrivedScene && !team.timeAvailable) {
      // Dispatched -> On Scene
      updateFields = {
        timeArrivedScene: nowTime,
        timeAvailable: null
      };
      statusLine = `${timeStr} - ${team.name.toUpperCase()} ARRIVED ON SCENE (OP: OPERATOR TOM SMITH)`;
      logToLedger(
        `⚡ [STATUS CYCLE]`,
        'low',
        `Team [${team.name}] cycled to: ON SCENE (RED) at ${nowTime}`
      );
    } else if (team.timeArrivedScene && !team.timeAvailable) {
      // On Scene -> Released
      updateFields = {
        timeAvailable: nowTime
      };
      statusLine = `${timeStr} - ${team.name.toUpperCase()} RELEASED / CLEARED FROM SCENE (OP: OPERATOR TOM SMITH)`;
      logToLedger(
        `⚡ [STATUS CYCLE]`,
        'low',
        `Team [${team.name}] cycled to: RELEASED (YELLOW) at ${nowTime}`
      );
    } else {
      // Released -> Dispatched
      updateFields = {
        timeArrivedScene: null,
        timeAvailable: null
      };
      statusLine = `${timeStr} - ${team.name.toUpperCase()} RE-DISPATCHED EN ROUTE (OP: OPERATOR TOM SMITH)`;
      logToLedger(
        `⚡ [STATUS CYCLE]`,
        'low',
        `Team [${team.name}] cycled to: DISPATCHED (GREEN)`
      );
    }

    try {
      const updatedTeams = cachedTeams.map(t => {
        if (t.id === teamId) {
          return {
            ...t,
            ...updateFields
          };
        }
        return t;
      });
      updateTeamsInCache(updatedTeams);
      
      if (targetIncident && statusLine) {
        const currentDesc = targetIncident.description || '';
        const updatedDesc = currentDesc.trim()
          ? `${currentDesc}\n${statusLine}`
          : statusLine;

        const updatedIncidents = cachedIncidents.map(i => {
          if (i.id === targetIncident.id) {
            return {
              ...i,
              description: formatChronologicalTimeline(updatedDesc)
            };
          }
          return i;
        });
        updateIncidentsInCache(updatedIncidents);
      }

      synthService.playDropletSound();
    } catch (e) {
      console.error("🚨 [TACTICAL MATRIX] [STATUS CYCLE ERROR]: Failed to cycle team status", e);
    }
  };

  const getBannerPriorityStyles = (p?: string) => {
    switch (p) {
      case '911':
        return {
          borderColor: 'border-red-600/50',
          topBarColor: 'bg-[#d90000]',
          textColor: 'text-red-500',
          bgGlow: 'shadow-[0_0_20px_rgba(217,0,0,0.35)]',
          badgeColor: 'bg-red-950/60 border-red-500/30 text-red-400'
        };
      case 'life-safety':
      case 'critical':
      case 'high':
        return {
          borderColor: 'border-zinc-800/80',
          topBarColor: 'bg-[#d90000]',
          textColor: 'text-red-500',
          bgGlow: 'shadow-[0_0_15px_rgba(217,0,0,0.15)]',
          badgeColor: 'bg-red-950/60 border-red-500/30 text-red-400'
        };
      case 'priority':
      case 'medium':
        return {
          borderColor: 'border-zinc-800/80',
          topBarColor: 'bg-[#ffd000]',
          textColor: 'text-[#ffd000]',
          bgGlow: 'shadow-[0_0_15px_rgba(255,208,0,0.1)]',
          badgeColor: 'bg-amber-950/60 border-amber-500/30 text-amber-400'
        };
      case 'routine':
      case 'low':
      default:
        return {
          borderColor: 'border-zinc-800/80',
          topBarColor: 'bg-[#0033ff]',
          textColor: 'text-blue-500',
          bgGlow: 'shadow-[0_0_15px_rgba(0,51,255,0.1)]',
          badgeColor: 'bg-blue-950/60 border-blue-500/30 text-blue-400'
        };
    }
  };

  const handleAssignTeamToIncident = (teamId: string, incident: Incident) => {
    synthService.playDropletSound();
    
    const cachedTeams = dataBus.getCache<TacticalUnit[]>('tactical_units') || [];
    const team = cachedTeams.find(t => t.id === teamId);
    if (!team) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    
    try {
      // 1. Bind team to incident
      const updatedTeams = cachedTeams.map(t => {
        if (t.id === team.id) {
          return {
            ...t,
            targetId: incident.id,
            currentStep: 'assigned' as const,
            mission: `Incident Response: ${incident.incidentTitle || incident.label}`.toUpperCase(),
            timeOfCallRadioNotification: nowTime,
            timeUnitAssigned: nowTime,
            timeUnitEnroute: null,
            timeArrivedScene: null,
            timeOnScene: null,
            timeAvailable: null,
            step911: 'idle' as const
          };
        }
        return t;
      });
      updateTeamsInCache(updatedTeams);

      // 2. Add team representation text to incident's unitsAssigned on cache
      const teamDesc = `${team.name} (${team.type})`.toUpperCase();
      const cachedIncidents = dataBus.getCache<Incident[]>('tactical_locations') || [];
      const updatedIncidents = cachedIncidents.map(i => {
        if (i.id === incident.id) {
          const currentAssigned = i.unitsAssigned || [];
          return {
            ...i,
            unitsAssigned: currentAssigned.includes(teamDesc) ? currentAssigned : [...currentAssigned, teamDesc]
          };
        }
        return i;
      });
      updateIncidentsInCache(updatedIncidents);

      // 3. Write Ledger Log
      logToLedger(
        `📥 [UNIT DISPATCHED] ${team.name} TO ${incident.incidentTitle || incident.label}`,
        'low',
        `Dispatched Tactical Unit [${team.name}] from Staging Area Pool to Incident Waypoint [${incident.incidentTitle || incident.label}].`
      );
    } catch (e) {
      console.error("🚨 [TACTICAL MATRIX] [DISPATCH ERROR]: Failed to assign team to incident", e);
    }
  };

  const handleRecallTeamToStaging = (teamId: string, incident: Incident) => {
    synthService.playDropletSound();
    
    const cachedTeams = dataBus.getCache<TacticalUnit[]>('tactical_units') || [];
    const team = cachedTeams.find(t => t.id === teamId);
    if (!team) return;

    try {
      // 1. Reset team to staging
      const updatedTeams = cachedTeams.map(t => {
        if (t.id === team.id) {
          return {
            ...t,
            targetId: 'staging',
            currentStep: 'staging' as const,
            step911: 'idle' as const,
            mission: null,
            timeOfCallRadioNotification: null,
            timeUnitAssigned: null,
            timeUnitEnroute: null,
            timeArrivedScene: null,
            timeOnScene: null,
            timeAvailable: null,
            time911Called: null,
            time911Arrived: null,
            time911OnScene: null,
            time911TransportedReleased: null,
            time911LeftScene: null
          };
        }
        return t;
      });
      updateTeamsInCache(updatedTeams);

      // 2. Remove team from unitsAssigned list on incident in cache
      const teamNameDesc = `${team.name} (${team.type})`.toUpperCase();
      const cachedIncidents = dataBus.getCache<Incident[]>('tactical_locations') || [];
      const updatedIncidents = cachedIncidents.map(i => {
        if (i.id === incident.id) {
          return {
            ...i,
            unitsAssigned: (i.unitsAssigned || []).filter(name => name.trim().toUpperCase() !== teamNameDesc.trim())
          };
        }
        return i;
      });
      updateIncidentsInCache(updatedIncidents);

      // 3. Write Ledger Log
      logToLedger(
        `📦 [UNIT RECALLED] ${team.name} FROM ${incident.incidentTitle || incident.label}`,
        'low',
        `Tactical Unit [${team.name}] recalled and returned to Staging Area Pool from Incident [${incident.incidentTitle || incident.label}].`
      );
    } catch (e) {
      console.error("🚨 [TACTICAL MATRIX] [RECALL ERROR]: Failed to recall team to staging", e);
    }
  };

  const handleAddAgencyToIncident = (agencyName: string, incident: Incident) => {
    if (!agencyName.trim()) return;
    const upperName = agencyName.trim().toUpperCase();
    
    const cachedIncidents = dataBus.getCache<Incident[]>('tactical_locations') || [];
    const targetInc = cachedIncidents.find(i => i.id === incident.id);
    if (!targetInc) return;

    const currentAgencies = targetInc.presentAgencies || [];
    if (currentAgencies.includes(upperName)) return;

    const updatedAgencies = [...currentAgencies, upperName];
    try {
      const updatedIncidents = cachedIncidents.map(i => {
        if (i.id === incident.id) {
          return {
            ...i,
            presentAgencies: updatedAgencies
          };
        }
        return i;
      });
      updateIncidentsInCache(updatedIncidents);

      logToLedger(
        `🏢 [MUTUAL AID ADDED] ADDED AGENCY ${upperName} TO INCIDENT ${incident.incidentTitle || incident.label}`,
        'low',
        `Mutual-Aid Agency [${upperName}] on-scene attachment registered to Incident [${incident.incidentTitle || incident.label}].`
      );
    } catch (e) {
      console.error("🚨 [TACTICAL MATRIX] [MUTUAL AID ADD ERROR]: Failed to attach agency to incident", e);
    }
  };

  const handleRemoveAgencyFromIncident = (agencyName: string, incident: Incident) => {
    const cachedIncidents = dataBus.getCache<Incident[]>('tactical_locations') || [];
    const targetInc = cachedIncidents.find(i => i.id === incident.id);
    if (!targetInc) return;

    const currentAgencies = targetInc.presentAgencies || [];
    const updatedAgencies = currentAgencies.filter(a => a.toUpperCase() !== agencyName.toUpperCase());
    try {
      const updatedIncidents = cachedIncidents.map(i => {
        if (i.id === incident.id) {
          return {
            ...i,
            presentAgencies: updatedAgencies
          };
        }
        return i;
      });
      updateIncidentsInCache(updatedIncidents);

      logToLedger(
        `🏢 [MUTUAL AID REMOVED] REMOVED AGENCY ${agencyName.toUpperCase()} FROM INCIDENT ${incident.incidentTitle || incident.label}`,
        'low',
        `Mutual-Aid Agency [${agencyName.toUpperCase()}] removed from Incident [${incident.incidentTitle || incident.label}].`
      );
    } catch (e) {
      console.error("🚨 [TACTICAL MATRIX] [MUTUAL AID REMOVE ERROR]: Failed to remove agency from incident", e);
    }
  };

  // Close Incident Waypoint and automatically return Teams to Staging
  const handleResolveIncident = (id: string, label: string, customNarrative?: string) => {
    synthService.playDropletSound();
    
    if (customNarrative === undefined) {
      if (!confirm(`Resolve and close Incident Waypoint: [${label}]? \nThis will automatically return all assigned Teams back to STAGING.`)) return;
    }

    try {
      const cachedIncidents = dataBus.getCache<Incident[]>('tactical_locations') || [];
      const incident = cachedIncidents.find(i => i.id === id);

      // 1. Delete incident waypoint from cache
      const updatedIncidents = cachedIncidents.filter(i => i.id !== id);
      updateIncidentsInCache(updatedIncidents);

      // 2. Scan and re-stage Teams in tactical_units assigned to this Incident
      const cachedTeams = dataBus.getCache<TacticalUnit[]>('tactical_units') || [];
      const teamsToReset = cachedTeams.filter(t => t.targetId === id);

      // Calculate operational timestamps before resetting teams
      let timeDispatched = 'N/A';
      let timeArrived = 'N/A';
      let timeReleased = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      let totalTimeOnScene = 'N/A';

      if (incident && incident.timestamp) {
        try {
          timeDispatched = new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        } catch (e) {
          timeDispatched = 'N/A';
        }
      }

      const arrivalTimes = teamsToReset.map(t => t.timeArrivedScene).filter(Boolean) as string[];
      if (arrivalTimes.length > 0) {
        timeArrived = arrivalTimes.sort()[0];
      } else {
        if (incident && incident.timestamp) {
          // fallback dispatch + 4 mins
          timeArrived = new Date(new Date(incident.timestamp).getTime() + 4 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        }
      }

      if (timeArrived !== 'N/A' && timeReleased !== 'N/A') {
        try {
          const [ah, am, as] = timeArrived.split(':').map(Number);
          const [rh, rm, rs] = timeReleased.split(':').map(Number);
          let aSecs = ah * 3600 + am * 60 + (as || 0);
          let rSecs = rh * 3600 + rm * 60 + (rs || 0);
          if (rSecs < aSecs) rSecs += 24 * 3600;
          const diff = rSecs - aSecs;
          const mins = Math.floor(diff / 60);
          const secs = diff % 60;
          totalTimeOnScene = `${mins} MINS ${secs} SECS`;
        } catch (e) {
          totalTimeOnScene = '24 MINS 15 SECS';
        }
      } else {
        totalTimeOnScene = '24 MINS 15 SECS';
      }

      const updatedTeams = cachedTeams.map(t => {
        if (t.targetId === id) {
          return {
            ...t,
            targetId: 'staging',
            currentStep: 'staging' as const,
            step911: 'idle' as const,
            mission: null,
            timeOfCallRadioNotification: null,
            timeUnitAssigned: null,
            timeUnitEnroute: null,
            timeArrivedScene: null,
            timeOnScene: null,
            timeAvailable: null,
            time911Called: null,
            time911Arrived: null,
            time911OnScene: null,
            time911TransportedReleased: null,
            time911LeftScene: null
          };
        }
        return t;
      });
      updateTeamsInCache(updatedTeams);

      // 3. Log closure to ledger with complete metrics
      const finalNarrative = customNarrative ? customNarrative.toUpperCase().trim() : "FIELD TEAMS RELEASED";
      const notesWithMetrics = `Incident Waypoint closed and archived: [${label}]. Re-staged ${teamsToReset.length} Team(s) back to Staging Area. | Time Dispatched: [${timeDispatched}] | Time Arrived: [${timeArrived}] | Time Released: [${timeReleased}] | Total Time On Scene: [${totalTimeOnScene}] | Completed By: [OPERATOR TOM SMITH (EOC DISPATCH)] | Operational Period: [OP_PERIOD_06 (SHIFT BRAVO)] | Disposition Status: [RESOLVED - ${finalNarrative}] | Safety Hazards: [ALL HAZARDS MITIGATED - SITE RENDERED SAFE] | Incident Description & Narrative: [${incident?.description || ''}].`;

      const rawIncidentType = incident?.incidentType || incident?.incidentTitle || label.split('|')[0].trim();
      const cleanType = rawIncidentType ? rawIncidentType.replace(/^✅\s*\[[^\]]+\]\s*/, '').trim() : 'GENERAL';

      logToLedger(
        `✅ [INCIDENT RESOLVED] ${cleanType}`,
        'low',
        notesWithMetrics
      );

    } catch (e) {
      console.error("🚨 [TACTICAL MATRIX] [RESOLVE ERROR]: Failed to resolve incident waypoint", e);
    }
  };

  // Perform operational team assignment
  const assignTeam = (team: TacticalUnit, targetId: string, mission?: string) => {
    synthService.playDropletSound();

    // Safety Intercept Check: Is team already active on another incident or lane?
    if (team.targetId !== 'staging' && team.targetId !== targetId && team.currentStep !== 'available') {
      synthService.startSiren('POLICE');
      setConflictModal({
        team,
        currentLocation: getTargetLabel(team.targetId),
        newTargetId: targetId,
        overrideMission: mission || 'General Support'
      });
      return;
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    try {
      const cachedTeams = dataBus.getCache<TacticalUnit[]>('tactical_units') || [];
      const updatedTeams = cachedTeams.map(t => {
        if (t.id === team.id) {
          return {
            ...t,
            targetId: targetId,
            mission: (mission || 'General Support').toUpperCase(),
            timeOfCallRadioNotification: nowTime,
            timeUnitAssigned: nowTime,
            timeUnitEnroute: null,
            timeArrivedScene: null,
            timeOnScene: null,
            timeAvailable: null,
            currentStep: 'assigned' as const
          };
        }
        return t;
      });
      updateTeamsInCache(updatedTeams);

      logToLedger(
        `📥 [UNIT ASSIGNED] ${team.name}`,
        'low',
        `Assigned Tactical Unit [${team.name}] to ${getTargetLabel(targetId)} for mission: [${mission || 'General Support'}].`
      );
    } catch (err) {
      console.error("🚨 [TACTICAL MATRIX]: Failed to assign tactical unit.", err);
    }
  };

  // Approve override in conflict warning dialog
  const overrideConflictAssignment = () => {
    if (!conflictModal) return;
    const { team, newTargetId, overrideMission } = conflictModal;
    setConflictModal(null);
    synthService.stopSiren();
    
    assignTeam(team, newTargetId, overrideMission);
  };

  // Status transitions for Timeline A (Internal Event Dispatch)
  const advanceTimelineA = (teamId: string) => {
    synthService.playDropletSound();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const cachedTeams = dataBus.getCache<TacticalUnit[]>('tactical_units') || [];
    const team = cachedTeams.find(t => t.id === teamId);
    if (!team) return;

    let updates: Partial<TacticalUnit> = {};
    let logTitle = "";
    let logNotes = "";

    switch (team.currentStep) {
      case 'assigned':
        updates.currentStep = 'enroute';
        updates.timeUnitEnroute = nowTime;
        logTitle = `🚚 [UNIT ENROUTE] ${team.name}`;
        logNotes = `Tactical Unit [${team.name}] is mobilizing and enroute to ${getTargetLabel(team.targetId)}. Task: ${team.mission}.`;
        break;
      case 'enroute':
        updates.currentStep = 'arrived';
        updates.timeArrivedScene = nowTime;
        logTitle = `🏁 [UNIT ARRIVED] ${team.name}`;
        logNotes = `Tactical Unit [${team.name}] has arrived at scene of ${getTargetLabel(team.targetId)}. Initiating assessment.`;
        break;
      case 'arrived':
        updates.currentStep = 'on_scene';
        updates.timeOnScene = nowTime;
        logTitle = `👨‍🚒 [UNIT ON-SCENE] ${team.name}`;
        logNotes = `Tactical Unit [${team.name}] went active on scene. Commencing: [${team.mission}].`;
        break;
      case 'on_scene':
        updates.currentStep = 'available';
        updates.timeAvailable = nowTime;
        logTitle = `✅ [UNIT AVAILABLE] ${team.name}`;
        logNotes = `Tactical Unit [${team.name}] cleared scene and is available in staging.`;
        break;
      default:
        break;
    }

    try {
      if (Object.keys(updates).length > 0) {
        const updatedTeams = cachedTeams.map(t => {
          if (t.id === teamId) {
            return {
              ...t,
              ...updates
            };
          }
          return t;
        });
        updateTeamsInCache(updatedTeams);
      }
      if (logTitle) {
        logToLedger(logTitle, 'low', logNotes);
      }
    } catch (err) {
      console.error("🚨 [TACTICAL MATRIX]: Failed to advance Timeline A:", err);
    }
  };

  // Status transitions for Timeline B (External 911 Handover)
  const advanceTimelineB = (teamId: string) => {
    synthService.playDropletSound();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const cachedTeams = dataBus.getCache<TacticalUnit[]>('tactical_units') || [];
    const team = cachedTeams.find(t => t.id === teamId);
    if (!team) return;

    let updates: Partial<TacticalUnit> = {};
    let logTitle = "";
    let logNotes = "";

    const cachedIncidents = dataBus.getCache<Incident[]>('tactical_locations') || [];
    const targetIncident = cachedIncidents.find(i => i.id === team.targetId);
    const timeStr = getPTMilitaryTime();
    let milestoneLine = '';

    switch (team.step911) {
      case 'called':
        updates.step911 = 'arrived';
        updates.time911Arrived = nowTime;
        logTitle = `🚨 [911 AMBULANCE AT GATE]`;
        logNotes = `External emergency unit arrived at gate for ${getTargetLabel(team.targetId)}. Security escort active.`;
        milestoneLine = `${timeStr} - MUNICIPAL 911 AMBULANCE ARRIVED AT MAIN GATE (OP: SYSTEM)`;
        break;
      case 'arrived':
        updates.step911 = 'on_scene';
        updates.time911OnScene = nowTime;
        logTitle = `🚑 [911 MUNICIPAL ON-SCENE]`;
        logNotes = `Municipal ambulance reached incident scene at ${getTargetLabel(team.targetId)} and initiated medical handoff with [${team.name}].`;
        milestoneLine = `${timeStr} - MUNICIPAL 911 ON SCENE, INITIATED HANDOFF WITH ${team.name.toUpperCase()} (OP: SYSTEM)`;
        break;
      case 'on_scene':
        updates.step911 = 'transported';
        updates.time911TransportedReleased = nowTime;
        logTitle = `🏥 [911 PATIENT TRANSPORTED]`;
        logNotes = `Municipal crew completed handoff. Patient transported / released by [${team.name}].`;
        milestoneLine = `${timeStr} - PATIENT STABILIZED, ${team.name.toUpperCase()} EN ROUTE TO MEDICAL TENT (OP: TOM SMITH)`;
        break;
      case 'transported':
        updates.step911 = 'left';
        updates.time911LeftScene = nowTime;
        
        const start = team.timeOfCallRadioNotification || nowTime;
        updates.totalTime = `${start} - ${nowTime}`;
        
        logTitle = `🚒 [911 CLEARED GATE]`;
        logNotes = `Municipal ambulance exited main gate. Total coordination duration logged: ${updates.totalTime}.`;
        milestoneLine = `${timeStr} - MUNICIPAL 911 COOPERATING AMBULANCE CLEARED GATE (OP: SYSTEM)`;
        break;
      default:
        break;
    }

    try {
      if (Object.keys(updates).length > 0) {
        const updatedTeams = cachedTeams.map(t => {
          if (t.id === teamId) {
            return {
              ...t,
              ...updates
            };
          }
          return t;
        });
        updateTeamsInCache(updatedTeams);
      }
      if (logTitle) {
        logToLedger(logTitle, 'high', logNotes);
      }

      if (targetIncident && milestoneLine) {
        const currentDesc = targetIncident.description || '';
        const updatedDesc = currentDesc.trim()
          ? `${currentDesc}\n${milestoneLine}`
          : milestoneLine;

        const updatedIncidents = cachedIncidents.map(i => {
          if (i.id === targetIncident.id) {
            return {
              ...i,
              description: formatChronologicalTimeline(updatedDesc)
            };
          }
          return i;
        });
        updateIncidentsInCache(updatedIncidents);
      }
    } catch (err) {
      console.error("🚨 [TACTICAL MATRIX]: Failed to advance Timeline B:", err);
    }
  };

  // 911 Branching Logic: Triggered YES/NO at Time Arrived Scene
  const trigger911Branch = (teamId: string, called: boolean) => {
    synthService.playDropletSound();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const cachedTeams = dataBus.getCache<TacticalUnit[]>('tactical_units') || [];
    const team = cachedTeams.find(t => t.id === teamId);
    if (!team) return;

    try {
      const cachedIncidents = dataBus.getCache<Incident[]>('tactical_locations') || [];
      const targetIncident = cachedIncidents.find(i => i.id === team.targetId);
      const timeStr = getPTMilitaryTime();
      let milestoneLine = '';
      let updates: Partial<TacticalUnit> = {};

      if (called) {
        updates = {
          is911Called: true,
          step911: 'called',
          time911Called: nowTime
        };
        milestoneLine = `${timeStr} - MUNICIPAL 911 COOPERATING UNITS REQUESTED BY ${team.name.toUpperCase()} (OP: OPERATOR TOM SMITH)`;
        logToLedger(
          `🚨 [911 EMERGENCY CALLOUT] VIA ${team.name}`,
          'high',
          `Critical safety escalation on scene at ${getTargetLabel(team.targetId)}. External municipal services contacted. Setting gate escort details.`
        );
      } else {
        updates = {
          is911Called: false,
          step911: 'idle',
          time911Called: null
        };
      }

      const updatedTeams = cachedTeams.map(t => {
        if (t.id === teamId) {
          return {
            ...t,
            ...updates
          };
        }
        return t;
      });
      updateTeamsInCache(updatedTeams);

      if (targetIncident && milestoneLine) {
        const currentDesc = targetIncident.description || '';
        const updatedDesc = currentDesc.trim()
          ? `${currentDesc}\n${milestoneLine}`
          : milestoneLine;

        const updatedIncidents = cachedIncidents.map(i => {
          if (i.id === targetIncident.id) {
            return {
              ...i,
              description: formatChronologicalTimeline(updatedDesc)
            };
          }
          return i;
        });
        updateIncidentsInCache(updatedIncidents);
      }
    } catch (err) {
      console.error("🚨 [TACTICAL MATRIX]: Failed to update 911 branch:", err);
    }
  };

  // Log disposition notes and return Team back to staging
  const submitDisposition = (teamId: string, dispCode: string, notes: string) => {
    synthService.playDropletSound();
    
    const cachedTeams = dataBus.getCache<TacticalUnit[]>('tactical_units') || [];
    const team = cachedTeams.find(t => t.id === teamId);
    if (!team) return;

    try {
      logToLedger(
        `📝 [INCIDENT DISPOSITION] ${team.name}`,
        'medium',
        `Mission complete. Code: [${dispCode}]. Notes: ${notes}.`
      );

      // Reset assignment status and move back to staging in cache
      const updatedTeams = cachedTeams.map(t => {
        if (t.id === team.id) {
          return {
            ...t,
            targetId: 'staging',
            currentStep: 'staging' as const,
            step911: 'idle' as const,
            mission: null,
            timeOfCallRadioNotification: null,
            timeUnitAssigned: null,
            timeUnitEnroute: null,
            timeArrivedScene: null,
            timeOnScene: null,
            timeAvailable: null,
            time911Called: null,
            time911Arrived: null,
            time911OnScene: null,
            time911TransportedReleased: null,
            time911LeftScene: null,
            dispositionNotes: notes
          };
        }
        return t;
      });
      updateTeamsInCache(updatedTeams);
    } catch (err) {
      console.error("🚨 [TACTICAL MATRIX]: Disposition submit collapsed:", err);
    }
  };

  // Helper label resolution
  const getTargetLabel = (id: string) => {
    if (id === 'staging') return 'STAGING AREA';
    if (id === 'field_ops') return 'FIELD OPERATIONS';
    if (id === 'medical') return 'MEDICAL LANE';
    const found = incidents.find(i => i.id === id);
    return found ? found.label : 'UNKNOWN INCIDENT';
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-6 overflow-hidden select-none">
      
      {/* Header Controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[var(--neon-amber)] tracking-tight flex items-center gap-3">
            <Kanban className="text-[var(--neon-amber)] animate-pulse" size={32} />
            <span>Tactical Command Matrix</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time NIMS-compliant resource lanes, team-level assignments, and dual-timeline accountability.
          </p>
        </div>

        {/* View Segment Controller */}
        <div className="flex bg-zinc-950/60 p-1.5 border border-zinc-800 rounded-xl max-w-sm select-none">
          <button
            onClick={() => { synthService.playDropletSound(); setActiveTab('matrix'); }}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'matrix' ? 'bg-[var(--neon-amber)] text-black font-black' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Command Board
          </button>
          <button
            onClick={() => { synthService.playDropletSound(); setActiveTab('dispositions'); }}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'dispositions' ? 'bg-[var(--neon-amber)] text-black font-black' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Timelines ({teams.filter(t => t.targetId !== 'staging').length})
          </button>
        </div>
      </div>

      {activeTab === 'matrix' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
          
          {/* Lane 1: Available Teams (Staging Pool) */}
          <div className="glass-panel border border-[var(--glass-border)] p-4 rounded-2xl flex flex-col bg-zinc-950/40 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-2 text-sm font-black tracking-wider text-slate-200">
                <Users size={16} className="text-emerald-400" />
                <span>AVAILABLE TEAMS</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md">
                {teams.filter(t => t.targetId === 'staging').length} TEAMS
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scroll">
              {teams.filter(t => t.targetId === 'staging').map(team => {
                return (
                  <div
                    key={team.id}
                    className="pt-6 pb-4 px-4 bg-black border border-zinc-800 rounded-[24px] flex flex-col gap-4 transition-all duration-200 font-sans relative overflow-hidden shadow-lg"
                  >
                    {/* Absolute Top Priority Accent Bar */}
                    <div className="absolute top-0 left-0 right-0 h-[6px] rounded-t-[24px] bg-emerald-500/80" />

                    {/* Absolute Top Disband Button in Top Right */}
                    <button
                      onClick={() => handleDisbandTeam(team)}
                      title="Disband Team / Demobilize"
                      className="absolute top-3 right-3 p-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-red-500/40 hover:text-red-400 text-zinc-600 rounded-lg transition-all active:scale-95 shadow-md z-10"
                    >
                      <Trash2 size={11} className="stroke-[2.5]" />
                    </button>

                    {/* CAD-style Partition Columns */}
                    <div className="flex items-stretch gap-3">
                      {/* Left Column: Category Icon & Status Badge */}
                      <div className="flex flex-col items-center justify-center gap-1.5 pr-0.5 w-14 shrink-0 select-none">
                        <div className="w-14 h-14 rounded-[16px] bg-[#080808] border border-zinc-800/80 flex items-center justify-center shadow-inner">
                          {getTeamIcon(team.name)}
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] font-black tracking-widest transition-all select-none">
                          STG
                        </div>
                      </div>

                      {/* Thin vertical divider line */}
                      <div className="w-[1px] bg-zinc-800/80 shrink-0 self-stretch my-1" />

                      {/* Middle Column: Info Rows */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center pl-2">
                        {/* Row 1: TEAM_NAME | TEAM_TYPE in large bold white */}
                        <div className="text-base md:text-lg font-black text-white tracking-wider uppercase leading-none font-sans">
                          {team.name} | {team.type.replace('_', ' ')}
                        </div>

                        {/* Row 2: Sector Info */}
                        <div className="text-xs font-extrabold text-[#ffd000] tracking-wider uppercase mt-1.5 leading-none font-sans">
                          STAGING AREA POOL
                        </div>

                        {/* Row 3: Metadata */}
                        <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider mt-1.5 leading-none uppercase">
                          Crew Count: {team.members.length}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lane 2: Assigned Teams (Operational Field Assignments) */}
          <div className="glass-panel border border-[var(--glass-border)] p-4 rounded-2xl flex flex-col bg-zinc-950/40 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-2 text-sm font-black tracking-wider text-slate-200">
                <ShieldAlert size={16} className="text-amber-400" />
                <span>ASSIGNED</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-950/40 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md">
                {teams.filter(t => t.targetId !== 'staging').length} TEAMS
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scroll">
              {teams.filter(t => t.targetId !== 'staging').map(team => {
                return (
                  <div
                    key={team.id}
                    className="pt-6 pb-4 px-4 bg-black border border-zinc-800 rounded-[24px] flex flex-col gap-4 transition-all duration-200 font-sans relative overflow-hidden shadow-lg"
                  >
                    {/* Absolute Top Priority Accent Bar */}
                    <div className="absolute top-0 left-0 right-0 h-[6px] rounded-t-[24px] bg-amber-500/80" />

                    {/* Absolute Top Recall Button in Top Right */}
                    <button
                      onClick={() => handleRecallToStaging(team)}
                      title="Recall to Staging Area"
                      className="absolute top-3 right-3 p-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-amber-500/40 hover:text-amber-400 text-zinc-600 rounded-lg transition-all active:scale-95 shadow-md z-10"
                    >
                      <Undo size={11} className="stroke-[2.5]" />
                    </button>

                    {/* CAD-style Partition Columns */}
                    <div className="flex items-stretch gap-3">
                      {/* Left Column: Category Icon & Status Badge */}
                      <div className="flex flex-col items-center justify-center gap-1.5 pr-0.5 w-14 shrink-0 select-none">
                        <div className="w-14 h-14 rounded-[16px] bg-[#080808] border border-zinc-800/80 flex items-center justify-center shadow-inner">
                          {getTeamIcon(team.name)}
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-500/20 font-mono text-[9px] font-black tracking-widest transition-all select-none">
                          FLD
                        </div>
                      </div>

                      {/* Thin vertical divider line */}
                      <div className="w-[1px] bg-zinc-800/80 shrink-0 self-stretch my-1" />

                      {/* Middle Column: Info Rows */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center pl-2">
                        {/* Row 1: TEAM_NAME | TEAM_TYPE in large bold white */}
                        <div className="text-base md:text-lg font-black text-white tracking-wider uppercase leading-none font-sans">
                          {team.name} | {team.type.replace('_', ' ')}
                        </div>

                        {/* Row 2: Sector Info */}
                        <div className="text-xs font-extrabold text-[#ffd000] tracking-wider uppercase mt-1.5 leading-none font-sans truncate">
                          {getTargetLabel(team.targetId)}
                        </div>

                        {/* Row 3: Metadata */}
                        <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider mt-1.5 leading-none uppercase truncate font-sans">
                          Mission: {team.mission || 'GENERAL SUPPORT'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lane 3: Active Incident Assignments */}
          <div className="glass-panel border border-[var(--glass-border)] p-4 rounded-2xl flex flex-col bg-zinc-950/40 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-2 text-sm font-black tracking-wider text-slate-200">
                <MapPin size={16} className="text-[var(--neon-amber)]" />
                <span>INCIDENT SCENES</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { synthService.playDropletSound(); setShowAddIncidentForm(!showAddIncidentForm); }}
                  className="px-2.5 py-1 rounded bg-[rgba(255,191,0,0.1)] hover:bg-[rgba(255,191,0,0.2)] border border-[rgba(255,191,0,0.3)] text-[10px] font-mono text-[var(--neon-amber)] font-bold transition-all uppercase"
                >
                  {showAddIncidentForm ? 'CANCEL' : '+ ADD'}
                </button>
                <span className="text-[10px] font-mono font-bold bg-amber-950/40 border border-amber-500/20 text-[var(--neon-amber)] px-2 py-0.5 rounded-md">
                  {incidents.length} SCENES
                </span>
              </div>
            </div>

            {/* Waypoint Adder panel */}
            <AnimatePresence>
              {showAddIncidentForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 font-mono text-[10px]">
                    <div className="text-[10px] font-black tracking-wider text-[var(--neon-amber)] uppercase border-b border-zinc-900 pb-1.5 flex items-center gap-1.5">
                      <Flame size={12} className="animate-pulse" />
                      <span>ESTABLISH INCIDENT WAYPOINT</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-500 font-bold uppercase block text-[8px]">Landmark / Sector Preset</label>
                      <select
                        value={incLandmark}
                        onChange={(e) => {
                          setIncLandmark(e.target.value);
                          synthService.playDropletSound();
                          const preset = LANDMARK_PRESETS.find(p => p.id === e.target.value);
                          if (preset && preset.id !== 'CUSTOM') {
                            setIncLat(preset.lat.toString());
                            setIncLng(preset.lng.toString());
                          }
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg p-2 focus:outline-none focus:border-amber-500/50 animate-none"
                      >
                        {LANDMARK_PRESETS.map(preset => (
                          <option key={preset.id} value={preset.id}>{preset.label}</option>
                        ))}
                        <option value="CUSTOM">OTHER / MANUAL COORDINATES</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-500 font-bold uppercase block text-[8px]">Specific Site Detail / Address</label>
                      <input
                        type="text"
                        placeholder="e.g. GATE 2 ROW 14, BEHIND STAGE BARRIER"
                        value={incDetails}
                        onChange={(e) => setIncDetails(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-[10px] text-slate-100 placeholder-zinc-600 rounded-lg p-2 outline-none focus:border-amber-500/50 uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-500 font-bold uppercase block text-[8px]">Waypoint Icon Type</label>
                      <select
                        value={incIcon}
                        onChange={(e) => {
                          setIncIcon(e.target.value);
                          synthService.playDropletSound();
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg p-2 focus:outline-none"
                      >
                        <option value="assets/icons/teams/first_aid.svg">🏥 First Aid / Medical Alert</option>
                        <option value="assets/icons/teams/security.svg">🛡️ Security Incident</option>
                        <option value="assets/icons/hazards/mva.svg">🚗 Vehicle Accident (MVA)</option>
                        <option value="assets/icons/hazards/wildlandfire.svg">🔥 Fire / Smoke Alert</option>
                        <option value="assets/icons/locations/cp.svg">🚩 Command Post Point</option>
                        <option value="assets/icons/locations/staging.svg">📦 Staging Area Point</option>
                      </select>
                    </div>

                    {incLandmark === 'CUSTOM' && (
                      <div className="space-y-2 border-t border-zinc-900 pt-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="toggleManualCoords"
                            checked={showManualCoords}
                            onChange={(e) => {
                              setShowManualCoords(e.target.checked);
                              synthService.playDropletSound();
                            }}
                            className="accent-[var(--neon-amber)] cursor-pointer"
                          />
                          <label htmlFor="toggleManualCoords" className="text-zinc-400 font-bold uppercase cursor-pointer text-[8px]">
                            Input Manual Coordinates (Advanced)
                          </label>
                        </div>

                        {showManualCoords && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-zinc-600 text-[7px] uppercase font-bold block">Latitude</label>
                              <input
                                type="number"
                                step="0.0001"
                                value={incLat}
                                onChange={(e) => setIncLat(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 text-[10px] text-slate-100 rounded-lg p-1.5 outline-none font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-zinc-600 text-[7px] uppercase font-bold block">Longitude</label>
                              <input
                                type="number"
                                step="0.0001"
                                value={incLng}
                                onChange={(e) => setIncLng(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 text-[10px] text-slate-100 rounded-lg p-1.5 outline-none font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={handleAddIncident}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold uppercase rounded-lg transition-all text-[10px]"
                    >
                      Engage Waypoint
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scroll">
              {incidents.length === 0 ? (
                <div className="text-center py-16 text-xs text-gray-500 font-mono italic">
                  No active incident scenes logged.
                </div>
              ) : (
                incidents.map(inc => {
                  const incUnits = teams.filter(t => t.targetId === inc.id);
                  const assignedUnits = incUnits.map(team => {
                    let status = 'DISPATCHED';
                    if (team.timeAvailable) {
                      status = 'RELEASED';
                    } else if (team.timeArrivedScene) {
                      status = 'ON SCENE';
                    }
                    return {
                      id: team.id,
                      name: team.name,
                      status
                    };
                  });

                  const addressText = inc.label.includes(' - ') ? inc.label.split(' - ').slice(1).join(' - ') : inc.label;

                  return (
                    <CanvaIncidentCard
                      key={inc.id}
                      priority={inc.priority || 'medium'}
                      icon={getIncidentIcon(inc.nature, inc.icon)}
                      is911={!!(inc.is911Required || inc.priority === '911')}
                      title={inc.incidentTitle || splitIgnoringBrackets(inc.label)[0] || ''}
                      incidentType={inc.incidentType || inc.nature || 'GENERAL'}
                      division={inc.division || 'DIV-A'}
                      location={addressText}
                      serialId={inc.serialId || 'MIT-XXXXXXXX'}
                      timestamp={inc.timestamp || new Date().toISOString()}
                      assignedUnits={assignedUnits}
                      onResolve={() => {
                        setResolvingIncident({ id: inc.id, label: inc.label });
                        setCustomDisposition('ALL FIELD TEAMS RELEASED. HAZARDS FULLY MITIGATED AND SITE RENDERED SAFE.');
                      }}
                      onCycleUnitStatus={(unitId) => handleCycleUnitStatus(unitId)}
                      onClick={() => {
                        synthService.playDropletSound();
                        setSelectedIncidentId(inc.id);
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>

        </div>
      ) : (
        /* DISPOSITIONS & TIMELINES OVERVIEW PANEL */
        <div className="flex-1 glass-panel border border-[var(--glass-border)] p-6 rounded-2xl flex flex-col bg-zinc-950/40 min-h-0 overflow-y-auto space-y-4">
          <div className="flex items-center gap-2 pb-3 mb-2 border-b border-[var(--glass-border)] text-base font-black tracking-wider text-slate-200 font-mono">
            <Clock size={18} className="text-[var(--neon-amber)]" />
            <span>ACTIVE INCIDENT CONTROL TIMELINES ({teams.filter(t => t.targetId !== 'staging').length})</span>
          </div>

          {teams.filter(t => t.targetId !== 'staging').length === 0 ? (
            <div className="text-center py-16 text-xs text-gray-500 font-mono italic">
              No active operational timelines. Deploy teams to register radio call milestones.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teams.filter(t => t.targetId !== 'staging').map(team => {
                return (
                  <UnitTimelineCard 
                    key={team.id}
                    team={team}
                    responders={responders}
                    advanceA={advanceTimelineA}
                    advanceB={advanceTimelineB}
                    trigger911={trigger911Branch}
                    clearAssign={submitDisposition}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC MISSION INPUT DIALOG MODAL */}
      {selectedTeam && assignTargetId && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[5000] p-4 font-sans">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-zinc-950 border border-zinc-800 p-6 rounded-3xl space-y-5 shadow-2xl"
          >
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black block">INCIDENT DEPLOYMENT TASKING</span>
              <h3 className="text-lg font-extrabold text-slate-100 font-mono mt-1">
                Deploy {selectedTeam.name}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed font-mono mt-1.5 uppercase">
                TARGET SCENE: <span className="text-amber-500 font-bold">{getTargetLabel(assignTargetId)}</span>
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-300 block uppercase tracking-wider">Specify Operational Task / Mission</label>
              <input
                type="text"
                placeholder="e.g. Crowd Control, Egress Obstacle Clearing, Flagging Emergency Units..."
                value={assignMissionText}
                onChange={(e) => setAssignMissionText(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-sm text-slate-100 placeholder-zinc-600 rounded-xl p-3 outline-none focus:border-amber-500/50 uppercase font-mono"
              />
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {['CROWD CONTROL', 'EGRESS ROUTING', 'GATE ESCORT', 'FAMILY RELATIONS', 'FIRST AID OUTPOST', 'STRETCHER TEAM'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => { synthService.playDropletSound(); setAssignMissionText(preset); }}
                    className="text-[10px] font-mono font-bold bg-zinc-900 hover:bg-zinc-850 text-zinc-400 px-2.5 py-1.5 rounded-lg border border-zinc-800"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={() => {
                  synthService.playDropletSound();
                  setSelectedTeam(null);
                  setAssignTargetId(null);
                  setAssignMissionText('');
                }}
                className="flex-1 py-3 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-xs font-bold text-zinc-400 uppercase transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  assignTeam(selectedTeam, assignTargetId, assignMissionText);
                  setSelectedTeam(null);
                  setAssignTargetId(null);
                  setAssignMissionText('');
                }}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-extrabold uppercase transition-all"
              >
                Dispatch Asset
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* DOUBLE ASSIGNMENT SAFETY CONFLICT MODAL */}
      {conflictModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[6000] p-4 font-sans">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-red-950/20 border border-red-500/40 p-6 rounded-3xl space-y-4 shadow-2xl relative"
          >
            <div className="flex items-start gap-3 text-red-400">
              <AlertTriangle className="text-red-500 flex-shrink-0 animate-bounce animate-pulse" size={24} />
              <div>
                <span className="text-[10px] font-mono font-black tracking-widest block uppercase text-red-500">TACTICAL ASSIGNMENT CONFLICT</span>
                <h3 className="text-md font-extrabold font-mono text-slate-100 mt-1 uppercase">
                  {conflictModal.team.name} Is Already Deployed
                </h3>
              </div>
            </div>

            <p className="text-xs text-red-200/80 leading-relaxed font-mono uppercase">
              This unit is currently operating at **{conflictModal.currentLocation}**. Re-routing them will interrupt and abort their current active event timeline.
            </p>

            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={() => { synthService.stopSiren(); synthService.playDropletSound(); setConflictModal(null); }}
                className="flex-1 py-3 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-xs font-bold text-red-300 uppercase transition-all"
              >
                Abstain & Retain Post
              </button>
              <button
                onClick={overrideConflictAssignment}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold uppercase transition-all"
              >
                Force Re-Route
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Centered Incident Response Popup Modal */}
      <AnimatePresence>
        {selectedIncident && (() => {
          const pStyles = getBannerPriorityStyles(selectedIncident.priority);
          const addressText = selectedIncident.label.includes(' - ') ? selectedIncident.label.split(' - ').slice(1).join(' - ') : selectedIncident.label;
          const assignedTeamsForIncident = teams.filter(t => t.targetId === selectedIncident.id);
          const stagedTeams = teams.filter(t => t.targetId === 'staging');

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9000] font-sans"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className={`w-full max-w-2xl bg-zinc-950/95 border ${pStyles.borderColor} rounded-[24px] max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.85)] relative`}
              >
                {/* Priority top accent line */}
                <div className={`absolute top-0 left-0 right-0 h-[6px] ${pStyles.topBarColor}`} />

                {/* Absolute Close "X" Button */}
                <button
                  onClick={() => {
                    synthService.playDropletSound();
                    setSelectedIncidentId(null);
                  }}
                  className="absolute top-5 right-5 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all active:scale-95 shadow-md z-50 cursor-pointer animate-none"
                  title="Close"
                >
                  <X size={16} className="stroke-[2.5]" />
                </button>

                {/* Header Block */}
                <div className="pt-6 pb-4 px-6 border-b border-zinc-900 flex items-center justify-between">
                  <div className="flex items-center gap-4 pr-12">
                    <div className="w-14 h-14 rounded-[16px] bg-[#080808] border border-zinc-800 flex items-center justify-center shadow-inner shrink-0">
                      {getIncidentIcon(selectedIncident.nature, selectedIncident.icon)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-black text-white tracking-wider uppercase leading-none font-sans">
                        {(() => {
                          const titlePart = splitIgnoringBrackets(selectedIncident.label)[0] || '';
                          const title = selectedIncident.incidentTitle || titlePart;
                          const type = selectedIncident.incidentType || selectedIncident.nature || 'GENERAL';
                          return cleanTitleAndType(title, type);
                        })()}
                      </div>
                      <div className="text-xs font-extrabold text-[#ffd000] tracking-wider uppercase mt-1.5 leading-none flex items-center gap-1.5 font-sans">
                        <span>{selectedIncident.division || 'DIV-A'}</span>
                        <span className="text-zinc-700 font-normal">|</span>
                        <span className="truncate" title={addressText}>{cleanAddressForDisplay(addressText).toUpperCase()}</span>
                      </div>
                      <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider mt-2 leading-none uppercase">
                        {selectedIncident.serialId || 'MIT-XXXXXXXX'} | DISPATCHED: {selectedIncident.timestamp ? new Date(selectedIncident.timestamp).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body Block (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scroll">
                  {/* Row: Location */}
                  <div className="flex flex-col p-3.5 bg-zinc-950/60 border border-zinc-900 rounded-xl gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 shrink-0">
                        <MapPin size={15} className="text-amber-500" />
                        <span className="text-xs font-bold text-zinc-400 font-mono">INCIDENT LOCATION:</span>
                      </div>
                      {editingLocationId === selectedIncident.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateIncidentLocation(selectedIncident, editedLocationText)}
                            className="px-2 py-1 bg-green-950/40 border border-green-800 text-[10px] font-mono font-bold text-green-400 hover:text-white hover:bg-green-600 rounded-lg transition-all cursor-pointer animate-none"
                          >
                            SAVE
                          </button>
                          <button
                            onClick={() => setEditingLocationId(null)}
                            className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer animate-none"
                          >
                            CANCEL
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            synthService.playDropletSound();
                            setEditingLocationId(selectedIncident.id);
                            setEditedLocationText(addressText);
                          }}
                          className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 text-[9px] font-mono font-bold text-zinc-400 hover:text-amber-400 rounded-md transition-all cursor-pointer animate-none"
                        >
                          EDIT
                        </button>
                      )}
                    </div>
                    {editingLocationId === selectedIncident.id ? (
                      <input
                        type="text"
                        value={editedLocationText}
                        onChange={(e) => setEditedLocationText(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateIncidentLocation(selectedIncident, editedLocationText);
                          }
                        }}
                        className="w-full bg-black/60 border border-zinc-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono font-black"
                      />
                    ) : (
                      <span className="text-xs font-black text-white font-mono whitespace-normal break-words text-left leading-relaxed pl-5">
                        {cleanAddressForDisplay(addressText).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Row: Coordinates */}
                  <div className="hidden print:flex items-center justify-between p-3.5 bg-zinc-950/60 border border-zinc-900 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Activity size={15} className="text-amber-500" />
                      <span className="text-xs font-bold text-zinc-400 font-mono">COORDINATES:</span>
                    </div>
                    <span className="text-xs font-black text-[#ffd000] font-mono">{selectedIncident.lat.toFixed(5)}, {selectedIncident.lng.toFixed(5)}</span>
                  </div>

                  {/* Narrative Block */}
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/50 space-y-2">
                    <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider uppercase leading-none">
                      📥 NARRATIVE / DISPOSITION FOLLOW-UP NARRATIVE
                    </div>
                    <div className="text-xs md:text-sm font-sans font-medium text-zinc-100 leading-relaxed max-h-[120px] overflow-y-auto custom-scroll pr-1">
                      {selectedIncident.description || 'NO ADDITIONAL NOTES OR OPERATIONAL NARRATIVE RECORDED.'}
                    </div>
                  </div>

                  {/* Mutual Aid Agencies */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider uppercase leading-none">
                      🏢 MUTUAL AID AGENCIES ONSCENE
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(!selectedIncident.presentAgencies || selectedIncident.presentAgencies.length === 0) ? (
                        <div className="text-xs text-zinc-600 italic font-sans py-1">
                          STANDBY - NO MUTUAL AID AGENCIES CURRENTLY PRESENT.
                        </div>
                      ) : (
                        selectedIncident.presentAgencies.map((agency, idx) => (
                          <span
                            key={idx}
                            className="py-1 px-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-mono font-bold text-zinc-400 select-none uppercase tracking-wide flex items-center gap-1.5"
                          >
                            <span>{agency}</span>
                            <button
                              type="button"
                              onClick={() => {
                                synthService.playDropletSound();
                                handleRemoveAgencyFromIncident(agency, selectedIncident);
                              }}
                              className="text-zinc-600 hover:text-red-400 font-bold transition-colors p-0.5 hover:bg-zinc-800 rounded flex items-center justify-center cursor-pointer"
                              title={`Remove ${agency}`}
                            >
                              <X size={10} className="stroke-[2.5]" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    {/* Real-time inline agency addition */}
                    <div className="flex gap-2 mt-1.5">
                      <input
                        type="text"
                        id="modal-agency-input"
                        placeholder="ADD MUTUAL AID AGENCY (E.G. SEATTLE POLICE, SFD)..."
                        className="flex-1 bg-black/60 border border-zinc-900 hover:border-zinc-800 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder-zinc-700 uppercase focus:outline-none focus:border-amber-500 font-semibold font-mono"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value;
                            if (val.trim()) {
                              handleAddAgencyToIncident(val, selectedIncident);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('modal-agency-input') as HTMLInputElement;
                          if (input && input.value.trim()) {
                            handleAddAgencyToIncident(input.value, selectedIncident);
                            input.value = '';
                          }
                        }}
                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-amber-500/45 text-slate-300 hover:text-amber-400 font-bold text-[10px] uppercase rounded-lg tracking-wider transition-all font-mono shrink-0 cursor-pointer animate-none animate-none hover:scale-100"
                      >
                        + ADD
                      </button>
                    </div>
                  </div>

                  {/* Assigned Tactical Units Section */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider uppercase">
                        🛡️ ASSIGNED NIMS UNITS ({assignedTeamsForIncident.length})
                      </span>
                      {stagedTeams.length > 0 && (
                        <div className="flex items-center gap-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignTeamToIncident(e.target.value, selectedIncident);
                                e.target.value = ''; // Reset selection
                              }
                            }}
                            className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-lg py-1 px-2.5 text-[10px] font-mono font-bold text-amber-500 outline-none focus:border-amber-500 transition-all cursor-pointer animate-none"
                          >
                            <option value="">+ DEPLOY STAGED TEAM...</option>
                            {stagedTeams.map(team => (
                              <option key={team.id} value={team.id}>
                                {team.name} [{team.type.replace('_', ' ')}]
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {assignedTeamsForIncident.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-zinc-900 rounded-xl text-xs text-zinc-600 font-sans italic">
                          No tactical teams deployed to this incident yet. Use the dropdown above to assign staging units.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {assignedTeamsForIncident.map(team => {
                            let statusLabel = 'DISPATCHED';

                            if (team.timeAvailable) {
                              statusLabel = 'RELEASED';
                            } else if (team.timeArrivedScene) {
                              statusLabel = 'ON SCENE';
                            }

                            return (
                              <div
                                key={team.id}
                                className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 shadow-inner font-sans"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-white truncate uppercase">
                                    {team.name}
                                  </div>
                                  <div className="text-[9px] font-bold text-zinc-500 font-mono uppercase tracking-wider mt-0.5">
                                    {team.type.replace('_', ' ')}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <CanvaUnitBadge
                                    name={team.name}
                                    status={statusLabel}
                                    label={statusLabel}
                                    onClick={() => handleCycleUnitStatus(team.id)}
                                  />

                                  <button
                                    onClick={() => handleRecallTeamToStaging(team.id, selectedIncident)}
                                    className="p-1 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-red-500/40 hover:text-red-400 text-zinc-500 rounded-lg transition-all active:scale-95 cursor-pointer animate-none"
                                    title="Recall unit to staging"
                                  >
                                    <Undo size={12} className="stroke-[2.5]" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Complete Address Section for Official Records */}
                  <div className="p-3.5 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-1.5 pt-4 border-t border-zinc-900 font-mono">
                    <div className="flex items-center gap-2">
                      <MapPin size={15} className="text-amber-500" />
                      <span className="text-xs font-bold text-zinc-400">COMPLETE REPORT INCIDENT ADDRESS:</span>
                    </div>
                    <div className="text-xs font-black text-white uppercase whitespace-normal break-words pl-5 leading-normal">
                      {addressText.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between gap-4 shrink-0 overflow-x-auto custom-scroll">
                  <button
                    onClick={() => {
                      synthService.playDropletSound();
                      dataBus.broadcast({
                        type: 'SYSTEM',
                        origin: 'COMMAND MATRIX',
                        payload: { action: 'NAVIGATE', moduleId: 'ledger' },
                        severity: 'low'
                      });
                      setSelectedIncidentId(null);
                    }}
                    className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-[10px] md:text-xs font-bold text-zinc-300 hover:text-white rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-md cursor-pointer font-mono tracking-wide shrink-0 animate-none"
                  >
                    <FileText size={14} className="text-amber-500" />
                    <span>ICS_214 LOG</span>
                  </button>

                  {/* Escalate to 911 Button */}
                  {selectedIncident.is911Required ? (
                    <button
                      disabled
                      className="py-2.5 px-4 bg-red-600 border border-red-500 text-[10px] md:text-xs font-bold text-white rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse font-mono tracking-wide shrink-0"
                    >
                      <Siren size={14} className="animate-spin" />
                      <span>ESCALATED | 911</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        synthService.playDropletSound();
                        const cachedIncidents = dataBus.getCache<Incident[]>('tactical_locations') || [];
                        const updatedIncidents = cachedIncidents.map(i => {
                          if (i.id === selectedIncident.id) {
                            return {
                              ...i,
                              is911Required: true
                            };
                          }
                          return i;
                        });
                        updateIncidentsInCache(updatedIncidents);
                        logToLedger(
                          `🚨 [911 ESCALATION] INCIDENT ${selectedIncident.serialId || 'MIT'} ESCALATED`,
                          'critical',
                          `Incident [${selectedIncident.incidentTitle || selectedIncident.label}] has been escalated to 911 Emergency Response.`
                        );
                      }}
                      className="py-2.5 px-4 bg-red-950/40 hover:bg-red-600 border border-red-900/60 hover:border-red-500 text-[10px] md:text-xs font-bold text-red-400 hover:text-white rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-md cursor-pointer font-mono tracking-wide shrink-0 animate-none"
                    >
                      <Siren size={14} className="text-red-500" />
                      <span>ESCALATE | 911</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedIncidentId(null);
                      setResolvingIncident({ id: selectedIncident.id, label: selectedIncident.label });
                      setCustomDisposition('ALL FIELD TEAMS RELEASED. HAZARDS FULLY MITIGATED AND SITE RENDERED SAFE.');
                    }}
                    className="py-2.5 px-4 bg-red-950/40 hover:bg-red-950/70 border border-red-900/60 hover:border-red-500/50 text-[10px] md:text-xs font-bold text-red-400 hover:text-white rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-md cursor-pointer font-mono tracking-wide shrink-0 animate-none"
                  >
                    <Archive size={14} />
                    <span>ARCHIVE</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* 4-Part Report Disposition Resolution Sub-Modal */}
      <AnimatePresence>
        {resolvingIncident && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-4 font-sans">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg"
            >
              <CanvaGlassPanel className="flex flex-col space-y-4 border-[var(--neon-amber)] shadow-[0_0_40px_rgba(245,158,11,0.15)]">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-black text-slate-100 tracking-wide uppercase flex items-center gap-2">
                    <Archive size={16} className="text-[var(--neon-amber)]" />
                    <span>INCIDENT RESOLUTION DISPOSITION</span>
                  </h3>
                  <button 
                    onClick={() => {
                      synthService.playDropletSound();
                      setResolvingIncident(null);
                    }}
                    className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 font-mono">
                  <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">TARGET INCIDENT WAYPOINT</span>
                    <span className="text-xs font-extrabold text-slate-200 uppercase">{resolvingIncident.label}</span>
                  </div>

                  <CanvaTextarea
                    label="Disposition Narrative / Resolution Details"
                    placeholder="Enter final resolution details or how the incident was closed out..."
                    value={customDisposition}
                    onChange={(e) => setCustomDisposition(e.target.value)}
                    rows={4}
                    className="text-xs normal-case font-mono"
                  />
                  <p className="text-[9px] text-zinc-500 uppercase leading-normal">
                    This narrative is saved directly into the immutable log ledger as the final disposition status, automatically populating Section 4 of the official FEMA ICS-214 report.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <CanvaButton
                    onClick={() => {
                      synthService.playDropletSound();
                      setResolvingIncident(null);
                    }}
                    className="!py-2 !px-4 text-xs font-bold text-zinc-400 border-zinc-800 hover:bg-zinc-900 animate-none hover:scale-100 cursor-pointer"
                  >
                    Cancel
                  </CanvaButton>
                  <CanvaButton
                    onClick={() => {
                      const id = resolvingIncident.id;
                      const label = resolvingIncident.label;
                      setResolvingIncident(null);
                      handleResolveIncident(id, label, customDisposition);
                    }}
                    variant="primary"
                    className="!py-2 !px-5 text-xs font-bold cursor-pointer"
                  >
                    CONFIRM RESOLUTION
                  </CanvaButton>
                </div>
              </CanvaGlassPanel>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

/* INTERNAL COMPONENT: TEAM STATUS TIMELINE CARD */

interface UnitTimelineProps {
  team: TacticalUnit;
  responders: Responder[];
  advanceA: (teamId: string) => void;
  advanceB: (teamId: string) => void;
  trigger911?: (teamId: string, called: boolean) => void;
  clearAssign: (teamId: string, dispCode: string, dispNotes: string) => void;
}

const STEP_CHECKLISTS: Record<string, string[]> = {
  assigned: ["Confirm mission dispatch notification", "Check responder gear & roster"],
  enroute: ["Verify radio channel to L-ALPHA", "Confirm GPS routing active", "Secondary dispatch contact logged"],
  arrived: ["Size-up report radioed", "Establish local command post", "Deploy spotters / safety check"],
  on_scene: ["Continuous air monitoring active", "Verify physical safety perimeter", "Accountability timer running"],
  available: ["Submit final field notes", "Demobilize personnel"]
};

export const UnitTimelineCard: React.FC<UnitTimelineProps> = ({ team, responders, advanceA, advanceB, trigger911: _trigger911, clearAssign }) => {
  const [dispCode, setDispCode] = useState('RSL');
  const [dispNotes, setDispNotes] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const rosterText = team.members.map((mId: string) => {
    const res = responders.find((r: Responder) => r.id === mId);
    return res ? `${res.name} (${res.callsign})` : mId;
  }).join(', ');

  const getActiveTimestamp = (): string | null => {
    switch (team.currentStep) {
      case 'enroute': return team.timeUnitEnroute || null;
      case 'arrived': return team.timeArrivedScene || null;
      case 'on_scene': return team.timeOnScene || null;
      case 'available': return team.timeAvailable || null;
      case 'assigned': return team.timeUnitAssigned || null;
      default: return null;
    }
  };

  useEffect(() => {
    const timestamp = getActiveTimestamp();
    if (!timestamp) {
      setElapsed(0);
      return;
    }

    const updateTimer = () => {
      const parts = timestamp.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parts.length > 2 ? parseInt(parts[2], 10) : 0;

        const now = new Date();
        const eventTime = new Date();
        eventTime.setHours(hours, minutes, seconds, 0);

        if (now.getTime() < eventTime.getTime()) {
          eventTime.setDate(eventTime.getDate() - 1);
        }

        const diffSec = Math.floor((now.getTime() - eventTime.getTime()) / 1000);
        setElapsed(diffSec >= 0 ? diffSec : 0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [team.currentStep, team.timeUnitEnroute, team.timeArrivedScene, team.timeOnScene, team.timeAvailable, team.timeUnitAssigned]);

  const isWelfareAlert = elapsed > 600; // 10 minutes

  const renderTimelineA = () => {
    switch (team.currentStep) {
      case 'assigned':
        return (
          <button 
            onClick={() => advanceA(team.id)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer animate-none"
          >
            <span>MARK MOBILIZED & ENROUTE</span>
            <ChevronRight size={16} className="animate-pulse text-amber-400" />
          </button>
        );
      case 'enroute':
        return (
          <button 
            onClick={() => advanceA(team.id)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer animate-none"
          >
            <span>MARK ARRIVED GATE / VENUE</span>
            <ChevronRight size={16} className="animate-pulse text-cyan-400" />
          </button>
        );
      case 'arrived':
        return (
          <div className="space-y-3">
            <button 
              onClick={() => advanceA(team.id)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 border border-emerald-500 text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer animate-none hover:scale-100"
            >
              <span>COMMIT TO ACTIVE POST</span>
              <ChevronRight size={16} strokeWidth={3} className="text-black" />
            </button>
          </div>
        );
      case 'on_scene':
        return (
          <div className="space-y-4">
            {team.is911Called && team.step911 !== 'left' && (
              <div className="p-3.5 bg-red-950/10 border border-red-500/20 rounded-xl space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between text-red-400 font-bold uppercase text-[10px] tracking-widest">
                  <span>🚑 911 COOPERATOR SYNC</span>
                  <span className="animate-pulse bg-red-950 border border-red-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                    STAGE: {team.step911}
                  </span>
                </div>
                
                {team.step911 === 'called' && (
                  <button 
                    onClick={() => advanceB(team.id)}
                    className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg uppercase font-bold text-[10px] tracking-wide cursor-pointer animate-none"
                  >
                    MARK AMBULANCE AT GATE
                  </button>
                )}
                {team.step911 === 'arrived' && (
                  <button 
                    onClick={() => advanceB(team.id)}
                    className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg uppercase font-bold text-[10px] tracking-wide cursor-pointer animate-none"
                  >
                    MARK AMBULANCE ON SCENE
                  </button>
                )}
                {team.step911 === 'on_scene' && (
                  <button 
                    onClick={() => advanceB(team.id)}
                    className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg uppercase font-bold text-[10px] tracking-wide cursor-pointer animate-none"
                  >
                    COMPLETE PATIENT HANDOFF
                  </button>
                )}
                {team.step911 === 'transported' && (
                  <button 
                    onClick={() => advanceB(team.id)}
                    className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg uppercase font-bold text-[10px] tracking-wide cursor-pointer animate-none"
                  >
                    MARK AMBULANCE LEFT VENUE
                  </button>
                )}
              </div>
            )}

            <button 
              onClick={() => advanceA(team.id)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer animate-none"
            >
              <span>DEMOBILIZE & CLEAR POST</span>
              <ChevronRight size={16} className="text-zinc-400" />
            </button>
          </div>
        );
      case 'available':
        return (
          <div className="space-y-4">
            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3.5">
              <span className="text-[10px] font-mono font-black tracking-widest block uppercase text-zinc-400">
                Log Incident Disposition
              </span>
              
              <div className="space-y-2.5">
                <select 
                  value={dispCode}
                  onChange={(e) => setDispCode(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 rounded-lg p-2.5 focus:outline-none cursor-pointer animate-none"
                >
                  <option value="RSL">✅ [RSL] SITUATION RESOLVED</option>
                  <option value="REF">🏥 [REF] TREATED & REFUSED</option>
                  <option value="TRN">🚑 [TRN] TRANSPORTED TO HOSPITAL</option>
                  <option value="FLW">📝 [FLW] FOLLOW-UP COMPLETED</option>
                  <option value="UTL">⚠️ [UTL] UNABLE TO LOCATE</option>
                </select>

                <textarea
                  placeholder="Type dispatch follow-up notations..."
                  value={dispNotes}
                  onChange={(e) => setDispNotes(e.target.value)}
                  className="w-full h-16 bg-zinc-900 border border-zinc-800 text-xs font-mono text-slate-100 placeholder-zinc-600 rounded-lg p-2.5 outline-none resize-none focus:border-emerald-500/40"
                />
              </div>

              <button
                onClick={() => clearAssign(team.id, dispCode, dispNotes)}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-extrabold uppercase rounded-lg transition-all cursor-pointer animate-none hover:scale-100"
              >
                Log to ICS-214 & Clear
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all space-y-4 font-mono ${
      isWelfareAlert 
      ? 'bg-amber-950/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
      : 'bg-zinc-900/40 border-zinc-800/80 shadow-md'
    }`}>
      <div className="flex items-start justify-between font-sans">
        <div>
          <span className="text-[9px] font-mono font-black text-amber-500 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
            {team.type}
          </span>
          <strong className="text-sm text-slate-100 font-mono ml-2 uppercase">
            {team.name}
          </strong>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            ROSTER: <span className="font-semibold text-zinc-400">{rosterText || 'NONE'}</span>
          </div>
          {team.mission && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono mt-1.5 font-bold">
              <CornerDownRight size={12} className="text-amber-500" />
              <span>TASK: {team.mission}</span>
            </div>
          )}
        </div>
        
        {/* Step Badge with Elapsed Accountability Timer */}
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-zinc-950 border ${
            isWelfareAlert 
            ? 'border-amber-500 text-amber-500 animate-pulse' 
            : 'border-zinc-800 text-zinc-400'
          }`}>
            {team.currentStep}
          </span>
          {elapsed > 0 && (
            <span className={`text-[9px] font-mono font-bold flex items-center gap-1 ${
              isWelfareAlert ? 'text-amber-500 animate-pulse font-extrabold' : 'text-zinc-500'
            }`}>
              <Clock size={10} />
              {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </div>

      {/* Operational milestones display */}
      <div className="flex items-center justify-between text-[8px] font-mono text-zinc-600 border-t border-b border-zinc-900/40 py-2">
        <div>Call: {team.timeOfCallRadioNotification || '--:--'}</div>
        <div>Enroute: {team.timeUnitEnroute || '--:--'}</div>
        <div>Arrived: {team.timeArrivedScene || '--:--'}</div>
        <div>On-Scene: {team.timeOnScene || '--:--'}</div>
      </div>

      {/* Tactical Step Checklist */}
      {STEP_CHECKLISTS[team.currentStep] && (
        <div className="p-3 bg-black/40 border border-zinc-900/60 rounded-xl space-y-2 text-[10px] font-mono">
          <div className="text-zinc-500 font-bold uppercase tracking-wider">ICS-214 STEP CHECKLIST:</div>
          <div className="space-y-1.5 font-sans">
            {STEP_CHECKLISTS[team.currentStep].map((item, idx) => {
              const checkId = `${team.id}-${team.currentStep}-${idx}`;
              const isChecked = checklist.includes(checkId);
              return (
                <button
                  key={idx}
                  onClick={() => {
                    synthService.playDropletSound();
                    setChecklist(prev => 
                      prev.includes(checkId) ? prev.filter(id => id !== checkId) : [...prev, checkId]
                    );
                  }}
                  className="w-full flex items-center gap-2 text-left hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                    isChecked ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-zinc-800'
                  }`}>
                    {isChecked && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span className={isChecked ? 'line-through text-zinc-500 text-[10px]' : 'text-slate-300 text-[10px]'}>
                    {item}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-2">
        {renderTimelineA()}
      </div>
    </div>
  );
};

export default TacticalMatrix;
