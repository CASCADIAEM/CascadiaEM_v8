import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, X, MapPin, RotateCcw, Trash2, Activity, Flame, Shield, Building2, Wrench, Truck
} from 'lucide-react';
import { dataBus } from '../services/DataBus';
import { useDropdowns } from '../services/DropdownService';
import { 
  CanvaGlassPanel, 
  CanvaButton, 
  CanvaInput, 
  CanvaSelect,
  CanvaFormRow,
  CanvaDropdownCustomizer
} from '../components/DesignSandbox';
import type { ICSResource } from './ResourcesManager';

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
  incidentTitle?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical' | string;
  unitsAssigned?: string[];
  presentAgencies?: string[];
  description?: string;
  timestamp?: string;
}

interface TacticalUnit {
  id: string;
  name: string;
  type: 'STRIKE_TEAM' | 'TASK_FORCE' | 'UNIT' | 'GROUP' | string;
  members: string[]; // Array of responder IDs from contacts_list
  assignedResourceIds?: string[]; // Array of physical resource IDs from ics_resources
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

const getResourceIcon = (kind: string, category: string) => {
  const k = kind.toLowerCase();
  const c = category.toLowerCase();
  if (k.includes('medic') || k.includes('ambulance') || k.includes('health') || k.includes('rescue')) {
    return <Activity className="text-red-400 shrink-0" size={12} />;
  }
  if (k.includes('fire') || k.includes('tender') || k.includes('engine') || k.includes('hazmat')) {
    return <Flame className="text-orange-400 shrink-0" size={12} />;
  }
  if (k.includes('police') || k.includes('security') || k.includes('sheriff') || k.includes('patrol')) {
    return <Shield className="text-blue-400 shrink-0" size={12} />;
  }
  if (c === 'facility' || k.includes('station') || k.includes('base') || k.includes('shelter')) {
    return <Building2 className="text-emerald-400 shrink-0" size={12} />;
  }
  if (k.includes('truck') || k.includes('vehicle')) {
    return <Truck className="text-amber-400 shrink-0" size={12} />;
  }
  return <Wrench className="text-zinc-400 shrink-0" size={12} />;
};

const TacticalTeams: React.FC = () => {
  const { dropdowns } = useDropdowns();
  // Live Data states
  const [responders, setResponders] = useState<Responder[]>([]);
  const [teams, setTeams] = useState<TacticalUnit[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<ICSResource[]>([]);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('ALL');

  // NIMS Team Builder States
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamType, setNewTeamType] = useState('STRIKE_TEAM');
  const [selectedResponderIds, setSelectedResponderIds] = useState<string[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);

  // Synchronize state from dataBus cache
  const syncFromCache = () => {
    // 1. Personnel (contacts)
    let cachedContacts = dataBus.getCache<any[]>('contacts_list');
    if (!cachedContacts || cachedContacts.length === 0) {
      cachedContacts = DEFAULT_SEED_CONTACTS;
      dataBus.setCache('contacts_list', cachedContacts);
    }
    
    // Ensure all seed contacts are mapped and have status
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
    const sanitizedTeams = cachedTeams.map(t => ({
      ...t,
      assignedResourceIds: t.assignedResourceIds || []
    }));
    setTeams(sanitizedTeams.filter(t => t.status !== 'DEMOBILIZED'));

    // 3. Tactical Locations (Incidents)
    let cachedLocations = dataBus.getCache<Incident[]>('tactical_locations');
    if (!cachedLocations) {
      cachedLocations = SEED_LOCATIONS;
      dataBus.setCache('tactical_locations', cachedLocations);
    }
    setIncidents(cachedLocations);

    // 4. Physical Resources (ics_resources)
    let cachedResources = dataBus.getCache<ICSResource[]>('ics_resources');
    if (!cachedResources) {
      cachedResources = [];
    }
    setResources(cachedResources);
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
      origin: 'TACTICAL_TEAMS_ENGINE',
      payload: { entity: 'contacts_list', action: 'update' },
      severity: 'low'
    });
  };

  const updateResourcesInCache = (updatedResources: ICSResource[]) => {
    dataBus.setCache('ics_resources', updatedResources);
    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'TACTICAL_TEAMS_ENGINE',
      payload: { entity: 'ics_resources', action: 'update' },
      severity: 'low'
    });
  };

  const updateTeamsInCache = (updatedTeams: TacticalUnit[]) => {
    dataBus.setCache('tactical_units', updatedTeams);
    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'TACTICAL_TEAMS_ENGINE',
      payload: { entity: 'tactical_units', action: 'update' },
      severity: 'low'
    });
  };

  // Helper: Log event to immutable ledger (activity_log)
  const logToLedger = (title: string, severity: 'low' | 'medium' | 'high', notes: string) => {
    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'TACTICAL_TEAMS_ENGINE',
      severity: severity,
      payload: { message: `${title}: ${notes}` }
    });
  };

  // Helper label resolution for dispatch targets
  const getTargetLabel = (id: string) => {
    if (id === 'staging') return 'STAGING AREA';
    if (id === 'field_ops') return 'FIELD OPERATIONS';
    if (id === 'medical') return 'MEDICAL LANE';
    const found = incidents.find(i => i.id === id);
    return found ? found.label : 'UNKNOWN INCIDENT';
  };

  // Filter out responders who are already assigned to a team
  const unassignedResponders = responders.filter(res => {
    return !res.teamId || res.teamId === 'UNASSIGNED';
  });

  // Filter unassigned pool based on search and agency selections
  const filteredUnassigned = unassignedResponders.filter(resp => {
    const matchesSearch = resp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          resp.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          resp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgency = agencyFilter === 'ALL' || resp.agency === agencyFilter;
    return matchesSearch && matchesAgency;
  });

  // Handle checking and unchecking responders for assembly
  const handleToggleResponderCheckbox = (id: string) => {
    setSelectedResponderIds(prev => 
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  // Assemble responders into a Team
  const handleAssembleTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) {
      alert("Please specify a Team/Unit name.");
      return;
    }

    const teamId = `TEAM-${Math.floor(100 + Math.random() * 900)}`;
    const newUnit: TacticalUnit = {
      id: teamId,
      name: newTeamName.toUpperCase(),
      type: newTeamType,
      members: selectedResponderIds,
      assignedResourceIds: selectedResourceIds,
      status: 'ACTIVE',
      targetId: 'staging',
      currentStep: 'staging',
      step911: 'idle',
      tenant_id: 'cascadia_em',
      createdAt: new Date().toISOString()
    };

    // Update locally and in cache
    const updatedResponders = responders.map(r => {
      if (selectedResponderIds.includes(r.id)) {
        return { ...r, teamId: teamId };
      }
      return r;
    });

    // Update physical resources to ASSIGNED
    const updatedResources = resources.map(res => {
      if (selectedResourceIds.includes(res.id)) {
        return {
          ...res,
          status: 'ASSIGNED' as const,
          status_updated_at: new Date().toISOString()
        };
      }
      return res;
    });

    const updatedTeams = [...teams, newUnit];

    updateTeamsInCache(updatedTeams);
    updateContactsInCache(updatedResponders);
    updateResourcesInCache(updatedResources);

    // Audit Log
    const checkedResponders = responders.filter(r => selectedResponderIds.includes(r.id));
    const responderDetails = checkedResponders.map(r => `${r.name} (${r.callsign})`).join(', ');
    const resourceDetails = selectedResourceIds.join(', ');
    logToLedger(
      `📦 [UNIT ASSEMBLED]`,
      'medium',
      `Assembled Tactical Unit [${newUnit.name}] (${newUnit.type}) with members: [${responderDetails || 'EMPTY - STAGED'}] and physical resources: [${resourceDetails || 'NONE'}].`
    );

    // Reset Form
    setNewTeamName('');
    setNewTeamType('STRIKE_TEAM');
    setSelectedResponderIds([]);
    setSelectedResourceIds([]);
  };

  const handleAddResponderToUnit = (responderId: string, unitId: string) => {
    const responder = responders.find(r => r.id === responderId);
    const unit = teams.find(t => t.id === unitId);
    if (!responder || !unit) return;

    let updatedTeams = [...teams];
    const updatedResponders = responders.map(r => {
      if (r.id === responderId) {
        return { ...r, teamId: unitId };
      }
      return r;
    });

    // If responder was on another team, clean it up
    if (responder.teamId && responder.teamId !== 'UNASSIGNED' && responder.teamId !== unitId) {
      updatedTeams = updatedTeams.map(t => {
        if (t.id === responder.teamId) {
          return { ...t, members: t.members.filter(id => id !== responderId) };
        }
        return t;
      });
    }

    // Add to dest unit
    updatedTeams = updatedTeams.map(t => {
      if (t.id === unitId && !t.members.includes(responderId)) {
        return { ...t, members: [...t.members, responderId] };
      }
      return t;
    });

    updateTeamsInCache(updatedTeams);
    updateContactsInCache(updatedResponders);

    logToLedger(
      `📦 [ROSTER UPDATED]`,
      'low',
      `Assigned responder ${responder.name} (${responder.callsign}) to Tactical Unit [${unit.name}].`
    );
  };

  const handleRemoveResponderFromUnit = (responderId: string, unitId: string) => {
    const responder = responders.find(r => r.id === responderId);
    const unit = teams.find(t => t.id === unitId);
    if (!responder || !unit) return;

    const updatedTeams = teams.map(t => {
      if (t.id === unitId) {
        return { ...t, members: t.members.filter(id => id !== responderId) };
      }
      return t;
    });

    const updatedResponders = responders.map(r => {
      if (r.id === responderId) {
        return { ...r, teamId: null };
      }
      return r;
    });

    updateTeamsInCache(updatedTeams);
    updateContactsInCache(updatedResponders);

    logToLedger(
      `📦 [ROSTER UPDATED]`,
      'low',
      `Removed responder ${responder.name} (${responder.callsign}) from Tactical Unit [${unit.name}].`
    );
  };

  const handleAddResourceToUnit = (resourceId: string, unitId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    const unit = teams.find(t => t.id === unitId);
    if (!resource || !unit) return;

    // Check Strike Team typing rules
    if (unit.type === 'STRIKE_TEAM' && unit.assignedResourceIds && unit.assignedResourceIds.length > 0) {
      const existingResource = resources.find(r => unit.assignedResourceIds?.includes(r.id));
      if (existingResource && (existingResource.kind !== resource.kind || existingResource.typing !== resource.typing)) {
        alert(`⚠️ STRIKE TEAM RULE VIOLATION:\nAll resources in Strike Team [${unit.name}] must match identical functional Kind [${existingResource.kind}] and Typing [${existingResource.typing}].`);
        return;
      }
    }

    const updatedTeams = teams.map(t => {
      if (t.id === unitId) {
        const existingResources = t.assignedResourceIds || [];
        if (!existingResources.includes(resourceId)) {
          return { ...t, assignedResourceIds: [...existingResources, resourceId] };
        }
      }
      return t;
    });

    const updatedResources = resources.map(res => {
      if (res.id === resourceId) {
        return {
          ...res,
          status: 'ASSIGNED' as const,
          status_updated_at: new Date().toISOString()
        };
      }
      return res;
    });

    updateTeamsInCache(updatedTeams);
    updateResourcesInCache(updatedResources);

    logToLedger(
      `📦 [RESOURCE ASSIGNED]`,
      'medium',
      `Assigned physical resource ${resourceId} (${resource.kind} - ${resource.typing}) to Tactical Unit [${unit.name}].`
    );
  };

  const handleRemoveResourceFromUnit = (resourceId: string, unitId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    const unit = teams.find(t => t.id === unitId);
    if (!resource || !unit) return;

    const updatedTeams = teams.map(t => {
      if (t.id === unitId) {
        const existingResources = t.assignedResourceIds || [];
        return { ...t, assignedResourceIds: existingResources.filter(id => id !== resourceId) };
      }
      return t;
    });

    const updatedResources = resources.map(res => {
      if (res.id === resourceId) {
        return {
          ...res,
          status: 'AVAILABLE' as const,
          status_updated_at: new Date().toISOString()
        };
      }
      return res;
    });

    updateTeamsInCache(updatedTeams);
    updateResourcesInCache(updatedResources);

    logToLedger(
      `📦 [RESOURCE RELEASED]`,
      'medium',
      `Released physical resource ${resourceId} (${resource.kind}) from Tactical Unit [${unit.name}].`
    );
  };

  const handleMoveResponderBetweenUnits = (responderId: string, sourceUnitId: string, destUnitId: string) => {
    const responder = responders.find(r => r.id === responderId);
    const srcUnit = teams.find(t => t.id === sourceUnitId);
    const destUnit = teams.find(t => t.id === destUnitId);
    if (!responder || !srcUnit || !destUnit) return;

    const updatedTeams = teams.map(t => {
      if (t.id === sourceUnitId) {
        return { ...t, members: t.members.filter(id => id !== responderId) };
      }
      if (t.id === destUnitId && !t.members.includes(responderId)) {
        return { ...t, members: [...t.members, responderId] };
      }
      return t;
    });

    const updatedResponders = responders.map(r => {
      if (r.id === responderId) {
        return { ...r, teamId: destUnitId };
      }
      return r;
    });

    updateTeamsInCache(updatedTeams);
    updateContactsInCache(updatedResponders);

    logToLedger(
      `📦 [ROSTER UPDATED]`,
      'low',
      `Transferred responder ${responder.name} (${responder.callsign}) from Unit [${srcUnit.name}] to Unit [${destUnit.name}].`
    );
  };

  const handleRecallUnitToStaging = (unitId: string) => {
    const unit = teams.find(t => t.id === unitId);
    if (!unit) return;

    const updatedTeams = teams.map(t => {
      if (t.id === unitId) {
        return {
          ...t,
          targetId: 'staging',
          currentStep: 'staging',
          mission: 'GENERAL SUPPORT',
          timeUnitAssigned: null,
          timeUnitEnroute: null,
          timeArrivedScene: null,
          timeOnScene: null,
          timeAvailable: null
        } as TacticalUnit;
      }
      return t;
    });

    updateTeamsInCache(updatedTeams);

    logToLedger(
      `📥 [UNIT RE-STAGED]`,
      'medium',
      `Recalled Tactical Unit [${unit.name}] back to STAGING AREA.`
    );
  };

  const handleDisbandTeam = (team: TacticalUnit) => {
    if (!confirm(`Are you sure you want to DISBAND [${team.name}]? \nAll members will be returned back to the Single Resource pool.`)) return;
    
    const updatedTeams = teams.map(t => {
      if (t.id === team.id) {
        return { ...t, status: 'DEMOBILIZED', targetId: 'demobilized' } as TacticalUnit;
      }
      return t;
    });

    const updatedResponders = responders.map(r => {
      if (team.members.includes(r.id)) {
        return { ...r, teamId: null };
      }
      return r;
    });

    // Release assigned physical resources back to AVAILABLE
    const resourcesToRelease = team.assignedResourceIds || [];
    const updatedResources = resources.map(res => {
      if (resourcesToRelease.includes(res.id)) {
        return {
          ...res,
          status: 'AVAILABLE' as const,
          status_updated_at: new Date().toISOString()
        };
      }
      return res;
    });

    updateTeamsInCache(updatedTeams);
    updateContactsInCache(updatedResponders);
    updateResourcesInCache(updatedResources);

    logToLedger(
      `📦 [UNIT DISBANDED]`,
      'medium',
      `Disbanded Tactical Unit [${team.name}] (${team.type}). Members returned to Single Resource Pool, and physical assets [${resourcesToRelease.join(', ') || 'NONE'}] were released.`
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0">
      
      {/* Header Controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-amber-500 tracking-wider flex items-center gap-3">
            <Users className="text-amber-500 animate-pulse" size={28} />
            <span>TACTICAL TEAMS</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 uppercase font-mono tracking-wide leading-none">
            NIMS-compliant dynamic unit builder, real-time crew sync, and dispatching overview.
          </p>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Personnel Pool & Quick Unit Builder (lg:col-span-5) */}
        <section className="lg:col-span-5 flex flex-col min-h-0">
          <CanvaGlassPanel className="p-5 flex flex-col space-y-4 h-full min-h-0">
            
            {/* Title block */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-black tracking-wider text-zinc-300 font-mono uppercase">
                <Users className="text-amber-500" size={14} />
                <span>AVAILABLE RESOURCES POOL</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-950/20 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                {unassignedResponders.length} UNASSIGNED
              </span>
            </div>

            {/* Quick Unit Assemble Card */}
            <div className="bg-zinc-900/30 p-4 border border-zinc-800/60 rounded-xl space-y-3.5 font-mono">
              <div className="flex items-center justify-between text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                <span>Quick Unit Assembly</span>
                {selectedResponderIds.length > 0 && (
                  <span className="text-amber-400 font-bold">{selectedResponderIds.length} CHECKED</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <CanvaFormRow label="Unit / Team Name">
                  <CanvaInput
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. STRIKE TEAM ECHO"
                    className="px-3 py-2 text-xs uppercase font-mono font-black placeholder:text-zinc-600"
                  />
                </CanvaFormRow>
                <CanvaFormRow 
                  label="Unit Class / Type" 
                  rightElement={<CanvaDropdownCustomizer dropdownKey="team_types" label="Unit Class" />}
                >
                  <CanvaSelect
                    value={newTeamType}
                    onChange={(e) => setNewTeamType(e.target.value)}
                    className="px-3 py-2 text-xs font-mono font-bold w-full"
                  >
                    {dropdowns.team_types.map(type => (
                      <option key={type} value={type}>{type.toUpperCase()}</option>
                    ))}
                  </CanvaSelect>
                </CanvaFormRow>
              </div>

              {/* Assign Physical Resources */}
              <div className="space-y-1.5 text-left font-mono">
                <div className="flex items-center justify-between text-[10px] font-black tracking-wider text-zinc-400 uppercase pb-1 border-b border-zinc-800/40">
                  <span>Assign Physical Resources</span>
                  {selectedResourceIds.length > 0 && (
                    <span className="text-amber-400 font-bold">{selectedResourceIds.length} SELECTED</span>
                  )}
                </div>
                {resources.filter(r => r.status === 'AVAILABLE').length === 0 ? (
                  <div className="text-[10px] text-zinc-500 italic py-2 text-center bg-zinc-950/20 rounded-xl border border-zinc-850">
                    No physical assets available in registry
                  </div>
                ) : (
                  <div className="max-h-[110px] overflow-y-auto border border-zinc-800/80 bg-zinc-950/40 rounded-xl p-2.5 space-y-1.5 custom-scroll text-[10px]">
                    {resources.filter(r => r.status === 'AVAILABLE').map(res => {
                      // Strike Team rule filtering
                      let disabled = false;
                      let reason = "";
                      if (newTeamType === 'STRIKE_TEAM' && selectedResourceIds.length > 0) {
                        const firstSelected = resources.find(r => r.id === selectedResourceIds[0]);
                        if (firstSelected && (firstSelected.kind !== res.kind || firstSelected.typing !== res.typing)) {
                          disabled = true;
                          reason = `STRIKE TEAM: MUST MATCH [${firstSelected.kind}] [${firstSelected.typing}]`;
                        }
                      }

                      const checked = selectedResourceIds.includes(res.id);

                      return (
                        <label
                          key={res.id}
                          className={`flex items-start gap-2 p-1.5 rounded-lg hover:bg-zinc-900/40 transition-colors select-none cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={checked}
                            onChange={() => {
                              setSelectedResourceIds(prev => 
                                prev.includes(res.id) ? prev.filter(id => id !== res.id) : [...prev, res.id]
                              );
                            }}
                            className="accent-amber-500 w-3.5 h-3.5 mt-0.5 rounded cursor-pointer"
                          />
                          <div className="leading-tight">
                            <span className="font-extrabold text-zinc-300">[{res.id}]</span>{' '}
                            <span className="text-zinc-400">{res.kind} ({res.typing})</span>
                            {reason && <span className="block text-[8px] text-red-400 mt-0.5 font-bold uppercase">{reason}</span>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <CanvaButton
                variant="primary"
                onClick={handleAssembleTeam}
                className="w-full py-2 text-xs font-mono tracking-wider font-extrabold uppercase"
              >
                <Plus size={14} className="mr-1 inline-block align-middle" />
                <span>
                  Assemble Unit{' '}
                  {selectedResponderIds.length > 0 || selectedResourceIds.length > 0
                    ? `[${selectedResponderIds.length} Crew / ${selectedResourceIds.length} Asset(s)]`
                    : 'Empty'}
                </span>
              </CanvaButton>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-2 items-center font-mono">
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 flex items-center gap-2 flex-1">
                <Search size={14} className="text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="SEARCH NAME, ROLE..."
                  className="bg-transparent text-xs text-white focus:outline-none w-full uppercase font-mono font-bold placeholder:text-zinc-600"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-zinc-500 hover:text-zinc-300">
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 bg-zinc-950/40 border border-zinc-900 rounded-xl px-2">
                <CanvaSelect
                  value={agencyFilter}
                  onChange={(e) => setAgencyFilter(e.target.value)}
                  className="py-2 px-1 text-[10px] text-zinc-300 outline-none border-0 bg-transparent font-mono font-bold cursor-pointer"
                >
                  <option value="ALL">ALL AGENCIES</option>
                  {dropdowns.sponsoring_agencies.map(agency => (
                    <option key={agency} value={agency}>{agency.toUpperCase()}</option>
                  ))}
                </CanvaSelect>
                <CanvaDropdownCustomizer dropdownKey="sponsoring_agencies" label="Sponsoring Agency" className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-amber-500 rounded" />
              </div>
            </div>

            {/* Available Responders Cards Pool */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scroll">
              {filteredUnassigned.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 border border-dashed border-zinc-800 rounded-xl bg-black/10">
                  <p className="text-[11px] text-zinc-600 font-mono italic">No available personnel matches criteria</p>
                </div>
              ) : (
                filteredUnassigned.map(resp => (
                  <div
                    key={resp.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', resp.id);
                    }}
                    className="p-3 bg-zinc-900/10 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3 hover:border-amber-500/20 hover:bg-zinc-900/30 transition-all duration-200 cursor-grab active:cursor-grabbing select-none font-mono"
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedResponderIds.includes(resp.id)}
                        onChange={() => handleToggleResponderCheckbox(resp.id)}
                        className="accent-amber-500 w-3.5 h-3.5 cursor-pointer rounded mt-0.5"
                        title="Check to assemble crew"
                      />
                      <div className="leading-tight text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-amber-500">[{resp.callsign}]</span>
                          <span className="font-black text-zinc-200 uppercase">{resp.name}</span>
                        </div>
                        <p className="text-[9px] text-zinc-500 uppercase mt-0.5">{resp.role} &bull; {resp.agency}</p>
                      </div>
                    </div>

                    {/* Quick-assign action */}
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-zinc-900">
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            handleAddResponderToUnit(resp.id, val);
                            e.target.value = "";
                          }
                        }}
                        className="bg-transparent text-[9px] font-bold text-zinc-400 outline-none cursor-pointer px-1 py-0.5 max-w-[80px]"
                      >
                        <option value="">+ ASSIGN</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>

          </CanvaGlassPanel>
        </section>

        {/* Right Column: Tactical Unit Management Board (lg:col-span-7) */}
        <section className="lg:col-span-7 flex flex-col min-h-0">
          <CanvaGlassPanel className="p-5 flex flex-col h-full min-h-0">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs font-black tracking-wider text-zinc-300 font-mono uppercase">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-amber-500" />
                <span>TACTICAL UNIT MANAGEMENT BOARD</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-950/20 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                {teams.length} ACTIVE UNITS
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pt-4 pr-1 custom-scroll min-h-0">
              
              {/* SECTION A: STAGED UNITS (targetId === 'staging') */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  <span>STAGING AREA POOL ({teams.filter(t => t.targetId === 'staging').length} STAGED)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  {teams.filter(t => t.targetId === 'staging').length === 0 ? (
                    <div className="col-span-full py-8 text-center text-zinc-600 font-mono text-[11px] italic border border-dashed border-zinc-900 rounded-xl bg-black/10">
                      No units currently held in Staging area. Create a Unit or Re-Stage active assets.
                    </div>
                  ) : (
                    teams.filter(t => t.targetId === 'staging').map((team) => {
                      return (
                        <div
                          key={team.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const responderId = e.dataTransfer.getData('text/plain');
                            const sourceUnitId = e.dataTransfer.getData('sourceUnitId');
                            if (responderId) {
                              if (sourceUnitId && sourceUnitId !== team.id) {
                                handleMoveResponderBetweenUnits(responderId, sourceUnitId, team.id);
                              } else {
                                handleAddResponderToUnit(responderId, team.id);
                              }
                            }
                          }}
                          className="pt-6 pb-4 px-4 bg-zinc-950/80 border border-zinc-900 rounded-[20px] flex flex-col gap-4 transition-all duration-200 font-sans relative overflow-hidden shadow-lg"
                        >
                          {/* Absolute Top Priority Accent Bar */}
                          <div className="absolute top-0 left-0 right-0 h-[6px] rounded-t-[20px] bg-emerald-500/80" />

                          {/* Absolute Top Disband Button in Top Right */}
                          <button
                            onClick={() => handleDisbandTeam(team)}
                            title="Disband Team / Demobilize"
                            className="absolute top-3 right-3 p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/40 hover:text-red-400 text-zinc-600 rounded-lg transition-all active:scale-95 shadow-md z-10 cursor-pointer"
                          >
                            <Trash2 size={11} className="stroke-[2.5]" />
                          </button>

                          {/* CAD-style Partition Columns */}
                          <div className="flex items-stretch gap-3">
                            {/* Left Column: Category Icon & Status Badge */}
                            <div className="flex flex-col items-center justify-center gap-1.5 pr-0.5 w-14 shrink-0 select-none">
                              <div className="w-14 h-14 rounded-[14px] bg-[#0c0c0e] border border-zinc-900 flex items-center justify-center shadow-inner">
                                {getTeamIcon(team.name)}
                              </div>
                              <div className="px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] font-black tracking-widest transition-all select-none">
                                STG
                              </div>
                            </div>

                            {/* Thin vertical divider line */}
                            <div className="w-[1px] bg-zinc-900 shrink-0 self-stretch my-1" />

                            {/* Middle Column: Info Rows */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center pl-2">
                              {/* Row 1: TEAM_NAME | TEAM_TYPE */}
                              <div className="text-sm font-black text-white tracking-wider uppercase leading-none font-sans">
                                {team.name}
                              </div>
                              <div className="text-[10px] font-mono font-bold text-amber-500 tracking-wider mt-1 uppercase leading-none">
                                {team.type.replace('_', ' ')}
                              </div>

                              {/* Row 2: Sector Info */}
                              <div className="text-[10px] font-extrabold text-zinc-400 tracking-wider uppercase mt-1.5 leading-none font-sans">
                                STAGING AREA POOL
                              </div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-[1px] bg-zinc-900 w-full" />

                          {/* Crew members rendering (Draggable and removable) */}
                          <div className="space-y-2">
                            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider font-sans block">
                              Crew Roster ({team.members.length}):
                            </span>
                            {team.members.length === 0 ? (
                              <div className="py-4 px-3 border border-dashed border-zinc-900 rounded-xl text-center text-xs text-zinc-500 font-semibold bg-zinc-950/20 italic font-mono">
                                EMPTY CREW - DRAG HERE
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scroll">
                                {team.members.map(mId => {
                                  const res = responders.find(r => r.id === mId);
                                  if (!res) return null;
                                  return (
                                    <div
                                      key={res.id}
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', res.id);
                                        e.dataTransfer.setData('sourceUnitId', team.id);
                                      }}
                                      className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center justify-between gap-2 text-xs font-bold cursor-grab active:cursor-grabbing text-slate-200 select-none transition-all duration-150"
                                    >
                                      <span>{res.name}</span>
                                      <button
                                        onClick={() => handleRemoveResponderFromUnit(res.id, team.id)}
                                        className="text-zinc-500 hover:text-red-400 font-bold transition-colors ml-1 p-0.5 hover:bg-zinc-900 rounded cursor-pointer"
                                        title="Remove from Unit"
                                      >
                                        <X size={10} className="stroke-[2.5]" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Physical Assets rendering */}
                          <div className="space-y-2">
                            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider font-sans block">
                              Physical Assets ({(team.assignedResourceIds || []).length}):
                            </span>
                            {(!team.assignedResourceIds || team.assignedResourceIds.length === 0) ? (
                              <div className="py-2.5 px-3 border border-dashed border-zinc-900 rounded-xl text-center text-[10px] text-zinc-500 font-semibold bg-zinc-950/20 italic font-mono">
                                NO PHYSICAL ASSETS ASSIGNED
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scroll">
                                {(team.assignedResourceIds || []).map(rId => {
                                  const res = resources.find(r => r.id === rId);
                                  if (!res) return null;
                                  return (
                                    <div
                                      key={res.id}
                                      className="bg-zinc-950 hover:bg-zinc-900/60 border border-zinc-900 px-2.5 py-2 rounded-xl flex items-start justify-between gap-2 text-[10px] font-mono select-none transition-all duration-150"
                                    >
                                      <div className="flex items-start gap-1.5 min-w-0">
                                        <div className="mt-0.5 shrink-0">
                                          {getResourceIcon(res.kind, res.category)}
                                        </div>
                                        <div className="leading-tight min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-extrabold text-amber-500">[{res.id}]</span>
                                            <span className="font-black text-zinc-200 uppercase truncate max-w-[120px]" title={res.kind}>{res.kind}</span>
                                            <span className="text-[8px] bg-zinc-800/80 text-zinc-400 px-1 py-0.5 rounded font-black">{res.typing}</span>
                                          </div>
                                          <p className="text-[8px] text-zinc-500 uppercase mt-0.5 truncate" title={res.base_location}>
                                            Loc: {res.base_location}
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveResourceFromUnit(res.id, team.id)}
                                        className="text-zinc-500 hover:text-red-400 font-bold transition-colors ml-1 p-1 hover:bg-zinc-900 rounded shrink-0 cursor-pointer"
                                        title="Detach Asset"
                                      >
                                        <X size={10} className="stroke-[2.5]" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Responsive grid for crew & physical assets dropdown additions */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                            <div>
                              <CanvaSelect
                                value=""
                                onChange={(e) => {
                                  const resId = e.target.value;
                                  if (resId) {
                                    handleAddResponderToUnit(resId, team.id);
                                    e.target.value = "";
                                  }
                                }}
                                className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 outline-none cursor-pointer w-full font-mono uppercase"
                              >
                                <option value="">+ ADD CREW</option>
                                {unassignedResponders.map(r => (
                                  <option key={r.id} value={r.id}>
                                    [{r.callsign}] {r.name.split(' ')[0]}
                                  </option>
                                ))}
                              </CanvaSelect>
                            </div>

                            <div>
                              <CanvaSelect
                                value=""
                                onChange={(e) => {
                                  const resId = e.target.value;
                                  if (resId) {
                                    handleAddResourceToUnit(resId, team.id);
                                    e.target.value = "";
                                  }
                                }}
                                className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 outline-none cursor-pointer w-full font-mono uppercase"
                              >
                                <option value="">+ ASSIGN ASSET</option>
                                {resources
                                  .filter(r => r.status === 'AVAILABLE')
                                  .filter(r => {
                                    if (team.type === 'STRIKE_TEAM' && team.assignedResourceIds && team.assignedResourceIds.length > 0) {
                                      const firstAssignedId = team.assignedResourceIds[0];
                                      const firstAssigned = resources.find(x => x.id === firstAssignedId);
                                      if (firstAssigned) {
                                        return r.kind === firstAssigned.kind && r.typing === firstAssigned.typing;
                                      }
                                    }
                                    return true;
                                  })
                                  .map(r => (
                                    <option key={r.id} value={r.id}>
                                      [{r.id}] {r.kind} ({r.typing})
                                    </option>
                                  ))}
                              </CanvaSelect>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SECTION B: FIELD ASSIGNED UNITS (targetId !== 'staging') */}
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                  <span>FIELD ACTIVE UNITS ({teams.filter(t => t.targetId !== 'staging').length} DISPATCHED)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  {teams.filter(t => t.targetId !== 'staging').length === 0 ? (
                    <div className="col-span-full py-8 text-center text-zinc-600 font-mono text-[11px] italic border border-dashed border-zinc-900 rounded-xl bg-black/10">
                      No units currently deployed in active field operations.
                    </div>
                  ) : (
                    teams.filter(t => t.targetId !== 'staging').map((team) => (
                      <div
                        key={team.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const responderId = e.dataTransfer.getData('text/plain');
                          const sourceUnitId = e.dataTransfer.getData('sourceUnitId');
                          if (responderId) {
                            if (sourceUnitId && sourceUnitId !== team.id) {
                              handleMoveResponderBetweenUnits(responderId, sourceUnitId, team.id);
                            } else {
                              handleAddResponderToUnit(responderId, team.id);
                            }
                          }
                        }}
                        className="pt-6 pb-4 px-4 bg-zinc-950/80 border border-amber-500/20 rounded-[20px] flex flex-col gap-4 transition-all duration-200 font-sans relative overflow-hidden shadow-lg shadow-amber-950/10"
                      >
                        {/* Absolute Top Priority Accent Bar */}
                        <div className="absolute top-0 left-0 right-0 h-[6px] rounded-t-[20px] bg-amber-500/80" />

                        {/* Absolute Top Disband Button in Top Right */}
                        <button
                          onClick={() => handleDisbandTeam(team)}
                          title="Disband Team / Demobilize"
                          className="absolute top-3 right-3 p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/40 hover:text-red-400 text-zinc-600 rounded-lg transition-all active:scale-95 shadow-md z-10 cursor-pointer"
                        >
                          <Trash2 size={11} className="stroke-[2.5]" />
                        </button>

                        {/* CAD-style Partition Columns */}
                        <div className="flex items-stretch gap-3">
                          {/* Left Column: Category Icon & Status Badge */}
                          <div className="flex flex-col items-center justify-center gap-1.5 pr-0.5 w-14 shrink-0 select-none">
                            <div className="w-14 h-14 rounded-[14px] bg-[#0c0c0e] border border-zinc-900 flex items-center justify-center shadow-inner">
                              {getTeamIcon(team.name)}
                            </div>
                            <div className="px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-500/20 font-mono text-[9px] font-black tracking-widest transition-all select-none">
                              FLD
                            </div>
                          </div>

                          {/* Thin vertical divider line */}
                          <div className="w-[1px] bg-zinc-900 shrink-0 self-stretch my-1" />

                          {/* Middle Column: Info Rows */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center pl-2">
                            {/* Row 1: TEAM_NAME */}
                            <div className="text-sm font-black text-white tracking-wider uppercase leading-none font-sans truncate">
                              {team.name}
                            </div>
                            <div className="text-[10px] font-mono font-bold text-amber-500 tracking-wider mt-1 uppercase leading-none">
                              {team.type.replace('_', ' ')}
                            </div>

                            {/* Row 2: Location Info */}
                            <div className="text-xs font-extrabold text-[#ffd000] tracking-wider uppercase mt-1.5 leading-none font-sans flex items-center gap-1 truncate">
                              <MapPin size={11} className="text-amber-500 shrink-0 animate-pulse" />
                              <span className="truncate">{getTargetLabel(team.targetId)}</span>
                            </div>

                            {/* Row 3: Metadata */}
                            <div className="text-[10px] font-mono font-bold text-zinc-500 tracking-wider mt-1.5 leading-none uppercase truncate">
                              Mission: {team.mission || 'General Support'}
                            </div>
                          </div>
                        </div>

                        {/* Recall to Staging Button */}
                        <button
                          onClick={() => handleRecallUnitToStaging(team.id)}
                          className="py-1.5 px-3 bg-red-950/20 hover:bg-red-900/30 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-150 uppercase shadow-md shadow-red-950/10 w-full cursor-pointer"
                        >
                          <RotateCcw size={10} className="stroke-[2.5]" />
                          <span>Recall to Staging</span>
                        </button>

                        {/* Divider */}
                        <div className="h-[1px] bg-zinc-900/60 w-full" />

                        {/* Crew members rendering */}
                        <div className="space-y-2">
                          <span className="text-xs font-black text-zinc-400 uppercase tracking-wider font-sans block">
                            Crew Roster ({team.members.length}):
                          </span>
                          {team.members.length === 0 ? (
                            <div className="py-4 px-3 border border-dashed border-zinc-900 rounded-xl text-center text-xs text-zinc-500 font-semibold bg-zinc-950/20 italic font-mono">
                              EMPTY CREW - DRAG HERE
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scroll">
                              {team.members.map(mId => {
                                const res = responders.find(r => r.id === mId);
                                if (!res) return null;
                                return (
                                  <div
                                    key={res.id}
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('text/plain', res.id);
                                      e.dataTransfer.setData('sourceUnitId', team.id);
                                    }}
                                    className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center justify-between gap-2 text-xs font-bold cursor-grab active:cursor-grabbing text-slate-200 select-none transition-all duration-150"
                                  >
                                    <span>{res.name}</span>
                                    <button
                                      onClick={() => handleRemoveResponderFromUnit(res.id, team.id)}
                                      className="text-zinc-500 hover:text-red-400 font-bold transition-colors ml-1 p-0.5 hover:bg-zinc-900 rounded cursor-pointer"
                                      title="Remove from Unit"
                                    >
                                      <X size={10} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Physical Assets rendering */}
                        <div className="space-y-2">
                          <span className="text-xs font-black text-zinc-400 uppercase tracking-wider font-sans block">
                            Physical Assets ({(team.assignedResourceIds || []).length}):
                          </span>
                          {(!team.assignedResourceIds || team.assignedResourceIds.length === 0) ? (
                            <div className="py-2.5 px-3 border border-dashed border-zinc-900 rounded-xl text-center text-[10px] text-zinc-500 font-semibold bg-zinc-950/20 italic font-mono">
                              NO PHYSICAL ASSETS ASSIGNED
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scroll">
                              {(team.assignedResourceIds || []).map(rId => {
                                const res = resources.find(r => r.id === rId);
                                if (!res) return null;
                                return (
                                  <div
                                    key={res.id}
                                    className="bg-zinc-950 hover:bg-zinc-900/60 border border-zinc-900 px-2.5 py-2 rounded-xl flex items-start justify-between gap-2 text-[10px] font-mono select-none transition-all duration-150"
                                  >
                                    <div className="flex items-start gap-1.5 min-w-0">
                                      <div className="mt-0.5 shrink-0">
                                        {getResourceIcon(res.kind, res.category)}
                                      </div>
                                      <div className="leading-tight min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-extrabold text-amber-500">[{res.id}]</span>
                                          <span className="font-black text-zinc-200 uppercase truncate max-w-[120px]" title={res.kind}>{res.kind}</span>
                                          <span className="text-[8px] bg-zinc-800/80 text-zinc-400 px-1 py-0.5 rounded font-black">{res.typing}</span>
                                        </div>
                                        <p className="text-[8px] text-zinc-500 uppercase mt-0.5 truncate" title={res.base_location}>
                                          Loc: {res.base_location}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveResourceFromUnit(res.id, team.id)}
                                      className="text-zinc-500 hover:text-red-400 font-bold transition-colors ml-1 p-1 hover:bg-zinc-900 rounded shrink-0 cursor-pointer"
                                      title="Detach Asset"
                                    >
                                      <X size={10} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Responsive grid for crew & physical assets dropdown additions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                          <div>
                            <CanvaSelect
                              value=""
                              onChange={(e) => {
                                const resId = e.target.value;
                                if (resId) {
                                  handleAddResponderToUnit(resId, team.id);
                                  e.target.value = "";
                                }
                              }}
                              className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 outline-none cursor-pointer w-full font-mono uppercase"
                            >
                              <option value="">+ ADD CREW</option>
                              {unassignedResponders.map(r => (
                                <option key={r.id} value={r.id}>
                                  [{r.callsign}] {r.name.split(' ')[0]}
                                </option>
                              ))}
                            </CanvaSelect>
                          </div>

                          <div>
                            <CanvaSelect
                              value=""
                              onChange={(e) => {
                                const resId = e.target.value;
                                if (resId) {
                                  handleAddResourceToUnit(resId, team.id);
                                  e.target.value = "";
                                }
                              }}
                              className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 outline-none cursor-pointer w-full font-mono uppercase"
                            >
                              <option value="">+ ASSIGN ASSET</option>
                              {resources
                                .filter(r => r.status === 'AVAILABLE')
                                .filter(r => {
                                  if (team.type === 'STRIKE_TEAM' && team.assignedResourceIds && team.assignedResourceIds.length > 0) {
                                    const firstAssignedId = team.assignedResourceIds[0];
                                    const firstAssigned = resources.find(x => x.id === firstAssignedId);
                                    if (firstAssigned) {
                                      return r.kind === firstAssigned.kind && r.typing === firstAssigned.typing;
                                    }
                                  }
                                  return true;
                                })
                                .map(r => (
                                  <option key={r.id} value={r.id}>
                                    [{r.id}] {r.kind} ({r.typing})
                                  </option>
                                ))}
                            </CanvaSelect>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </CanvaGlassPanel>
        </section>
      </div>

    </div>
  );
};

export default TacticalTeams;
