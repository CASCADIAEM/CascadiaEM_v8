import React, { useState, useEffect } from 'react';
import { dataBus } from '../services/DataBus';
import { 
  ShieldAlert, 
  Users, 
  Building2, 
  CheckSquare, 
  Clock, 
  UserCheck,
  Send,
  Map,
  Upload,
  Printer,
  Truck,
  ArrowRight,
  RefreshCw,
  Check
} from 'lucide-react';
import { sendTelemetryLog } from '../services/Telemetry';
import { CanvaGlassPanel, CanvaButton, CanvaInput } from '../components/DesignSandbox';

interface ActiveMissionData {
  name: string;
  category: 'PLANNED' | 'TRAINING' | 'INCIDENT';
  missionNumber: string;
  classification: string;
  opPeriod: string;
  commandOfficer: string;
  objectivesCount: number;
  facilityCount: number;
  agencyName?: string;
  agencyLogo?: string | null;
}

interface TimelineEntry {
  id: string;
  time: string;
  author: string;
  message: string;
}

const SOP_CHECKLISTS: Record<string, string[]> = {
  'Seismic Incident / Earthquake': [
    'Conduct immediate structural safety sweep of EOC and command nodes.',
    'Establish primary communications bridge with State SEOC Warning Center.',
    'Request State-issued Disaster Mission Number for cost tracking.',
    'Deploy regional damage assessment teams to survey critical utility assets.',
    'Notify and dispatch standby volunteers to municipal shelter gymnasiums.'
  ],
  'Severe Hydrological Flooding': [
    'Monitor river gauges and low-lying floodplain elevations.',
    'Establish staging zones for sandbag barriers and earthworks.',
    'Broadcast safety and flood evacuation alerts to riverside properties.',
    'Check high-ground shelter reserves for capacity overhead.',
    'Establish shuttle dispatch corridors for disabled or vulnerable patrons.'
  ],
  'Severe Winter / Storm Event': [
    'Activate municipal emergency cold-weather warming center agreements.',
    'Verify fuel reservoirs and stage backup diesel generators at command cells.',
    'Clear primary ambulance and fire response lanes of heavy snow/ice.',
    'Open warming shelter locations and notify regional volunteer rosters.',
    'Broadcast safety directives regarding storm operational limits to field units.'
  ],
  'Search & Rescue (SAR) Incident': [
    'Establish SAR Unified Command Post at the point last seen (PLS).',
    'Register checking canine teams and volunteer CERT searchers.',
    'Map topography and overlay search sectors 1-12.',
    'Test tactical radio repeaters over blind spots and river valleys.',
    'Stage professional paramedics and ambulances at the Command Post.'
  ],
  'Planned Event / Cultural Gathering': [
    'Inspect parking spaces, event egress, and safety barriers.',
    'Stage localized first-aid stations and volunteer marshals.',
    'Review joint mutual-aid agreements with county fire liaisons.',
    'Log shifts, distribute safety vest credentials, and test channels.',
    'Queue dispatch advisory templates for immediate coordination.'
  ]
};

interface Resource {
  id: string;
  name: string;
  type: string;
  originalBranch: string;
  currentBranch: 'Branch I (Alki Beach)' | 'Branch II (Reservation)' | 'Transit';
  division: string;
  status: 'ASSIGNED' | 'IN_TRANSIT' | 'STAGING';
  assignment: string;
}

interface ActiveIncidentCache {
  missionNumber: string;
  completedSops: string[];
  objectives: { text: string; status: 'PENDING' | 'IN_PROGRESS' | 'ACHIEVED' }[];
  timeline: TimelineEntry[];
  mapImage?: string | null;
  resources?: Resource[];
}

