import React, { useState, useEffect } from 'react';
import { dataBus } from '../services/DataBus';
import { useDropdowns } from '../services/DropdownService';
import { sendTelemetryLog } from '../services/Telemetry';
import {
  CanvaGlassPanel,
  CanvaButton,
  CanvaInput,
  CanvaSelect,
  CanvaFormRow,
  CanvaTextarea,
  CanvaDropdownCustomizer
} from '../components/DesignSandbox';
import {
  ShieldAlert,
  Plus,
  Trash2,
  Calculator,
  Clock,
  Coins,
  Activity,
  Layers,
  FileSpreadsheet,
  Eye
} from 'lucide-react';

// ==========================================
// 📋 NIMS ICS RESOURCE STRUCTURE DEFINITIONS
// ==========================================
export interface SubResource {
  id: string;
  kind: string;
  typing: string;
}

export interface ICSResource {
  id: string; // Unique primary key, e.g., 'ENG-13', 'Medic-2' or 'TBD'
  category: 'EQUIPMENT' | 'FACILITY' | 'PERSONNEL';
  resource_category: 'SINGLE RESOURCE' | 'STRIKE TEAM' | 'TASK FORCE' | 'TEAMS' | 'SUPPORT UNIT';
  kind: string; // Functional Type, e.g., 'BULLDOZER', 'AMBULANCE'
  typing: 'TYPE-1' | 'TYPE-2' | 'TYPE-3' | 'TYPE-4' | 'TYPE-5' | 'TYPE-6';
  geographic: {
    response_radius: number; // strictly named RESPONSE RADIUS
    jurisdiction: string;
  };
  base_location: string; // e.g., 'EQUIPMENT BASE' or 'FACILITY LOCATION'
  cost: {
    hourly: number;
    contract_rate: number;
    mileage_monitor: number;
    driver_operator_cost: number;
  };
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT OF SERVICE';
  status_updated_at: string;
  tenant_id: string;
  notes?: string;
  sub_entries?: SubResource[]; // Enforced structures for package types
}

// Pre-seeded high-fidelity demonstration resources
const INITIAL_RESOURCES: ICSResource[] = [
  {
    id: 'BULLDOZER-3',
    category: 'EQUIPMENT',
    resource_category: 'SINGLE RESOURCE',
    kind: 'BULLDOZER',
    typing: 'TYPE-1',
    geographic: {
      response_radius: 50,
      jurisdiction: 'Snohomish County'
    },
    base_location: 'EQUIPMENT BASE ALPHA',
    cost: {
      hourly: 250,
      contract_rate: 1500,
      mileage_monitor: 2.5,
      driver_operator_cost: 95
    },
    status: 'AVAILABLE',
    status_updated_at: new Date().toISOString(),
    tenant_id: 'cascadia_em',
    notes: 'Heavy-duty site clearing bulldozer equipped with spark arrester.'
  },
  {
    id: 'CLINIC-2A',
    category: 'FACILITY',
    resource_category: 'SUPPORT UNIT',
    kind: 'MOBILE CLINIC',
    typing: 'TYPE-2',
    geographic: {
      response_radius: 25,
      jurisdiction: 'King County Unified'
    },
    base_location: 'STAGING PORT CHARLIE',
    cost: {
      hourly: 450,
      contract_rate: 3500,
      mileage_monitor: 1.8,
      driver_operator_cost: 150
    },
    status: 'ASSIGNED',
    status_updated_at: new Date().toISOString(),
    tenant_id: 'cascadia_em',
    notes: 'Rapid assembly clinic trailer with 4 exam rooms and cold-storage vaccination slots.'
  },
  {
    id: 'STRIKE-ENG-5',
    category: 'EQUIPMENT',
    resource_category: 'STRIKE TEAM',
    kind: 'WATER TENDER',
    typing: 'TYPE-1',
    geographic: {
      response_radius: 100,
      jurisdiction: 'Cascadia Mutual Aid Network'
    },
    base_location: 'EAST MOUNTAIN STAGING',
    cost: {
      hourly: 800,
      contract_rate: 6500,
      mileage_monitor: 5.5,
      driver_operator_cost: 320
    },
    status: 'AVAILABLE',
    status_updated_at: new Date().toISOString(),
    tenant_id: 'cascadia_em',
    notes: 'Standard strike team assembly containing 5 identical Type-1 heavy water tenders.',
    sub_entries: [
      { id: 'TNDR-01', kind: 'WATER TENDER', typing: 'TYPE-1' },
      { id: 'TNDR-02', kind: 'WATER TENDER', typing: 'TYPE-1' },
      { id: 'TNDR-03', kind: 'WATER TENDER', typing: 'TYPE-1' },
      { id: 'TNDR-04', kind: 'WATER TENDER', typing: 'TYPE-1' },
      { id: 'TNDR-05', kind: 'WATER TENDER', typing: 'TYPE-1' }
    ]
  }
];

// Category kinds will be loaded dynamically from the DropdownService inside the component.

// Helper to calculate the next logical sequential identifier for a given kind
const getNextSequentialId = (kind: string, currentResources: ICSResource[]): string => {
  const prefix = kind.toUpperCase().replace(/\s+/g, '');
  const matchingResources = currentResources.filter(r => r.kind.toUpperCase() === kind.toUpperCase());
  
  let maxNum = 0;
  matchingResources.forEach(r => {
    const match = r.id.match(new RegExp(`${prefix}-?(\\d+)`, 'i'));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  });
  
  return `${prefix}-${maxNum + 1}`;
};

