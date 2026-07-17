import { useState, useEffect } from 'react';
import { useDropdowns } from '../services/DropdownService';
import type { Dropdowns } from '../services/DropdownService';
import { 
  CanvaGlassPanel, 
  CanvaButton, 
  CanvaInput 
} from '../components/DesignSandbox';
import { 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  RotateCcw,
  BookUser,
  MessageSquare,
  Users,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

export default function AppSettings() {
  const { dropdowns, saveDropdowns } = useDropdowns();
  const [localDropdowns, setLocalDropdowns] = useState<Dropdowns | null>(null);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');

  // Individual text inputs for adding new options
  const [newRosterStatus, setNewRosterStatus] = useState('');
  const [newEsf, setNewEsf] = useState('');
  const [newApprovingRole, setNewApprovingRole] = useState('');
  const [newEquipmentKind, setNewEquipmentKind] = useState('');
  const [newFacilityKind, setNewFacilityKind] = useState('');
  const [newPersonnelKind, setNewPersonnelKind] = useState('');
  const [newTeamType, setNewTeamType] = useState('');
  const [newAgency, setNewAgency] = useState('');

  // Sync local state when DB dropdowns load/change
  useEffect(() => {
    if (dropdowns) {
      setLocalDropdowns({ ...dropdowns });
    }
  }, [dropdowns]);

  if (!localDropdowns) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-zinc-500 font-mono text-xs uppercase animate-pulse">
          Loading Customizer Settings...
        </div>
      </div>
    );
  }

  // Add option helper
  const addOption = (key: keyof Dropdowns, value: string, clearInput: () => void) => {
    if (key === 'mission_categories') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const array = localDropdowns[key] as string[];
    if (array.includes(trimmed)) {
      setErrorMessage(`Option "${trimmed}" already exists.`);
      setSaveStatus('ERROR');
      return;
    }

    setLocalDropdowns({
      ...localDropdowns,
      [key]: [...array, trimmed]
    });
    clearInput();
    setErrorMessage('');
    if (saveStatus === 'ERROR') setSaveStatus('IDLE');
  };

  // Remove option helper
  const removeOption = (key: keyof Dropdowns, indexToRemove: number) => {
    if (key === 'mission_categories') return;
    const array = localDropdowns[key] as string[];
    setLocalDropdowns({
      ...localDropdowns,
      [key]: array.filter((_, index) => index !== indexToRemove)
    });
    setErrorMessage('');
    if (saveStatus === 'ERROR') setSaveStatus('IDLE');
  };

  // Reset to default settings
  const resetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all pull-down menus to their original defaults? This will not save until you click Publish.')) {
      // Import the default directly to reset
      import('../services/DropdownService').then((module) => {
        setLocalDropdowns({ ...module.DEFAULT_DROPDOWNS });
        setSaveStatus('IDLE');
        setErrorMessage('');
      });
    }
  };

  // Save/Publish to Firestore
  const handlePublish = async () => {
    try {
      setSaveStatus('SAVING');
      await saveDropdowns(localDropdowns);
      setSaveStatus('SUCCESS');
      setTimeout(() => setSaveStatus('IDLE'), 4000);
    } catch (err: any) {
      console.error('Error saving dropdowns:', err);
      setErrorMessage(err.message || 'Failed to update Firestore configuration document.');
      setSaveStatus('ERROR');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Control Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2">
            App Settings
          </h1>
          <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mt-1">
            Customise pulldown lists and menu options across every module
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <CanvaButton 
            variant="secondary"
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 text-xs py-2 px-3.5 border-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <RotateCcw size={14} />
            Reset Defaults
          </CanvaButton>

          <CanvaButton 
            variant="primary"
            onClick={handlePublish}
            disabled={saveStatus === 'SAVING'}
            className={`flex items-center gap-1.5 text-xs py-2 px-4 font-extrabold ${
              saveStatus === 'SUCCESS' ? 'bg-emerald-600 border-emerald-500 text-white' : ''
            }`}
          >
            <Save size={14} />
            {saveStatus === 'SAVING' ? 'Publishing...' : saveStatus === 'SUCCESS' ? 'Published!' : 'Publish Changes'}
          </CanvaButton>
        </div>
      </div>

      {/* Success / Error Messages Panel */}
      {saveStatus === 'SUCCESS' && (
        <div className="bg-emerald-950/25 border border-emerald-900/40 text-emerald-400 p-4 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>All pull-down options are published live. Changes are active immediately across all modules.</span>
        </div>
      )}

      {saveStatus === 'ERROR' && (
        <div className="bg-rose-950/25 border border-rose-900/40 text-rose-400 p-4 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in">
          <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          <span>Error: {errorMessage}</span>
        </div>
      )}

      {/* Grid of Dropdown Sections sorted by Page/Function */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SECTION 1: Contact Directory */}
        <CanvaGlassPanel className="p-5 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-3">
            <BookUser className="text-amber-500" size={18} />
            <h2 className="text-sm font-black uppercase text-zinc-200 tracking-wider">Contact Directory Settings</h2>
          </div>

          {/* Roster Status Options */}
          <div className="space-y-3">
            <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Roster Status Options</label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl min-h-[50px]">
              {localDropdowns.roster_status_options.map((opt, i) => (
                <div key={opt} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                  <span>{opt}</span>
                  <button 
                    onClick={() => removeOption('roster_status_options', i)}
                    className="text-zinc-600 hover:text-rose-400 transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <CanvaInput 
                value={newRosterStatus}
                onChange={e => setNewRosterStatus(e.target.value)}
                placeholder="Add new status..."
                onKeyDown={e => e.key === 'Enter' && addOption('roster_status_options', newRosterStatus, () => setNewRosterStatus(''))}
                className="flex-1"
              />
              <CanvaButton 
                onClick={() => addOption('roster_status_options', newRosterStatus, () => setNewRosterStatus(''))}
                className="p-2.5"
              >
                <Plus size={16} />
              </CanvaButton>
            </div>
          </div>

          {/* ESF Designations */}
          <div className="space-y-3">
            <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">ESF Designations</label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl min-h-[50px] max-h-[160px] overflow-y-auto">
              {localDropdowns.esf_designations.map((opt, i) => (
                <div key={opt} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                  <span>{opt}</span>
                  <button 
                    onClick={() => removeOption('esf_designations', i)}
                    className="text-zinc-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <CanvaInput 
                value={newEsf}
                onChange={e => setNewEsf(e.target.value)}
                placeholder="e.g. ESF-15 (External Affairs)..."
                onKeyDown={e => e.key === 'Enter' && addOption('esf_designations', newEsf, () => setNewEsf(''))}
                className="flex-1"
              />
              <CanvaButton 
                onClick={() => addOption('esf_designations', newEsf, () => setNewEsf(''))}
                className="p-2.5"
              >
                <Plus size={16} />
              </CanvaButton>
            </div>
          </div>
        </CanvaGlassPanel>

        {/* SECTION 2: Emergency Messaging */}
        <CanvaGlassPanel className="p-5 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-3">
            <MessageSquare className="text-amber-500" size={18} />
            <h2 className="text-sm font-black uppercase text-zinc-200 tracking-wider">Emergency Messaging Settings</h2>
          </div>

          {/* Approving Operational Roles */}
          <div className="space-y-3">
            <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Message Approval Roles</label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl min-h-[50px]">
              {localDropdowns.approving_roles.map((opt, i) => (
                <div key={opt} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                  <span>{opt}</span>
                  <button 
                    onClick={() => removeOption('approving_roles', i)}
                    className="text-zinc-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <CanvaInput 
                value={newApprovingRole}
                onChange={e => setNewApprovingRole(e.target.value)}
                placeholder="e.g. Public Information Officer..."
                onKeyDown={e => e.key === 'Enter' && addOption('approving_roles', newApprovingRole, () => setNewApprovingRole(''))}
                className="flex-1"
              />
              <CanvaButton 
                onClick={() => addOption('approving_roles', newApprovingRole, () => setNewApprovingRole(''))}
                className="p-2.5"
              >
                <Plus size={16} />
              </CanvaButton>
            </div>
          </div>
        </CanvaGlassPanel>

        {/* SECTION 3: Teams & Personnel */}
        <CanvaGlassPanel className="p-5 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-3">
            <Users className="text-amber-500" size={18} />
            <h2 className="text-sm font-black uppercase text-zinc-200 tracking-wider">Teams & Personnel Settings</h2>
          </div>

          {/* Team Unit Classes */}
          <div className="space-y-3">
            <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Team Unit Classes</label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl min-h-[50px]">
              {localDropdowns.team_types.map((opt, i) => (
                <div key={opt} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                  <span>{opt}</span>
                  <button 
                    onClick={() => removeOption('team_types', i)}
                    className="text-zinc-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <CanvaInput 
                value={newTeamType}
                onChange={e => setNewTeamType(e.target.value)}
                placeholder="e.g. DIVISION..."
                onKeyDown={e => e.key === 'Enter' && addOption('team_types', newTeamType, () => setNewTeamType(''))}
                className="flex-1"
              />
              <CanvaButton 
                onClick={() => addOption('team_types', newTeamType, () => setNewTeamType(''))}
                className="p-2.5"
              >
                <Plus size={16} />
              </CanvaButton>
            </div>
          </div>

          {/* Sponsoring Agencies */}
          <div className="space-y-3">
            <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Sponsoring Agencies</label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl min-h-[50px]">
              {localDropdowns.sponsoring_agencies.map((opt, i) => (
                <div key={opt} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                  <span>{opt}</span>
                  <button 
                    onClick={() => removeOption('sponsoring_agencies', i)}
                    className="text-zinc-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <CanvaInput 
                value={newAgency}
                onChange={e => setNewAgency(e.target.value)}
                placeholder="e.g. MUNICIPAL UTILITIES..."
                onKeyDown={e => e.key === 'Enter' && addOption('sponsoring_agencies', newAgency, () => setNewAgency(''))}
                className="flex-1"
              />
              <CanvaButton 
                onClick={() => addOption('sponsoring_agencies', newAgency, () => setNewAgency(''))}
                className="p-2.5"
              >
                <Plus size={16} />
              </CanvaButton>
            </div>
          </div>
        </CanvaGlassPanel>

        {/* SECTION 4: Resource Catalog */}
        <CanvaGlassPanel className="p-5 space-y-6 md:col-span-2">
          <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-3">
            <ShieldAlert className="text-amber-500" size={18} />
            <h2 className="text-sm font-black uppercase text-zinc-200 tracking-wider">Resource Catalog Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Equipment Kinds */}
            <div className="space-y-3">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Equipment Types</label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl min-h-[50px] max-h-[150px] overflow-y-auto">
                {localDropdowns.equipment_kinds.map((opt, i) => (
                  <div key={opt} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                    <span>{opt}</span>
                    <button 
                      onClick={() => removeOption('equipment_kinds', i)}
                      className="text-zinc-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <CanvaInput 
                  value={newEquipmentKind}
                  onChange={e => setNewEquipmentKind(e.target.value)}
                  placeholder="Add type..."
                  onKeyDown={e => e.key === 'Enter' && addOption('equipment_kinds', newEquipmentKind, () => setNewEquipmentKind(''))}
                  className="flex-1 text-xs"
                />
                <CanvaButton 
                  onClick={() => addOption('equipment_kinds', newEquipmentKind, () => setNewEquipmentKind(''))}
                  className="p-2.5"
                >
                  <Plus size={14} />
                </CanvaButton>
              </div>
            </div>

            {/* Facility Kinds */}
            <div className="space-y-3">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Facility Types</label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl min-h-[50px] max-h-[150px] overflow-y-auto">
                {localDropdowns.facility_kinds.map((opt, i) => (
                  <div key={opt} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                    <span>{opt}</span>
                    <button 
                      onClick={() => removeOption('facility_kinds', i)}
                      className="text-zinc-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <CanvaInput 
                  value={newFacilityKind}
                  onChange={e => setNewFacilityKind(e.target.value)}
                  placeholder="Add type..."
                  onKeyDown={e => e.key === 'Enter' && addOption('facility_kinds', newFacilityKind, () => setNewFacilityKind(''))}
                  className="flex-1 text-xs"
                />
                <CanvaButton 
                  onClick={() => addOption('facility_kinds', newFacilityKind, () => setNewFacilityKind(''))}
                  className="p-2.5"
                >
                  <Plus size={14} />
                </CanvaButton>
              </div>
            </div>

            {/* Personnel Kinds */}
            <div className="space-y-3">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Personnel Roles</label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl min-h-[50px] max-h-[150px] overflow-y-auto">
                {localDropdowns.personnel_kinds.map((opt, i) => (
                  <div key={opt} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                    <span>{opt}</span>
                    <button 
                      onClick={() => removeOption('personnel_kinds', i)}
                      className="text-zinc-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <CanvaInput 
                  value={newPersonnelKind}
                  onChange={e => setNewPersonnelKind(e.target.value)}
                  placeholder="Add role..."
                  onKeyDown={e => e.key === 'Enter' && addOption('personnel_kinds', newPersonnelKind, () => setNewPersonnelKind(''))}
                  className="flex-1 text-xs"
                />
                <CanvaButton 
                  onClick={() => addOption('personnel_kinds', newPersonnelKind, () => setNewPersonnelKind(''))}
                  className="p-2.5"
                >
                  <Plus size={14} />
                </CanvaButton>
              </div>
            </div>
          </div>
        </CanvaGlassPanel>

      </div>
    </div>
  );
}