const ActiveIncident: React.FC = () => {
  const [activeMission, setActiveMission] = useState<ActiveMissionData | null>(null);
  
  // Dynamic SOP Checklists
  const [sopItems, setSopItems] = useState<string[]>([]);
  const [completedSops, setCompletedSops] = useState<string[]>([]);
  
  // SMART Objectives
  const [objectives, setObjectives] = useState<{ text: string; status: 'PENDING' | 'IN_PROGRESS' | 'ACHIEVED' }[]>([]);
  
  // Local Timeline
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [newLogText, setNewLogText] = useState('');

  // Local Incident Map Attachment State
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Tactical Resources RSTAT
  const [resources, setResources] = useState<Resource[]>([]);
  const [reassignForm, setReassignForm] = useState<Record<string, { division: string; assignment: string }>>({});

  const agencyName = activeMission?.agencyName || dataBus.getCache<string>('mission_builder_agency_name') || 'Cascadia Emergency Management';
  const agencyLogo = activeMission?.agencyLogo || dataBus.getCache<string | null>('mission_builder_agency_logo') || null;

  const initializeMission = (details: ActiveMissionData) => {
    setActiveMission(details);
    
    const classTitle = details.classification;
    const checklist = SOP_CHECKLISTS[classTitle] || SOP_CHECKLISTS['Seismic Incident / Earthquake'];
    setSopItems(checklist);

    // Check if we have cached progress for THIS mission
    const cached = dataBus.getCache<ActiveIncidentCache>('active_incident_progress');
    if (cached && cached.missionNumber === details.missionNumber) {
      setCompletedSops(cached.completedSops);
      setObjectives(cached.objectives);
      setTimeline(cached.timeline);
      setMapImage(cached.mapImage || null);
      setResources(cached.resources || []);
    } else {
      setCompletedSops([]);
      setObjectives([
        { text: 'Verify reliable primary and secondary radio channels across active sectors.', status: 'IN_PROGRESS' },
        { text: 'Inspect facility load tolerances and report statuses to warning hubs.', status: 'PENDING' }
      ]);
      setTimeline([
        {
          id: `TL-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'SYSTEM',
          message: `Active Mission loaded: [${details.name}] under Mission ID: ${details.missionNumber}.`
        },
        { id: '1', time: '20:15', author: 'EOC Core', message: 'EOC Operational Node activated on Sentinel Core v7.' }
      ]);
      setMapImage(null);
      setResources([
        {
          id: 'RES-1',
          name: 'Shoreline Security Team',
          type: 'Security Patrol',
          originalBranch: 'Branch I (Alki Beach)',
          currentBranch: 'Branch I (Alki Beach)',
          division: 'Shoreline Division',
          status: 'ASSIGNED',
          assignment: 'Monitor coastal access points and manage public safety perimeter.'
        },
        {
          id: 'RES-2',
          name: 'First-Aid Unit Alpha',
          type: 'Medical Response',
          originalBranch: 'Branch I (Alki Beach)',
          currentBranch: 'Branch I (Alki Beach)',
          division: 'Medical Staging Group',
          status: 'ASSIGNED',
          assignment: 'Provide rapid triage and initial medical stabilization.'
        },
        {
          id: 'RES-3',
          name: 'Catering & Comfort Crew',
          type: 'Mass Care / Logistics',
          originalBranch: 'Branch II (Reservation)',
          currentBranch: 'Branch II (Reservation)',
          division: 'Mass Care Division',
          status: 'STAGING',
          assignment: 'Prepare hydration, meals, and emergency blankets for inbound groups.'
        },
        {
          id: 'RES-4',
          name: 'Transport Liaison Fleet',
          type: 'Logistics Transport',
          originalBranch: 'Branch I (Alki Beach)',
          currentBranch: 'Branch I (Alki Beach)',
          division: 'Transit Staging Group',
          status: 'ASSIGNED',
          assignment: 'Coordinate shuttle bus routing and monitor team transfers.'
        }
      ]);
    }
  };

  // Cache synchronization effect
  useEffect(() => {
    if (activeMission) {
      dataBus.setCache('active_incident_progress', {
        missionNumber: activeMission.missionNumber,
        completedSops,
        objectives,
        timeline,
        mapImage,
        resources
      });
    }
  }, [activeMission, completedSops, objectives, timeline, mapImage, resources]);

  // Subscribe to EOC Setup Broadcasts
  useEffect(() => {
    // Check if a mission was already activated previously
    const lastDispatch = dataBus.getLastPacket('DISPATCH');
    if (lastDispatch && lastDispatch.payload?.missionDetails) {
      initializeMission(lastDispatch.payload.missionDetails as ActiveMissionData);
    }

    const unsubscribe = dataBus.subscribe((packet) => {
      if (packet.type === 'DISPATCH' && packet.payload?.missionDetails) {
        initializeMission(packet.payload.missionDetails as ActiveMissionData);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSopToggle = (sopText: string) => {
    const isCompleted = completedSops.includes(sopText);
    let updated: string[];

    if (isCompleted) {
      updated = completedSops.filter(item => item !== sopText);
      dataBus.broadcast({
        type: 'SYSTEM',
        origin: 'ACTIVE TRACKER',
        payload: { message: `SOP step reopened: "${sopText}"` },
        severity: 'low'
      });
    } else {
      updated = [...completedSops, sopText];
      dataBus.broadcast({
        type: 'SYSTEM',
        origin: 'ACTIVE TRACKER',
        payload: { message: `✅ [SOP COMPLETE] Step finalized: "${sopText}"` },
        severity: 'medium'
      });
    }
    setCompletedSops(updated);
  };

  const handleObjectiveStatusChange = (index: number, newStatus: typeof objectives[0]['status']) => {
    const updated = [...objectives];
    const prevStatus = updated[index].status;
    updated[index].status = newStatus;
    setObjectives(updated);

    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'ACTIVE TRACKER',
      payload: { 
        message: `Objective Status Altered: "${updated[index].text}" moved from ${prevStatus} to ${newStatus}` 
      },
      severity: 'medium'
    });
  };

  const handleAddTimelineEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogText.trim()) return;

    const newEntry: TimelineEntry = {
      id: `TL-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: activeMission?.commandOfficer || 'EOC Operator',
      message: newLogText.trim()
    };

    setTimeline([newEntry, ...timeline]);
    
    dataBus.broadcast({
      type: 'DISPATCH',
      origin: 'ACTIVE TRACKER',
      payload: { message: `📜 [TIMELINE ENTRY] ${newEntry.message}` },
      severity: 'low'
    });

    // Central Telemetry Integration (Dispatches to active ledger in server.py)
    await sendTelemetryLog({
      title: 'CHRONOLOGICAL SHIFT TIMELINE LOG',
      severity: 'low',
      notes: `Shift timeline entry logged by ${newEntry.author}`,
      origin_tenant: 'CASCADIA_EM_TRACKER',
      channels: [],
      classification: 'INFO',
      alert_message: newEntry.message,
      target_label: 'ACTIVE LEDGER',
      ics_position: 'EOC_OPERATOR',
      operational_period_id: activeMission?.opPeriod
    });

    setNewLogText('');
  };

  const handleFormChange = (id: string, field: 'division' | 'assignment', value: string) => {
    setReassignForm(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleInitiateTransit = async (id: string) => {
    let resName = '';
    setResources(prev => prev.map(res => {
      if (res.id === id && res.status === 'ASSIGNED') {
        resName = res.name;
        const updatedRes: Resource = {
          ...res,
          status: 'IN_TRANSIT',
          currentBranch: 'Transit'
        };
        
        // Add to timeline
        const logEntry: TimelineEntry = {
          id: `TL-${Date.now()}-${id}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'EOC Core',
          message: `📥 [LOG RECEIVED] Resource ${res.name} initiated transit from Branch I (Alki Beach) to Branch II (Reservation).`
        };
        setTimeline(prevTimeline => [logEntry, ...prevTimeline]);
        
        // Broadcast telemetry
        dataBus.broadcast({
          type: 'DISPATCH',
          origin: 'ACTIVE TRACKER',
          payload: { message: `📥 [LOG RECEIVED] Resource ${res.name} initiated transit from Branch I to Branch II.` },
          severity: 'low'
        });
        
        return updatedRes;
      }
      return res;
    }));

    if (resName) {
      await sendTelemetryLog({
        title: 'TACTICAL RESOURCE STATUS (RSTAT) UPDATE',
        severity: 'low',
        notes: `Resource ${resName} initiated transit from Branch I to Branch II.`,
        origin_tenant: 'CASCADIA_EM_TRACKER',
        channels: [],
        classification: 'INFO',
        alert_message: `📥 [LOG RECEIVED] Resource ${resName} initiated transit from Branch I (Alki Beach) to Branch II (Reservation).`,
        target_label: 'ACTIVE LEDGER',
        ics_position: 'EOC_OPERATOR',
        operational_period_id: activeMission?.opPeriod
      });
    }
  };

  const handleVerifyCheckIn = async (id: string) => {
    let resName = '';
    setResources(prev => prev.map(res => {
      if (res.id === id && res.status === 'IN_TRANSIT') {
        resName = res.name;
        const updatedRes: Resource = {
          ...res,
          status: 'STAGING',
          currentBranch: 'Branch II (Reservation)'
        };
        
        // Add to timeline
        const logEntry: TimelineEntry = {
          id: `TL-${Date.now()}-${id}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'EOC Core',
          message: `✅ [SUCCESS] Resource ${res.name} safely arrived and checked-in at Branch II (Reservation).`
        };
        setTimeline(prevTimeline => [logEntry, ...prevTimeline]);
        
        // Broadcast telemetry
        dataBus.broadcast({
          type: 'DISPATCH',
          origin: 'ACTIVE TRACKER',
          payload: { message: `✅ [SUCCESS] Resource ${res.name} checked-in at Branch II.` },
          severity: 'low'
        });
        
        return updatedRes;
      }
      return res;
    }));

    if (resName) {
      await sendTelemetryLog({
        title: 'TACTICAL RESOURCE STATUS (RSTAT) UPDATE',
        severity: 'low',
        notes: `Resource ${resName} arrived and checked-in at Branch II.`,
        origin_tenant: 'CASCADIA_EM_TRACKER',
        channels: [],
        classification: 'INFO',
        alert_message: `✅ [SUCCESS] Resource ${resName} safely arrived and checked-in at Branch II (Reservation).`,
        target_label: 'ACTIVE LEDGER',
        ics_position: 'EOC_OPERATOR',
        operational_period_id: activeMission?.opPeriod
      });
    }
  };

  const handleReassignResource = async (id: string) => {
    const form = reassignForm[id];
    const division = form?.division?.trim();
    const assignment = form?.assignment?.trim();
    
    if (!division || !assignment) {
      alert('Please fill out both the division and assignment/task for reassignment.');
      return;
    }
    
    let resName = '';
    setResources(prev => prev.map(res => {
      if (res.id === id && res.status === 'STAGING') {
        resName = res.name;
        const updatedRes: Resource = {
          ...res,
          status: 'ASSIGNED',
          currentBranch: 'Branch II (Reservation)',
          division,
          assignment
        };
        
        // Add to timeline
        const logEntry: TimelineEntry = {
          id: `TL-${Date.now()}-${id}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'EOC Core',
          message: `📥 [LOG RECEIVED] Resource ${res.name} reassigned at Branch II (Reservation) under ${division}: ${assignment}.`
        };
        setTimeline(prevTimeline => [logEntry, ...prevTimeline]);
        
        // Broadcast telemetry
        dataBus.broadcast({
          type: 'DISPATCH',
          origin: 'ACTIVE TRACKER',
          payload: { message: `📥 [LOG RECEIVED] Resource ${res.name} reassigned: ${division} - ${assignment}` },
          severity: 'low'
        });
        
        // Clear form inputs
        setReassignForm(prevForm => {
          const next = { ...prevForm };
          delete next[id];
          return next;
        });
        
        return updatedRes;
      }
      return res;
    }));

    if (resName) {
      await sendTelemetryLog({
        title: 'TACTICAL RESOURCE STATUS (RSTAT) UPDATE',
        severity: 'low',
        notes: `Resource ${resName} reassigned at Branch II to ${division}.`,
        origin_tenant: 'CASCADIA_EM_TRACKER',
        channels: [],
        classification: 'INFO',
        alert_message: `📥 [LOG RECEIVED] Resource ${resName} reassigned at Branch II (Reservation) under ${division}: ${assignment}.`,
        target_label: 'ACTIVE LEDGER',
        ics_position: 'EOC_OPERATOR',
        operational_period_id: activeMission?.opPeriod
      });
    }
  };

  const handleMapUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMapError(null);

    // 1. File Size Validation (Max 15MB)
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setMapError("File size exceeds the 15MB limit. Please provide an optimized high-resolution export.");
      return;
    }

    // 2. Asynchronous Dimension Checking (Min 1200px wide)
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (!base64) {
        setMapError("Failed to read map file.");
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (img.width < 1200) {
          setMapError(`Map resolution is too low (${img.width}px wide). Please upload a high-resolution export (minimum width of 1200px) for operational print clarity.`);
          return;
        }

        // Resolution and size are valid!
        setMapImage(base64);
        
        // Log entry to timeline & broadcast
        const msg = `🗺️ [MAP ATTACHED] High-resolution operational map successfully attached to Active Incident (${img.width}x${img.height}px).`;
        const newEntry: TimelineEntry = {
          id: `TL-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: activeMission?.commandOfficer || 'EOC Operator',
          message: msg
        };
        setTimeline(prev => [newEntry, ...prev]);

        dataBus.broadcast({
          type: 'SYSTEM',
          origin: 'ACTIVE TRACKER',
          payload: { message: msg },
          severity: 'medium'
        });
      };
      img.onerror = () => {
        setMapError("Invalid image format or corrupt file.");
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMap = () => {
    setMapImage(null);
    setMapError(null);
    
    const msg = `🗺️ [MAP REMOVED] Operational map detached from incident tracker.`;
    const newEntry: TimelineEntry = {
      id: `TL-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: activeMission?.commandOfficer || 'EOC Operator',
      message: msg
    };
    setTimeline(prev => [newEntry, ...prev]);

    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'ACTIVE TRACKER',
      payload: { message: msg },
      severity: 'low'
    });
  };

  // RENDER STANDBY CARD IF EOC COMMAND IS INACTIVE
  if (!activeMission) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-5 max-w-lg glass-card p-10 border-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.03)]">
          <div className="h-14 w-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <ShieldAlert size={28} className="text-amber-500" />
          </div>
          
          <div className="space-y-1.5">
            <h2 className="text-lg font-black uppercase text-zinc-300 tracking-wider">EOC Core Standby</h2>
            <p className="text-xs font-mono font-bold text-amber-500 tracking-wider uppercase">
              No Operational EOC Mission Profile Activated
            </p>
          </div>

          <p className="text-xs text-zinc-500 font-bold leading-relaxed">
            Standard operating protocols require initializing a mission briefing sheet before active tracking. Please load and execute the Mission Setup module.
          </p>

          <div className="pt-2">
            <div className="text-[10px] font-mono font-black uppercase text-zinc-600 bg-zinc-950/60 border border-zinc-900/60 rounded-lg p-2 max-w-xs mx-auto">
              Listening to EOC Pub/Sub Bus...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
      
      {/* Active Incident Operational Briefing Header Banner */}
      <div className="glass-card p-5 border-amber-500/10 bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-zinc-950 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {agencyLogo && (
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl overflow-hidden bg-zinc-950/80 border border-zinc-900/80 p-1.5 flex items-center justify-center shrink-0">
              <img src={agencyLogo} alt="Agency Logo" className="h-full w-full object-contain" />
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono font-black text-red-500 tracking-wider uppercase">
                {agencyName ? `${agencyName} - LIVE EOC` : 'LIVE EOC OPERATION'}
              </span>
              <span className="text-zinc-700">|</span>
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                PERIOD: {activeMission.opPeriod}
              </span>
            </div>
            <h1 className="text-2xl font-black uppercase text-zinc-100 tracking-wider">{activeMission.name}</h1>
            <p className="text-xs text-zinc-500 font-semibold uppercase">
              Incident Classification: <span className="text-zinc-300">{activeMission.classification}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col md:items-end gap-3 shrink-0">
          <div className="text-left md:text-right space-y-1 font-mono">
            <div className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">State Warning Center Mission ID</div>
            <div className="text-lg font-black text-amber-500">{activeMission.missionNumber}</div>
            <div className="text-[9px] font-bold text-zinc-400 uppercase">
              Incident Commander: {activeMission.commandOfficer}
            </div>
          </div>
          <button 
            onClick={() => window.print()}
            className="eoc-button-primary text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 self-start md:self-end"
          >
            <Printer size={12} />
            Print ICS-201 Report
          </button>
        </div>
      </div>

      {/* Main HUD Multi-pane Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Command & Associated Logistics */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* ICS Command Box */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
              <Users size={15} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase text-zinc-200 tracking-wide">NIMS Operational Command</h3>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="p-2.5 bg-zinc-950/60 border border-zinc-900 rounded-lg">
                <span className="text-[9px] text-zinc-500 font-extrabold uppercase block mb-0.5">Incident Commander</span>
                <span className="font-extrabold text-zinc-200">{activeMission.commandOfficer}</span>
              </div>
              <div className="p-2.5 bg-zinc-950/60 border border-zinc-900 rounded-lg">
                <span className="text-[9px] text-zinc-500 font-extrabold uppercase block mb-0.5">NIMS ESF-5 Support Staff</span>
                <span className="font-extrabold text-zinc-200">Watch Center Operations Team</span>
              </div>
            </div>
          </div>

          {/* Bound Logistics Nodes Box */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
              <Building2 size={15} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase text-zinc-200 tracking-wide">Bound Logistics Facilities</h3>
            </div>

            <div className="space-y-2.5">
              {activeMission.facilityCount === 0 ? (
                <div className="text-center py-4 text-xs font-bold text-zinc-600 uppercase">
                  No logistical nodes bound.
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-lg flex items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-zinc-200">Community Gymnasium</div>
                      <div className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Primary Warming shelter</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full font-mono font-black text-[9px] tracking-wider bg-amber-500/10 border border-amber-500/25 text-amber-500 uppercase">
                      STANDBY
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Operational Incident Map */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
              <div className="flex items-center gap-2">
                <Map size={15} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase text-zinc-200 tracking-wide">Incident Map Attachment</h3>
              </div>
              {mapImage && (
                <button 
                  onClick={handleRemoveMap}
                  className="text-[9px] font-mono font-black text-red-500 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-2 py-0.5 rounded cursor-pointer transition-all uppercase"
                >
                  Detach
                </button>
              )}
            </div>

            {mapImage ? (
              <div className="relative group rounded-xl overflow-hidden border border-zinc-900 aspect-[16/10] bg-zinc-950">
                <img 
                  src={mapImage} 
                  alt="Operational Map" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/90 to-transparent p-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    100% Full Display
                  </div>
                  <label className="text-[9px] font-mono font-black text-amber-500 bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 px-2.5 py-1 rounded cursor-pointer transition-all uppercase">
                    Replace Map
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleMapUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-zinc-800 rounded-xl p-5 bg-zinc-950/20 text-center space-y-3 hover:border-zinc-700/60 transition-all duration-300">
                <div className="h-10 w-14 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center mx-auto text-zinc-500">
                  <Upload size={18} />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase">Upload Incident Cartography</p>
                  <p className="text-[9px] font-semibold text-zinc-600 uppercase">Min Width: 1200px • Max Size: 15MB</p>
                </div>
                <label className="inline-block text-[10px] font-mono font-black text-amber-500 bg-amber-500/5 border border-amber-500/25 px-4 py-2 rounded-lg cursor-pointer hover:bg-amber-500/10 transition-all uppercase">
                  Select File
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleMapUpload} 
                    className="hidden" 
                  />
                </label>
              </div>
            )}

            {mapError && (
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-[10px] font-sans font-bold text-red-400 leading-normal uppercase text-left">
                🚨 {mapError}
              </div>
            )}
          </div>

        </div>

        {/* Center Column: Live SOP Checklist */}
        <div className="glass-card p-5 space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5 gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare size={15} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase text-zinc-200 tracking-wide">Live SOP Action Checklist</h3>
            </div>
            <span className="text-[10px] font-mono font-black bg-zinc-900 px-2.5 py-0.5 rounded text-zinc-400">
              {completedSops.length}/{sopItems.length} COMPLETE
            </span>
          </div>

          <p className="text-[11px] text-zinc-500 font-bold leading-normal uppercase">
            ⚡ CONFIRM CRITICAL STANDARD OPERATING PROTOCOL EVENTS FOR COMPLIANCE LOGGING:
          </p>

          <div className="space-y-3 pt-2 text-xs">
            {sopItems.map((sop, idx) => {
              const isChecked = completedSops.includes(sop);
              return (
                <div 
                  key={idx}
                  onClick={() => handleSopToggle(sop)}
                  className={`p-3.5 border rounded-xl flex items-start gap-3 cursor-pointer transition-all hover:bg-zinc-900/30 select-none ${
                    isChecked 
                      ? 'bg-green-500/5 border-green-500/15 text-zinc-300' 
                      : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => {}} // handled by parent click
                    className="accent-green-500 h-4 w-4 rounded cursor-pointer mt-0.5 shrink-0"
                  />
                  <span className={`leading-relaxed font-bold ${isChecked ? 'line-through text-zinc-500' : ''}`}>
                    {sop}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: SMART Objectives & Chronological Shift Log */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* SMART Objectives Monitor */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
              <UserCheck size={15} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase text-zinc-200 tracking-wide">Active SMART Objectives</h3>
            </div>

            <div className="space-y-3 text-xs leading-normal">
              {objectives.map((obj, idx) => (
                <div key={idx} className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-3">
                  <div className="font-bold text-zinc-200">
                    {idx + 1}. {obj.text}
                  </div>
                  
                  {/* Status buttons */}
                  <div className="flex items-center gap-1.5 pt-0.5 border-t border-zinc-900/40">
                    <span className="text-[8px] font-extrabold text-zinc-500 uppercase tracking-widest mr-1.5">STATUS:</span>
                    {(['PENDING', 'IN_PROGRESS', 'ACHIEVED'] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => handleObjectiveStatusChange(idx, st)}
                        className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          obj.status === st 
                            ? st === 'ACHIEVED' 
                              ? 'bg-green-500/15 border border-green-500/30 text-green-500' 
                              : st === 'IN_PROGRESS'
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500'
                              : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                            : 'bg-transparent border border-zinc-950 text-zinc-600 hover:text-zinc-400 hover:border-zinc-900'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chronological Shift Log Card */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
              <Clock size={15} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase text-zinc-200 tracking-wide">Chronological Shift Timeline</h3>
            </div>

            {/* Quick entry form */}
            <form onSubmit={handleAddTimelineEntry} className="flex items-center gap-2">
              <input 
                type="text" 
                value={newLogText} 
                onChange={e => setNewLogText(e.target.value)} 
                placeholder="Log critical event updates..." 
                className="eoc-input flex-1 p-2.5 text-xs"
              />
              <button 
                type="submit" 
                className="eoc-button-primary p-2.5 rounded-lg shrink-0"
                title="Send update"
              >
                <Send size={14} />
              </button>
            </form>

            {/* Timeline log listing */}
            <div className="space-y-3.5 max-h-[220px] overflow-y-auto custom-scroll pr-1.5 pt-1">
              {timeline.map((entry) => (
                <div key={entry.id} className="text-xs flex items-start gap-2.5 font-sans leading-relaxed">
                  <span className="font-mono text-[9px] font-bold text-amber-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900 shrink-0 mt-0.5">
                    {entry.time}
                  </span>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wide mr-1.5">
                      {entry.author}:
                    </span>
                    <span className="font-bold text-zinc-300 leading-normal">{entry.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* NIMS Tactical RSTAT Tracking Console */}
      <CanvaGlassPanel className="p-5 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-amber-500" />
            <h3 className="text-sm font-black uppercase text-zinc-100 tracking-wide">
              Tactical Resource Status (RSTAT) Tracking Console
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-900">
            NIMS Multi-Site Transition Grid
          </span>
        </div>

        {/* Resources Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-900 text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                <th className="py-2.5 px-3">Resource ID</th>
                <th className="py-2.5 px-3">Resource / Type</th>
                <th className="py-2.5 px-3">Current Location</th>
                <th className="py-2.5 px-3">Operational Division</th>
                <th className="py-2.5 px-3">Tactical Status</th>
                <th className="py-2.5 px-3">Assignment / Current Task</th>
                <th className="py-2.5 px-3 text-right">Transition Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/40">
              {resources.map((res) => {
                const form = reassignForm[res.id] || { division: '', assignment: '' };
                return (
                  <tr key={res.id} className="hover:bg-zinc-900/20 transition-all font-sans">
                    <td className="py-3 px-3 font-mono font-bold text-amber-500">
                      {res.id}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-zinc-200">{res.name}</div>
                      <div className="text-[10px] text-zinc-500 font-semibold uppercase">{res.type}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-zinc-300">
                      {res.currentBranch === 'Transit' ? (
                        <span className="flex items-center gap-1 text-amber-500 animate-pulse">
                          <Truck size={12} />
                          {res.currentBranch}
                        </span>
                      ) : (
                        res.currentBranch
                      )}
                    </td>
                    <td className="py-3 px-3 text-zinc-400 font-semibold">
                      {res.division}
                    </td>
                    <td className="py-3 px-3">
                      {res.status === 'ASSIGNED' ? (
                        <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-500 text-[9px] font-bold rounded uppercase tracking-wider">
                          Assigned
                        </span>
                      ) : res.status === 'IN_TRANSIT' ? (
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[9px] font-bold rounded uppercase tracking-wider animate-pulse inline-flex items-center gap-1">
                          In Transit
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-zinc-500/10 border border-zinc-500/30 text-zinc-400 text-[9px] font-bold rounded uppercase tracking-wider inline-flex items-center gap-1">
                          <Check size={10} className="text-zinc-500" />
                          Staging / Available
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-[280px]">
                      {res.status === 'STAGING' ? (
                        <div className="space-y-1.5 py-1">
                          <CanvaInput
                            placeholder="New Division..."
                            value={form.division}
                            onChange={(e) => handleFormChange(res.id, 'division', e.target.value)}
                            className="p-1.5 text-[11px] w-full"
                          />
                          <CanvaInput
                            placeholder="New Assignment..."
                            value={form.assignment}
                            onChange={(e) => handleFormChange(res.id, 'assignment', e.target.value)}
                            className="p-1.5 text-[11px] w-full"
                          />
                        </div>
                      ) : (
                        <div className="text-zinc-400 leading-normal line-clamp-2" title={res.assignment}>
                          {res.assignment}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {res.status === 'ASSIGNED' && res.currentBranch === 'Branch I (Alki Beach)' ? (
                        <CanvaButton
                          onClick={() => handleInitiateTransit(res.id)}
                          className="py-1 px-2.5 text-[10px] uppercase font-bold flex items-center gap-1 ml-auto"
                        >
                          Initiate Transit
                          <ArrowRight size={11} />
                        </CanvaButton>
                      ) : res.status === 'IN_TRANSIT' ? (
                        <CanvaButton
                          onClick={() => handleVerifyCheckIn(res.id)}
                          className="py-1 px-2.5 text-[10px] uppercase font-bold flex items-center gap-1 ml-auto"
                        >
                          Verify Check-In
                          <Check size={11} />
                        </CanvaButton>
                      ) : res.status === 'STAGING' ? (
                        <CanvaButton
                          onClick={() => handleReassignResource(res.id)}
                          variant="primary"
                          className="py-1 px-2.5 text-[10px] uppercase font-bold flex items-center gap-1 ml-auto"
                        >
                          Commit Reassignment
                          <RefreshCw size={11} />
                        </CanvaButton>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                          Locked in Branch II
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CanvaGlassPanel>

    </div>

    {/* Printable ICS-201 Brief Container */}
    <div className="hidden print:block font-sans text-black bg-white p-6 space-y-6 leading-normal">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: letter;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: 'Arial', 'Helvetica', sans-serif !important;
          }
          .print-card {
            border: 1px solid #000000 !important;
            background: white !important;
            border-radius: 8px !important;
            padding: 16px !important;
          }
          .print-border-b {
            border-bottom: 1px solid #000000 !important;
          }
          .print-divide-y > * + * {
            border-top: 1px solid #e5e7eb !important;
          }
          .page-break-avoid {
            page-break-inside: avoid !important;
          }
          .page-break-before {
            page-break-before: always !important;
          }
          img {
            max-width: 100% !important;
            height: auto !important;
          }
        }
      `}} />

      {/* Header Grid */}
      <div className="border-4 border-black p-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {agencyLogo && (
            <img 
              src={agencyLogo} 
              alt="Agency Logo" 
              className="max-h-20 max-w-[200px] object-contain border border-zinc-300 p-1" 
            />
          )}
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-700">{agencyName}</h2>
            <h1 className="text-xl font-black uppercase tracking-wider text-zinc-900">INCIDENT BRIEFING (ICS 201)</h1>
          </div>
        </div>
        <div className="text-right border-l border-zinc-300 pl-6 shrink-0">
          <div className="text-[9px] font-mono font-bold uppercase text-zinc-500">STATE WARNING MISSION ID</div>
          <div className="text-xl font-black text-amber-600 font-mono">{activeMission.missionNumber}</div>
        </div>
      </div>

      {/* Summary Metadata Card */}
      <div className="grid grid-cols-3 gap-4 border-2 border-black p-4 text-xs font-bold divide-x divide-zinc-300">
        <div className="space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase block">1. Incident Name</span>
          <span className="text-sm font-black uppercase text-zinc-900">{activeMission.name}</span>
        </div>
        <div className="pl-4 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase block">2. Incident Commander</span>
          <span className="text-sm font-extrabold text-zinc-900">{activeMission.commandOfficer}</span>
        </div>
        <div className="pl-4 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase block">3. Operational Period</span>
          <span className="text-sm font-black text-zinc-900">{activeMission.opPeriod}</span>
        </div>
      </div>

      {/* SMART Objectives Table */}
      <div className="border border-zinc-300 rounded-lg p-4 space-y-3 page-break-avoid">
        <h3 className="text-xs font-black uppercase tracking-wide border-b border-zinc-300 pb-1 text-zinc-700">Section 4: Active SMART Objectives</h3>
        <table className="w-full text-left text-xs divide-y divide-zinc-200">
          <thead>
            <tr className="text-[9px] font-bold uppercase text-zinc-500">
              <th className="py-2 w-12">#</th>
              <th className="py-2">Objective Description</th>
              <th className="py-2 w-32 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-bold text-zinc-800">
            {objectives.map((obj, idx) => (
              <tr key={idx}>
                <td className="py-2">{idx + 1}</td>
                <td className="py-2 leading-relaxed">{obj.text}</td>
                <td className="py-2 text-right">
                  <span className="text-[10px] uppercase font-black">
                    [{obj.status}]
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SOP Checklist Progress */}
      <div className="border border-zinc-300 rounded-lg p-4 space-y-3 page-break-avoid">
        <h3 className="text-xs font-black uppercase tracking-wide border-b border-zinc-300 pb-1 text-zinc-700">Section 5: Standard Operating Protocol Action Log</h3>
        <div className="grid grid-cols-1 gap-2 text-xs font-semibold">
          {sopItems.map((sop, idx) => {
            const isChecked = completedSops.includes(sop);
            return (
              <div key={idx} className="flex items-start gap-2.5 py-1">
                <span className="h-4 w-4 shrink-0 border border-black rounded flex items-center justify-center font-bold text-[10px] bg-zinc-100 text-black">
                  {isChecked ? '✓' : ' '}
                </span>
                <span className={`leading-relaxed ${isChecked ? 'text-zinc-500 line-through' : 'text-zinc-900'}`}>
                  {sop}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident Cartography Map - Edge-to-Edge display */}
      {mapImage && (
        <div className="border border-zinc-300 rounded-lg overflow-hidden space-y-2 page-break-avoid">
          <div className="bg-zinc-100 p-3 border-b border-zinc-300 text-xs font-black uppercase text-zinc-700">
            Section 6: Incident Operational Cartography
          </div>
          <div className="w-full">
            <img 
              src={mapImage} 
              alt="Incident Map" 
              className="w-full object-contain max-h-[500px]" 
            />
          </div>
        </div>
      )}

      {/* Chronological Log (Timeline) */}
      <div className="border border-zinc-300 rounded-lg p-4 space-y-3 page-break-avoid page-break-before">
        <h3 className="text-xs font-black uppercase tracking-wide border-b border-zinc-300 pb-1 text-zinc-700">Section 7: Chronological Shift Timeline Log</h3>
        <table className="w-full text-left text-xs divide-y divide-zinc-200">
          <thead>
            <tr className="text-[9px] font-bold uppercase text-zinc-500">
              <th className="py-2 w-20">Time</th>
              <th className="py-2 w-32">Source / Position</th>
              <th className="py-2">Operational Event Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-800 font-medium">
            {timeline.map((entry) => (
              <tr key={entry.id} className="align-top">
                <td className="py-2 font-mono font-bold text-zinc-600">{entry.time}</td>
                <td className="py-2 font-bold text-zinc-700 uppercase">{entry.author}</td>
                <td className="py-2 leading-relaxed text-zinc-900">{entry.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>
);
};

export default ActiveIncident;