const ResourcesManager: React.FC = () => {
  const { dropdowns } = useDropdowns();

  const CATEGORY_KINDS = {
    EQUIPMENT: dropdowns.equipment_kinds,
    FACILITY: dropdowns.facility_kinds,
    PERSONNEL: dropdowns.personnel_kinds
  };

  // Sync core with DataBus
  const [resources, setResources] = useState<ICSResource[]>(() => {
    const cached = dataBus.getCache<ICSResource[]>('ics_resources');
    return cached || INITIAL_RESOURCES;
  });

  // Form states
  const [formId, setFormId] = useState('');
  const [formCategory, setFormCategory] = useState<ICSResource['category']>('EQUIPMENT');
  const [formResCategory, setFormResCategory] = useState<ICSResource['resource_category']>('SINGLE RESOURCE');
  const [formKind, setFormKind] = useState('AMBULANCE');
  const [formTyping, setFormTyping] = useState<ICSResource['typing']>('TYPE-1');
  const [formRadius, setFormRadius] = useState(25);
  const [formJurisdiction, setFormJurisdiction] = useState('');
  const [formBaseLocation, setFormBaseLocation] = useState('');
  const [formCostHourly, setFormCostHourly] = useState(0);
  const [formCostContract, setFormCostContract] = useState(0);
  const [formCostMileage, setFormCostMileage] = useState(0);
  const [formCostDriver, setFormCostDriver] = useState(0);
  const [formNotes, setFormNotes] = useState('');

  // Sub-resources builder states (Strike Team / Task Force)
  const [subIdInput, setSubIdInput] = useState('');
  const [subKindInput, setSubKindInput] = useState('AMBULANCE');
  const [subTypeInput, setSubTypeInput] = useState('TYPE-1');
  const [tempSubEntries, setFormSubEntries] = useState<SubResource[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [wsCategory, setWsCategory] = useState<ICSResource['category']>('EQUIPMENT');
  const [wsKind, setWsKind] = useState('AMBULANCE');
  const [wsRequired, setWsRequired] = useState(5);

  // Selected resource for details popup modal
  const [selectedResource, setSelectedResource] = useState<ICSResource | null>(null);
  const [editResource, setEditResource] = useState<ICSResource | null>(null);

  const handleOpenDetails = (resource: ICSResource) => {
    setSelectedResource(resource);
    setEditResource(JSON.parse(JSON.stringify(resource)));
  };

  const handleUpdateResource = async (updatedResource: ICSResource) => {
    setResources(prev => prev.map(res => res.id === updatedResource.id ? updatedResource : res));

    // Dispatch system operational log to ledger
    dataBus.broadcast({
      type: 'LOGISTICS',
      origin: 'RESOURCES MODULE',
      payload: {
        message: `Resource [${updatedResource.id}] Configuration Updated`,
        resourceId: updatedResource.id,
        resource: updatedResource
      },
      severity: 'medium'
    });

    // Dispatch out-of-band telemetry log to Python backend
    await sendTelemetryLog({
      title: `RESOURCE UPDATE EVENT: ${updatedResource.id}`,
      severity: 'medium',
      notes: `Operational variables updated: Kind=${updatedResource.kind}, Typing=${updatedResource.typing}, Base=${updatedResource.base_location}, BurnRate=$${updatedResource.cost.hourly + updatedResource.cost.driver_operator_cost}/hr`,
      origin_tenant: 'COMMAND_CENTER'
    });

    // Close the popup/clear selection
    setSelectedResource(null);
    setEditResource(null);
  };

  // Update DataBus cache when state triggers change
  useEffect(() => {
    dataBus.setCache('ics_resources', resources);
  }, [resources]);

  // Adjust Kind dropdown automatically when Category shifts
  useEffect(() => {
    const availableKinds = CATEGORY_KINDS[formCategory];
    if (availableKinds && !availableKinds.includes(formKind)) {
      setFormKind(availableKinds[0]);
    }
  }, [formCategory]);

  // Synchronize formId automatically to the next sequential ID of the selected kind
  useEffect(() => {
    setFormId(getNextSequentialId(formKind, resources));
  }, [formKind, resources.length]);

  // Keep Form Category and Kind in sync with Worksheet Category and Kind for EOC context alignment
  useEffect(() => {
    setFormCategory(wsCategory);
    setFormKind(wsKind);
  }, [wsCategory, wsKind]);

  // Trigger telemetry logging and out-of-band alerts on status alterations
  const handleStatusChange = async (id: string, newStatus: ICSResource['status']) => {
    let oldStatus: ICSResource['status'] = 'AVAILABLE';
    
    setResources(prev => prev.map(res => {
      if (res.id === id) {
        oldStatus = res.status;
        return {
          ...res,
          status: newStatus,
          status_updated_at: new Date().toISOString()
        };
      }
      return res;
    }));

    const resourceName = id;
    const notes = `Operational status toggled from [${oldStatus}] to [${newStatus}]`;

    // Dispatch system operational log to ledger
    dataBus.broadcast({
      type: 'LOGISTICS',
      origin: 'RESOURCES MODULE',
      payload: {
        message: `Resource [${resourceName}] Status Altered: ${newStatus}`,
        resourceId: id,
        status: newStatus
      },
      severity: newStatus === 'OUT OF SERVICE' ? 'high' : 'medium'
    });

    // Dispatch out-of-band telemetry log to Python backend
    await sendTelemetryLog({
      title: `RESOURCE STATUS EVENT: ${id}`,
      severity: newStatus === 'OUT OF SERVICE' ? 'high' : 'medium',
      notes: notes,
      origin_tenant: 'cascadia_em',
      channels: newStatus === 'OUT OF SERVICE' ? ['sms'] : [],
      classification: newStatus === 'OUT OF SERVICE' ? 'URGENT' : 'INFO',
      alert_message: `📟 [ALERT]: Resource identifier [${id}] is now [${newStatus}]. Notes: ${notes}`,
      target_label: `Resource ${id}`,
      ics_position: 'LOGISTICS_CHIEF'
    });
  };

  // Add items into the temporary package array
  const handleAddSubItem = () => {
    if (!subIdInput.trim()) {
      setValidationError('Sub-resource unique identifier must be declared.');
      return;
    }

    // Strike Team validation constraint: sub-assets must match parent Category Kind & Typing
    if (formResCategory === 'STRIKE TEAM') {
      if (subKindInput !== formKind || subTypeInput !== formTyping) {
        setValidationError(`STRIKE TEAM SERIALIZATION RULE: All sub-units must share identical functional Kind [${formKind}] and Typing [${formTyping}] to match parent.`);
        return;
      }
    }

    setValidationError(null);
    const newItem: SubResource = {
      id: subIdInput.trim().toUpperCase(),
      kind: subKindInput,
      typing: subTypeInput
    };

    setFormSubEntries([...tempSubEntries, newItem]);
    setSubIdInput('');
  };

  const handleRemoveSubItem = (idx: number) => {
    setFormSubEntries(tempSubEntries.filter((_, i) => i !== idx));
  };

  // Construct and append new resource item
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate identifier (unique and non-empty)
    const normalizedId = formId.trim() ? formId.trim().toUpperCase() : 'TBD';
    if (normalizedId !== 'TBD' && resources.some(r => r.id === normalizedId)) {
      setValidationError(`IDENTIFIER INTEGRITY FAILURE: Active asset with primary key identifier [${normalizedId}] already exists.`);
      return;
    }

    // Double-check Strike Team constraints
    if (formResCategory === 'STRIKE TEAM' && tempSubEntries.length === 0) {
      setValidationError('STRIKE TEAM SERIALIZATION RULE: Strike Team configurations require at least 1 synchronized sub-asset.');
      return;
    }

    const newResource: ICSResource = {
      id: normalizedId,
      category: formCategory,
      resource_category: formResCategory,
      kind: formKind,
      typing: formTyping,
      geographic: {
        response_radius: Number(formRadius),
        jurisdiction: formJurisdiction.trim() || 'CASCADIA MUTUAL AID ZONE'
      },
      base_location: formBaseLocation.trim() || 'EOC CENTRAL STAGING',
      cost: {
        hourly: Number(formCostHourly),
        contract_rate: Number(formCostContract),
        mileage_monitor: Number(formCostMileage),
        driver_operator_cost: Number(formCostDriver)
      },
      status: 'AVAILABLE',
      status_updated_at: new Date().toISOString(),
      tenant_id: 'cascadia_em',
      notes: formNotes.trim(),
      sub_entries: ['STRIKE TEAM', 'TASK FORCE'].includes(formResCategory) ? tempSubEntries : undefined
    };

    setResources([...resources, newResource]);

    // Dispatch telemetry log
    dataBus.broadcast({
      type: 'LOGISTICS',
      origin: 'RESOURCES MODULE',
      payload: {
        message: `New ICS Resource Registered: [${newResource.id}] (${newResource.kind} - ${newResource.typing})`,
        resource: newResource
      },
      severity: 'low'
    });

    await sendTelemetryLog({
      title: `RESOURCE ACTIVATION: ${newResource.id}`,
      severity: 'medium',
      notes: `Activated new ${newResource.resource_category} [${newResource.id}] under jurisdiction [${newResource.geographic.jurisdiction}]`,
      origin_tenant: 'cascadia_em',
      classification: 'INFO',
      alert_message: `New operational asset [${newResource.id}] is staged and marked AVAILABLE at ${newResource.base_location}.`,
      target_label: 'Logistics Desk',
      ics_position: 'LOGISTICS_CHIEF'
    });

    // Reset only unit-specific or package-specific Form Fields to support rapid duplicate entry
    setFormNotes('');
    setFormSubEntries([]);
  };

  const handleDeleteResource = async (id: string) => {
    const resourceToDelete = resources.find(r => r.id === id);
    setResources(prev => prev.filter(r => r.id !== id));

    if (resourceToDelete) {
      dataBus.broadcast({
        type: 'LOGISTICS',
        origin: 'RESOURCES MODULE',
        payload: { message: `Resource Decommissioned: ${id}` },
        severity: 'medium'
      });

      await sendTelemetryLog({
        title: `RESOURCE DECOMMISSION: ${id}`,
        severity: 'high',
        notes: `Resource identifier ${id} completely removed from EOC active register.`,
        origin_tenant: 'cascadia_em',
        classification: 'URGENT',
        alert_message: `🚨 [ALERT]: Operational asset [${id}] decommissioned and removed from ledger database.`,
        target_label: 'Logistics Command',
        ics_position: 'LOGISTICS_CHIEF'
      });
    }
  };

  const handleQuickDeploy = async () => {
    setValidationError(null);
    
    const nextId = getNextSequentialId(wsKind, resources);
    
    let defaultBase = 'EOC CENTRAL STAGING';
    let defaultHourly = 100;
    let defaultContract = 1000;
    let defaultDriver = 50;
    
    if (wsCategory === 'EQUIPMENT') {
      if (wsKind === 'AMBULANCE') {
        defaultHourly = 150;
        defaultContract = 1200;
        defaultDriver = 80;
        defaultBase = 'MEDICAL STAGING ALPHA';
      } else if (wsKind === 'BULLDOZER') {
        defaultHourly = 250;
        defaultContract = 2000;
        defaultDriver = 95;
        defaultBase = 'EQUIPMENT BASE ALPHA';
      } else if (wsKind === 'WATER TENDER') {
        defaultHourly = 180;
        defaultContract = 1500;
        defaultDriver = 90;
        defaultBase = 'EAST MOUNTAIN STAGING';
      }
    } else if (wsCategory === 'FACILITY') {
      defaultHourly = 300;
      defaultContract = 2500;
      defaultDriver = 0;
      defaultBase = 'INCIDENT COMMAND POST';
    } else if (wsCategory === 'PERSONNEL') {
      defaultHourly = 95;
      defaultContract = 0;
      defaultDriver = 0;
      defaultBase = 'RECEPTION CENTER';
    }

    const newResource: ICSResource = {
      id: nextId,
      category: wsCategory,
      resource_category: 'SINGLE RESOURCE',
      kind: wsKind,
      typing: 'TYPE-1',
      geographic: {
        response_radius: 25,
        jurisdiction: 'CASCADIA MUTUAL AID ZONE'
      },
      base_location: defaultBase,
      cost: {
        hourly: defaultHourly,
        contract_rate: defaultContract,
        mileage_monitor: 1.5,
        driver_operator_cost: defaultDriver
      },
      status: 'AVAILABLE',
      status_updated_at: new Date().toISOString(),
      tenant_id: 'cascadia_em',
      notes: `Automatically deployed via Resource Order Worksheet shortfall mitigation for kind [${wsKind}].`
    };

    setResources([...resources, newResource]);

    dataBus.broadcast({
      type: 'LOGISTICS',
      origin: 'RESOURCES MODULE',
      payload: {
        message: `Quick Deploy via Worksheet: [${newResource.id}] (${newResource.kind})`,
        resource: newResource
      },
      severity: 'low'
    });

    await sendTelemetryLog({
      title: `QUICK DEPLOYMENT: ${newResource.id}`,
      severity: 'medium',
      notes: `Quick deployed new ${newResource.kind} [${newResource.id}] under worksheet shortfall mitigation.`,
      origin_tenant: 'cascadia_em',
      classification: 'INFO',
      alert_message: `Asset [${newResource.id}] quick-deployed and marked AVAILABLE at ${newResource.base_location}.`,
      target_label: 'Logistics Desk',
      ics_position: 'LOGISTICS_CHIEF'
    });
  };

  // Operational Statistics Calculations
  const statsTotal = resources.length;
  const statsAvailable = resources.filter(r => r.status === 'AVAILABLE').length;
  const statsAssigned = resources.filter(r => r.status === 'ASSIGNED').length;
  const statsOutOfService = resources.filter(r => r.status === 'OUT OF SERVICE').length;

  // Active Burn Rate calculation based on operational cost items for non-decommissioned units
  const totalBurnRate = resources
    .filter(r => r.status !== 'OUT OF SERVICE')
    .reduce((sum, r) => sum + r.cost.hourly + r.cost.driver_operator_cost, 0);

  // Required - Have = Need Worksheet math
  const calculatedHave = resources
    .filter(r => r.category === wsCategory && r.kind === wsKind && r.status !== 'OUT OF SERVICE')
    .length;
  const calculatedNeed = Math.max(0, wsRequired - calculatedHave);

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase text-zinc-100 tracking-wider flex items-center gap-3">
            <Layers className="text-amber-500" />
            NIMS ICS Resource Directory
          </h1>
          <p className="text-sm text-zinc-500 font-medium">
            Monitor, deploy, and calculate tactical hardware, facilities, and response teams mapping to rigid ICS standards.
          </p>
        </div>
      </div>

      {/* 📊 EOC REAL-TIME KPI HUD */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <CanvaGlassPanel className="p-4 flex items-center gap-4">
          <div className="p-3 bg-zinc-900 rounded-xl text-zinc-400">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Total Assets</div>
            <div className="text-2xl font-black text-zinc-100">{statsTotal}</div>
          </div>
        </CanvaGlassPanel>

        <CanvaGlassPanel className="p-4 flex items-center gap-4 border-l-4 border-l-green-500/50">
          <div className="p-3 bg-zinc-900 rounded-xl text-green-500">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Available</div>
            <div className="text-2xl font-black text-green-400">{statsAvailable}</div>
          </div>
        </CanvaGlassPanel>

        <CanvaGlassPanel className="p-4 flex items-center gap-4 border-l-4 border-l-blue-500/50">
          <div className="p-3 bg-zinc-900 rounded-xl text-blue-500">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Assigned</div>
            <div className="text-2xl font-black text-blue-400">{statsAssigned}</div>
          </div>
        </CanvaGlassPanel>

        <CanvaGlassPanel className="p-4 flex items-center gap-4 border-l-4 border-l-red-500/50">
          <div className="p-3 bg-zinc-900 rounded-xl text-red-500">
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Out of Service</div>
            <div className="text-2xl font-black text-red-400">{statsOutOfService}</div>
          </div>
        </CanvaGlassPanel>

        <CanvaGlassPanel className="p-4 flex items-center gap-4 border-l-4 border-l-amber-500/50 col-span-2 lg:col-span-1">
          <div className="p-3 bg-zinc-900 rounded-xl text-amber-500">
            <Coins size={20} />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Hourly Burn</div>
            <div className="text-2xl font-black text-amber-400 font-mono">${totalBurnRate}/hr</div>
          </div>
        </CanvaGlassPanel>
      </div>

      {/* ==========================================
          📝 NEW ASSET CREATOR FORM (FULL WIDTH)
          ========================================== */}
      <CanvaGlassPanel className="p-6 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
          <FileSpreadsheet size={18} className="text-amber-500" />
          <h2 className="text-lg font-black uppercase text-zinc-100 tracking-wider">Register New Asset</h2>
        </div>

        <form onSubmit={handleCreateResource} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CanvaFormRow label="RESOURCE IDENTIFIER (Primary Key)">
              <CanvaInput 
                placeholder="e.g. ENG-13, Medic-2 (Defaults to TBD)"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
              />
            </CanvaFormRow>

            <CanvaFormRow label="CATEGORY">
              <CanvaSelect 
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ICSResource['category'])}
              >
                <option value="EQUIPMENT">EQUIPMENT</option>
                <option value="FACILITY">FACILITY</option>
                <option value="PERSONNEL">PERSONNEL</option>
              </CanvaSelect>
            </CanvaFormRow>

            <CanvaFormRow 
              label="RESOURCE KIND"
              rightElement={
                formCategory === 'EQUIPMENT' ? (
                  <CanvaDropdownCustomizer dropdownKey="equipment_kinds" label="Equipment Kind" />
                ) : formCategory === 'FACILITY' ? (
                  <CanvaDropdownCustomizer dropdownKey="facility_kinds" label="Facility Kind" />
                ) : (
                  <CanvaDropdownCustomizer dropdownKey="personnel_kinds" label="Personnel Kind" />
                )
              }
            >
              <CanvaSelect 
                value={formKind}
                onChange={(e) => setFormKind(e.target.value)}
              >
                {CATEGORY_KINDS[formCategory].map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </CanvaSelect>
            </CanvaFormRow>

            <CanvaFormRow label="RESOURCE CATEGORY">
              <CanvaSelect 
                value={formResCategory}
                onChange={(e) => {
                  setFormResCategory(e.target.value as ICSResource['resource_category']);
                  setFormSubEntries([]);
                }}
              >
                <option value="SINGLE RESOURCE">SINGLE RESOURCE</option>
                <option value="STRIKE TEAM">STRIKE TEAM</option>
                <option value="TASK FORCE">TASK FORCE</option>
                <option value="TEAMS">TEAMS</option>
                <option value="SUPPORT UNIT">SUPPORT UNIT</option>
              </CanvaSelect>
            </CanvaFormRow>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CanvaFormRow label="RESOURCE TYPING">
              <CanvaSelect 
                value={formTyping}
                onChange={(e) => setFormTyping(e.target.value as ICSResource['typing'])}
              >
                <option value="TYPE-1">TYPE-1 (MAX CAPABILITY)</option>
                <option value="TYPE-2">TYPE-2</option>
                <option value="TYPE-3">TYPE-3</option>
                <option value="TYPE-4">TYPE-4</option>
                <option value="TYPE-5">TYPE-5</option>
                <option value="TYPE-6">TYPE-6 (MIN CAPABILITY)</option>
              </CanvaSelect>
            </CanvaFormRow>

            <CanvaFormRow label="RESPONSE RADIUS (Miles)">
              <CanvaInput 
                type="number"
                min="1"
                value={formRadius}
                onChange={(e) => setFormRadius(Math.max(1, Number(e.target.value)))}
              />
            </CanvaFormRow>

            <CanvaFormRow label="JURISDICTION">
              <CanvaInput 
                placeholder="e.g. King County"
                value={formJurisdiction}
                onChange={(e) => setFormJurisdiction(e.target.value)}
              />
            </CanvaFormRow>

            <CanvaFormRow label={formCategory === 'FACILITY' ? 'FACILITY LOCATION' : 'EQUIPMENT BASE'}>
              <CanvaInput 
                placeholder="e.g. Staging Site West"
                value={formBaseLocation}
                onChange={(e) => setFormBaseLocation(e.target.value)}
              />
            </CanvaFormRow>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 💸 Cost Audit Sheet */}
            <div className="bg-zinc-950/80 border border-zinc-900 p-4 rounded-xl space-y-3">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-1.5">
                Cost Variables Mapping
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <CanvaFormRow label="Hourly Base ($)">
                  <CanvaInput 
                    type="number" min="0" value={formCostHourly} 
                    onChange={(e) => setFormCostHourly(Math.max(0, Number(e.target.value)))} 
                  />
                </CanvaFormRow>
                <CanvaFormRow label="Contract Rate ($)">
                  <CanvaInput 
                    type="number" min="0" value={formCostContract} 
                    onChange={(e) => setFormCostContract(Math.max(0, Number(e.target.value)))} 
                  />
                </CanvaFormRow>
                <CanvaFormRow label="Mileage Rate ($/m)">
                  <CanvaInput 
                    type="number" step="0.1" min="0" value={formCostMileage} 
                    onChange={(e) => setFormCostMileage(Math.max(0, Number(e.target.value)))} 
                  />
                </CanvaFormRow>
                <CanvaFormRow label="Driver/Operator ($)">
                  <CanvaInput 
                    type="number" min="0" value={formCostDriver} 
                    onChange={(e) => setFormCostDriver(Math.max(0, Number(e.target.value)))} 
                  />
                </CanvaFormRow>
              </div>
            </div>

            {/* Package Serialization Rules Sub-Form */}
            {['STRIKE TEAM', 'TASK FORCE'].includes(formResCategory) ? (
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {formResCategory === 'STRIKE TEAM' ? 'STRIKE TEAM IDENTICAL LOGS' : 'TASK FORCE MIXED LOGS'}
                  </span>
                  <span className="text-[9px] font-bold bg-zinc-900 border border-zinc-800 text-amber-500 px-2 py-0.5 rounded uppercase">
                    {formResCategory} RULE
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <CanvaInput 
                      placeholder="ID"
                      value={subIdInput}
                      onChange={(e) => setSubIdInput(e.target.value)}
                      className="col-span-1"
                    />
                    <CanvaSelect 
                      value={subKindInput}
                      onChange={(e) => setSubKindInput(e.target.value)}
                      disabled={formResCategory === 'STRIKE TEAM'} // Locked to parent in Strike Team
                    >
                      {CATEGORY_KINDS[formCategory].map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </CanvaSelect>
                    <CanvaSelect 
                      value={subTypeInput}
                      onChange={(e) => setSubTypeInput(e.target.value)}
                      disabled={formResCategory === 'STRIKE TEAM'} // Locked to parent in Strike Team
                    >
                      <option value="TYPE-1">TYPE-1</option>
                      <option value="TYPE-2">TYPE-2</option>
                      <option value="TYPE-3">TYPE-3</option>
                      <option value="TYPE-4">TYPE-4</option>
                      <option value="TYPE-5">TYPE-5</option>
                      <option value="TYPE-6">TYPE-6</option>
                    </CanvaSelect>
                  </div>

                  <CanvaButton type="button" onClick={handleAddSubItem} className="w-full flex items-center justify-center gap-2">
                    <Plus size={14} /> Add Package Sub-Item
                  </CanvaButton>

                  {tempSubEntries.length > 0 && (
                    <div className="border border-zinc-900 rounded-lg overflow-hidden divide-y divide-zinc-900 bg-zinc-900/40 max-h-32 overflow-y-auto">
                      {tempSubEntries.map((sub, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 text-xs font-mono">
                          <span className="text-zinc-300 font-bold">{sub.id}</span>
                          <span className="text-zinc-500 text-[10px]">{sub.kind} | {sub.typing}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveSubItem(idx)}
                            className="text-red-500 hover:text-red-400 p-0.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-950/20 border border-dashed border-zinc-900 p-6 rounded-xl flex flex-col items-center justify-center text-center text-zinc-500">
                <span className="text-xs font-bold uppercase tracking-wider">No Sub-Package Configuration Required</span>
                <span className="text-[10px] mt-1">Package serialization builder triggers when choosing STRIKE TEAM or TASK FORCE.</span>
              </div>
            )}
          </div>

          <CanvaFormRow label="Additional Operations Notes">
            <CanvaTextarea 
              placeholder="Enter capabilities, equipment variations, or certifications..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
            />
          </CanvaFormRow>

          {validationError && (
            <div className="bg-red-950/20 border border-red-900/50 p-3 rounded-xl text-xs font-bold text-red-400">
              ⚠️ {validationError}
            </div>
          )}

          <CanvaButton type="submit" variant="primary" className="w-full justify-center">
            <Plus size={16} /> Deploy & Active Sync
          </CanvaButton>
        </form>
      </CanvaGlassPanel>

      {/* ==========================================
          🖥️ MAIN ACTIVE RESOURCE REGISTRY LEDGER (FULL WIDTH)
          ========================================== */}
      <CanvaGlassPanel className="p-6 border border-zinc-800 space-y-4" glow>
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-amber-500" />
            <h2 className="text-xl font-extrabold uppercase text-zinc-100 tracking-wide">
              Active Resource Registry
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-950 px-3 py-1.5 border border-zinc-900 rounded-full">
            {resources.length} active ledgers
          </span>
        </div>

        <div className="overflow-x-auto custom-scroll">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase font-extrabold text-zinc-500 tracking-widest">
                <th className="pb-3 pl-4">Identifier / Category</th>
                <th className="pb-3">Functional Kind</th>
                <th className="pb-3">Capability Rating</th>
                <th className="pb-3">Base Location / Jurisdiction</th>
                <th className="pb-3">Operational Status</th>
                <th className="pb-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-xs">
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-600 font-bold tracking-wide">
                    NO ACTIVE RESOURCES DEPLOYED IN SYSTEM
                  </td>
                </tr>
              ) : (
                resources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-zinc-950/40 transition-colors">
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-mono font-black text-zinc-100 text-sm hover:text-amber-400 cursor-pointer transition-colors"
                          onClick={() => handleOpenDetails(resource)}
                        >
                          {resource.id}
                        </span>
                        <span className="text-[9px] font-bold bg-zinc-950 border border-zinc-900 text-amber-500 px-2 py-0.5 rounded">
                          {resource.resource_category}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">
                        {resource.category}
                      </div>
                    </td>
                    <td className="py-4 font-bold text-zinc-300">
                      {resource.kind}
                    </td>
                    <td className="py-4 font-black text-amber-500 font-mono">
                      {resource.typing}
                    </td>
                    <td className="py-4 text-zinc-300">
                      <div className="font-semibold">{resource.base_location}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{resource.geographic.jurisdiction}</div>
                    </td>
                    <td className="py-4">
                      <select
                        value={resource.status}
                        onChange={(e) => handleStatusChange(resource.id, e.target.value as ICSResource['status'])}
                        className={`font-mono font-black text-[10px] border uppercase tracking-wider px-2.5 py-1.5 rounded-full cursor-pointer focus:outline-none ${
                          resource.status === 'AVAILABLE'
                            ? 'bg-green-500/15 border-green-500/30 text-green-500'
                            : resource.status === 'ASSIGNED'
                            ? 'bg-blue-500/15 border-blue-500/30 text-blue-500'
                            : 'bg-red-500/15 border-red-500/30 text-red-500'
                        }`}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="OUT OF SERVICE">OUT OF SERVICE</option>
                      </select>
                    </td>
                    <td className="py-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <CanvaButton
                          variant="secondary"
                          onClick={() => handleOpenDetails(resource)}
                          className="p-1 px-2.5 text-[10px] flex items-center gap-1"
                          title="View Full Details"
                        >
                          <Eye size={12} /> Details
                        </CanvaButton>
                        <CanvaButton
                          variant="danger"
                          onClick={() => handleDeleteResource(resource.id)}
                          className="py-1 px-2.5 text-[10px]"
                          title="Delete/Decommission"
                        >
                          <Trash2 size={12} />
                        </CanvaButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CanvaGlassPanel>

      {/* 🔍 DETAILED RESOURCE POPUP MODAL (EDITABLE MODE) */}
      {selectedResource && editResource && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full">
            <CanvaGlassPanel className="p-6 border border-zinc-800 space-y-6 relative overflow-hidden" glow>
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
              
              {/* Modal Header (Removed 'X' close button to keep header minimal per operator request) */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                    <Layers size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black uppercase text-zinc-100 font-mono tracking-wide">{editResource.id}</h3>
                      <span className="text-[9px] font-bold bg-zinc-950 border border-zinc-900 text-amber-500 px-2 py-0.5 rounded">
                        {editResource.resource_category}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">{editResource.category} Details</span>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scroll pr-1">
                {/* Status Selector */}
                <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Operational Status</span>
                    <span className="text-xs text-zinc-400">Alter registry deployment state in real-time</span>
                  </div>
                  <select
                    value={editResource.status}
                    onChange={(e) => {
                      const updatedStatus = e.target.value as ICSResource['status'];
                      setEditResource(prev => prev ? { ...prev, status: updatedStatus } : null);
                    }}
                    className={`font-mono font-black text-xs border uppercase tracking-wider px-3.5 py-2 rounded-full cursor-pointer focus:outline-none ${
                      editResource.status === 'AVAILABLE'
                        ? 'bg-green-500/15 border-green-500/30 text-green-500'
                        : editResource.status === 'ASSIGNED'
                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-500'
                        : 'bg-red-500/15 border-red-500/30 text-red-500'
                    }`}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="OUT OF SERVICE">OUT OF SERVICE</option>
                  </select>
                </div>

                {/* Grid Attributes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950/40 p-3 border border-zinc-900/60 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Functional Kind</span>
                    <CanvaInput 
                      value={editResource.kind}
                      onChange={(e) => setEditResource(prev => prev ? { ...prev, kind: e.target.value } : null)}
                      className="h-8 py-0 px-2 text-xs font-bold text-zinc-100 bg-zinc-950/60 border-zinc-800"
                    />
                  </div>
                  <div className="bg-zinc-950/40 p-3 border border-zinc-900/60 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Capability Rating</span>
                    <CanvaSelect 
                      value={editResource.typing}
                      onChange={(e) => setEditResource(prev => prev ? { ...prev, typing: e.target.value as any } : null)}
                      className="h-8 py-0 px-2 text-xs font-bold text-amber-500 bg-zinc-950/60 border-zinc-800"
                    >
                      <option value="TYPE-1">TYPE-1</option>
                      <option value="TYPE-2">TYPE-2</option>
                      <option value="TYPE-3">TYPE-3</option>
                      <option value="TYPE-4">TYPE-4</option>
                      <option value="TYPE-5">TYPE-5</option>
                      <option value="TYPE-6">TYPE-6</option>
                    </CanvaSelect>
                  </div>
                  <div className="bg-zinc-950/40 p-3 border border-zinc-900/60 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Response Radius (Miles)</span>
                    <CanvaInput 
                      type="number"
                      min="1"
                      value={editResource.geographic.response_radius}
                      onChange={(e) => setEditResource(prev => prev ? { ...prev, geographic: { ...prev.geographic, response_radius: Math.max(1, Number(e.target.value)) } } : null)}
                      className="h-8 py-0 px-2 text-xs font-mono font-bold text-zinc-100 bg-zinc-950/60 border-zinc-800"
                    />
                  </div>
                  <div className="bg-zinc-950/40 p-3 border border-zinc-900/60 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Jurisdiction</span>
                    <CanvaInput 
                      value={editResource.geographic.jurisdiction}
                      onChange={(e) => setEditResource(prev => prev ? { ...prev, geographic: { ...prev.geographic, jurisdiction: e.target.value } } : null)}
                      className="h-8 py-0 px-2 text-xs font-bold text-zinc-100 bg-zinc-950/60 border-zinc-800"
                    />
                  </div>
                </div>

                <div className="bg-zinc-950/40 p-3 border border-zinc-900/60 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Staging Base / Location</span>
                  <CanvaInput 
                    value={editResource.base_location}
                    onChange={(e) => setEditResource(prev => prev ? { ...prev, base_location: e.target.value } : null)}
                    className="h-8 py-0 px-2 text-xs font-bold text-zinc-100 bg-zinc-950/60 border-zinc-800"
                  />
                </div>

                {/* Cost Section */}
                <div className="bg-zinc-950/80 border border-zinc-900 p-4 rounded-xl space-y-2">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-1.5 flex justify-between items-center">
                    <span>EOC Cost Accounting Variables</span>
                    <span className="text-amber-500 font-mono font-black">BURN RATE: ${editResource.cost.hourly + editResource.cost.driver_operator_cost}/HR</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-zinc-900/30 pr-2">
                      <span className="text-zinc-500 shrink-0">Hourly Base:</span>
                      <div className="flex items-center gap-1 font-mono text-zinc-300 font-bold">
                        <span>$</span>
                        <input 
                          type="number"
                          min="0"
                          value={editResource.cost.hourly}
                          onChange={(e) => setEditResource(prev => prev ? { ...prev, cost: { ...prev.cost, hourly: Math.max(0, Number(e.target.value)) } } : null)}
                          className="w-16 bg-zinc-950 border border-zinc-800 px-1 py-0.5 rounded text-right focus:outline-none"
                        />
                        <span>/hr</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-zinc-900/30 pl-2">
                      <span className="text-zinc-500 shrink-0">Contract Rate:</span>
                      <div className="flex items-center gap-1 font-mono text-zinc-300 font-bold">
                        <span>$</span>
                        <input 
                          type="number"
                          min="0"
                          value={editResource.cost.contract_rate}
                          onChange={(e) => setEditResource(prev => prev ? { ...prev, cost: { ...prev.cost, contract_rate: Math.max(0, Number(e.target.value)) } } : null)}
                          className="w-16 bg-zinc-950 border border-zinc-800 px-1 py-0.5 rounded text-right focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-zinc-900/30 pr-2">
                      <span className="text-zinc-500 shrink-0">Mileage Monitor:</span>
                      <div className="flex items-center gap-1 font-mono text-zinc-300 font-bold">
                        <span>$</span>
                        <input 
                          type="number"
                          step="0.1"
                          min="0"
                          value={editResource.cost.mileage_monitor}
                          onChange={(e) => setEditResource(prev => prev ? { ...prev, cost: { ...prev.cost, mileage_monitor: Math.max(0, Number(e.target.value)) } } : null)}
                          className="w-16 bg-zinc-950 border border-zinc-800 px-1 py-0.5 rounded text-right focus:outline-none"
                        />
                        <span>/mile</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-zinc-900/30 pl-2">
                      <span className="text-zinc-500 shrink-0">Driver/Operator:</span>
                      <div className="flex items-center gap-1 font-mono text-zinc-300 font-bold">
                        <span>$</span>
                        <input 
                          type="number"
                          min="0"
                          value={editResource.cost.driver_operator_cost}
                          onChange={(e) => setEditResource(prev => prev ? { ...prev, cost: { ...prev.cost, driver_operator_cost: Math.max(0, Number(e.target.value)) } } : null)}
                          className="w-16 bg-zinc-950 border border-zinc-800 px-1 py-0.5 rounded text-right focus:outline-none"
                        />
                        <span>/hr</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-entries List */}
                {editResource.sub_entries && editResource.sub_entries.length > 0 && (
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-2">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-900 pb-1.5">
                      Rostered Package Elements ({editResource.sub_entries.length})
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scroll">
                      {editResource.sub_entries.map((sub, i) => (
                        <div key={i} className="text-xs font-mono bg-zinc-900 border border-zinc-950 p-2 rounded-lg flex items-center justify-between text-zinc-400">
                          <span className="font-extrabold text-zinc-200">{sub.id}</span>
                          <span className="text-[10px] text-zinc-500">{sub.kind} | {sub.typing}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="bg-zinc-950/40 p-4 border border-zinc-900/60 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Operational Notes</span>
                  <textarea 
                    value={editResource.notes || ''}
                    onChange={(e) => setEditResource(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    rows={2}
                    className="w-full text-xs text-zinc-300 leading-normal font-mono bg-zinc-950/60 border border-zinc-800 rounded-lg p-2 focus:outline-none focus:border-amber-500/50"
                    placeholder="Enter operational planning updates, credentials, or tracking identifiers..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <CanvaButton
                  variant="danger"
                  onClick={() => {
                    handleDeleteResource(editResource.id);
                    setSelectedResource(null);
                    setEditResource(null);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Decommission Asset
                </CanvaButton>
                <div className="flex gap-2">
                  <CanvaButton
                    variant="secondary"
                    onClick={() => {
                      setSelectedResource(null);
                      setEditResource(null);
                    }}
                  >
                    Cancel
                  </CanvaButton>
                  <CanvaButton
                    variant="primary"
                    onClick={() => handleUpdateResource(editResource)}
                  >
                    Save Changes
                  </CanvaButton>
                </div>
              </div>
            </CanvaGlassPanel>
          </div>
        </div>
      )}

      {/* ==========================================
          🧮 NIMS ICS RESOURCE ORDERING WORKSHEET (FULL WIDTH AT BOTTOM)
          ========================================== */}
      <CanvaGlassPanel className="p-6 border border-zinc-800 space-y-4 relative overflow-hidden" glow>
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
        
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
          <Calculator size={18} className="text-amber-500" />
          <h2 className="text-lg font-black uppercase text-zinc-100 tracking-wider">Resource Order Worksheet</h2>
        </div>
        
        <p className="text-xs text-zinc-400">
          Compute asset shortfalls during operational planning phases. Follows standard ICS quota metrics:
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pt-2">
          {/* Filters Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <CanvaFormRow label="Category Filter">
              <CanvaSelect 
                value={wsCategory} 
                onChange={(e) => {
                  const cat = e.target.value as ICSResource['category'];
                  setWsCategory(cat);
                  setWsKind(CATEGORY_KINDS[cat][0]);
                }}
                className="w-full"
              >
                <option value="EQUIPMENT">EQUIPMENT</option>
                <option value="FACILITY">FACILITY</option>
                <option value="PERSONNEL">PERSONNEL</option>
              </CanvaSelect>
            </CanvaFormRow>

            <CanvaFormRow label="Resource Functional Kind">
              <CanvaSelect value={wsKind} onChange={(e) => setWsKind(e.target.value)} className="w-full">
                {CATEGORY_KINDS[wsCategory].map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </CanvaSelect>
            </CanvaFormRow>

            <CanvaFormRow label="Total Required Assets">
              <CanvaInput 
                type="number" 
                min="0" 
                value={wsRequired} 
                onChange={(e) => setWsRequired(Math.max(0, Number(e.target.value)))} 
                className="w-full"
              />
            </CanvaFormRow>
          </div>

          {/* Math render panel & quick deploy */}
          <div className="space-y-4">
            <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-4 grid grid-cols-3 gap-2 text-center">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Required</span>
                <span className="text-lg font-black text-zinc-200 font-mono">{wsRequired}</span>
              </div>
              <div className="space-y-1 border-x border-zinc-900">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">In-System</span>
                <span className="text-lg font-black text-zinc-200 font-mono">{calculatedHave}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Shortfall</span>
                <span className={`text-lg font-black font-mono ${calculatedNeed > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                  {calculatedNeed}
                </span>
              </div>
            </div>

            <CanvaButton 
              type="button" 
              variant="primary" 
              onClick={handleQuickDeploy} 
              className="w-full justify-center flex items-center gap-2"
            >
              <Plus size={14} /> Quick Deploy {wsKind}
            </CanvaButton>
          </div>
        </div>
      </CanvaGlassPanel>
    </div>
  );
};

export default ResourcesManager;
