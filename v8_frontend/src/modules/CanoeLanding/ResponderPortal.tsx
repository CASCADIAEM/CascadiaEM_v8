import React, { useState, useEffect } from 'react';
import { CanvaGlassPanel, CanvaButton, CanvaTextarea } from '../../components/DesignSandbox';
import { 
  playTacticalAlert, 
  CANOE_STORAGE_KEYS, 
  fetchStoredState, 
  broadcastStateChange,
  type ResponderUnit, 
  type Incident,
  type GlobalAlert 
} from './CanoeDataBus';
import { Shield, Activity, Bell, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface ResponderPortalProps {
  name: string;
  phone: string;
  roleType: string;
}

export const ResponderPortal: React.FC<ResponderPortalProps> = ({ name, phone, roleType }) => {
  const [me, setMe] = useState<ResponderUnit>({
    id: phone, // phone double acts as stable ID
    name,
    role: roleType as any,
    status: 'STANDBY'
  });

  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [clearingNotes, setClearingNotes] = useState('');
  const [showClearNotesBox, setShowClearNotesBox] = useState(false);
  const [globalAlert, setGlobalAlert] = useState<GlobalAlert>({ message: '', severity: 'none', timestamp: 0 });

  // Sync state on launch and handle incoming Command Dispatches
  useEffect(() => {
    // 1. Register our unit in the shared responders pool
    const pool = fetchStoredState<ResponderUnit[]>(CANOE_STORAGE_KEYS.RESPONDERS, []);
    const existingIdx = pool.findIndex(r => r.id === me.id);
    let updatedMe: ResponderUnit = me;
    if (existingIdx >= 0) {
      // If the record exists, retain its active status/incidents but update the name/role to what they just entered!
      updatedMe = { 
        ...pool[existingIdx], 
        name: me.name, 
        role: me.role 
      };
      pool[existingIdx] = updatedMe;
    } else {
      pool.push(updatedMe);
    }
    broadcastStateChange(CANOE_STORAGE_KEYS.RESPONDERS, pool);
    setMe(updatedMe);

    // 1.5 Load active global alert state
    setGlobalAlert(fetchStoredState<GlobalAlert>(CANOE_STORAGE_KEYS.ALERT, { message: '', severity: 'none', timestamp: 0 }));

    // 2. Storage event watcher
    const syncState = (e: StorageEvent | CustomEvent) => {
      let key = '';
      if (e instanceof StorageEvent) {
        key = e.key || '';
      } else {
        key = e.detail?.key;
      }

      if (key === CANOE_STORAGE_KEYS.RESPONDERS) {
        const latestPool = fetchStoredState<ResponderUnit[]>(CANOE_STORAGE_KEYS.RESPONDERS, []);
        const myRecord = latestPool.find(r => r.id === me.id);
        if (myRecord) {
          setMe(myRecord);
          
          // Detect incoming dispatch trigger
          if (myRecord.activeIncidentId && (!me.activeIncidentId || myRecord.activeIncidentId !== me.activeIncidentId)) {
            // Find matched incident
            const incidents = fetchStoredState<Incident[]>(CANOE_STORAGE_KEYS.INCIDENTS, []);
            const matched = incidents.find(i => i.id === myRecord.activeIncidentId);
            if (matched) {
              setActiveIncident(matched);
              // Sound a distinct continuous attention-grabber alarm
              playTacticalAlert('continuous_alarm');
            }
          } else if (!myRecord.activeIncidentId) {
            setActiveIncident(null);
            setShowClearNotesBox(false);
          }
        }
      } else if (key === CANOE_STORAGE_KEYS.ALERT) {
        const latest = fetchStoredState<GlobalAlert>(CANOE_STORAGE_KEYS.ALERT, { message: '', severity: 'none', timestamp: 0 });
        setGlobalAlert(latest);
        if (latest.severity !== 'none') {
          playTacticalAlert(latest.severity === 'red' ? 'dual_siren' : 'single_beep');
        }
      }
    };

    window.addEventListener('storage', syncState);
    window.addEventListener('cem_state_sync' as any, syncState);
    return () => {
      window.removeEventListener('storage', syncState);
      window.removeEventListener('cem_state_sync' as any, syncState);
    };
  }, [me.activeIncidentId]);

  // Update our state and broadcast back to the IC
  const updateMyStatus = (newStatus: ResponderUnit['status'], optionalNotes = '') => {
    const latestPool = fetchStoredState<ResponderUnit[]>(CANOE_STORAGE_KEYS.RESPONDERS, []);
    const idx = latestPool.findIndex(r => r.id === me.id);
    if (idx >= 0) {
      latestPool[idx].status = newStatus;
      if (optionalNotes) latestPool[idx].notes = optionalNotes;
      if (newStatus === 'CLEARED') {
        latestPool[idx].activeIncidentId = undefined; // Disassociate
        latestPool[idx].status = 'STANDBY'; // Reset to standby
      }
      broadcastStateChange(CANOE_STORAGE_KEYS.RESPONDERS, latestPool);
      setMe(latestPool[idx]);
    }
  };

  const handleAcknowledge = () => {
    playTacticalAlert('single_beep');
    updateMyStatus('ACKNOWLEDGED');
  };

  const handlePatientContact = () => {
    playTacticalAlert('single_beep');
    updateMyStatus('PATIENT_CONTACT');
  };

  const handleClearRelease = () => {
    playTacticalAlert('single_beep');
    setShowClearNotesBox(true);
  };

  const handleFinalSubmitClear = () => {
    playTacticalAlert('single_beep');
    updateMyStatus('CLEARED', clearingNotes || 'Completed with no notes.');
    setClearingNotes('');
    setShowClearNotesBox(false);
    setActiveIncident(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-4 select-none font-sans">
      {/* Device bar */}
      <div className="flex flex-col gap-2 mb-4 border-b border-zinc-900 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-amber-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              RESPONDER PORTAL - TIER II
            </span>
          </div>
          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
            {me.role.toUpperCase()} SUPPORT
          </span>
        </div>
        {/* At-a-glance Registration display */}
        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg flex items-center justify-between">
          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">ACTIVE FIELD UNIT</span>
          <span className="text-amber-500 font-black text-sm uppercase tracking-wide font-mono">{me.name}</span>
        </div>
      </div>

      {/* Global Command Broadcast Alert Banner */}
      {globalAlert.severity !== 'none' && (
        <div className={`mb-3 p-3 rounded-lg border flex items-start gap-2.5 ${
          globalAlert.severity === 'red' 
            ? 'bg-red-950/40 border-red-800 text-red-200 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
            : 'bg-amber-950/25 border-amber-800/60 text-amber-200'
        }`}>
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle className={`h-4 w-4 ${globalAlert.severity === 'red' ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex-1 font-mono text-[10px] leading-relaxed">
            <span className="font-black uppercase tracking-widest block text-[8px] opacity-75 mb-0.5">
              {globalAlert.severity === 'red' ? '🚨 CRITICAL COMMAND BROADCAST' : '⚠️ COMMAND FIELD ADVISORY'}
            </span>
            {globalAlert.message}
          </div>
        </div>
      )}

      {/* Standby view vs Dispatch view */}
      {!activeIncident ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <Shield className="h-20 w-20 text-emerald-500/85 animate-pulse" />
          <div>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest">
              STANDBY IN FIELD
            </h2>
            <p className="text-zinc-500 text-xs mt-1 max-w-xs font-mono leading-relaxed">
              Monitoring active frequencies. Keep browser open. You will be alerted when a rescue or incident is dispatched to you.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4">
          {/* Dispatch Alert Box */}
          <CanvaGlassPanel highlight="red-heavy" bannerText="🚨 COMMAND INCIDENT DISPATCH" className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-5 w-5 text-red-500 animate-bounce" />
              <h2 className="text-red-400 text-sm font-black uppercase tracking-widest">
                {activeIncident.title}
              </h2>
            </div>
            <p className="text-zinc-200 text-xs font-mono leading-relaxed bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg mb-1">
              {activeIncident.description}
            </p>
          </CanvaGlassPanel>

          {/* Dynamic Three-Tap Actions Flow */}
          <div className="flex-1 flex flex-col justify-end gap-3.5 pb-4">
            {!showClearNotesBox ? (
              <>
                {/* Step 1: Acknowledge */}
                <CanvaButton
                  onClick={handleAcknowledge}
                  disabled={me.status !== 'STANDBY'}
                  className={`w-full py-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 rounded-lg transition-all active:scale-95 ${
                    me.status === 'STANDBY'
                      ? 'bg-amber-500 text-zinc-950 border-transparent hover:bg-amber-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800/80 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  1. Confirm Dispatch Acknowledge
                </CanvaButton>

                {/* Step 2: Patient Contact */}
                <CanvaButton
                  onClick={handlePatientContact}
                  disabled={me.status !== 'ACKNOWLEDGED'}
                  className={`w-full py-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 rounded-lg transition-all active:scale-95 ${
                    me.status === 'ACKNOWLEDGED'
                      ? 'bg-sky-500 text-zinc-950 border-transparent hover:bg-sky-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800/80 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  2. Log Patient Contact
                </CanvaButton>

                {/* Step 3: Clear / Release */}
                <CanvaButton
                  onClick={handleClearRelease}
                  disabled={me.status !== 'PATIENT_CONTACT'}
                  className={`w-full py-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 rounded-lg transition-all active:scale-95 ${
                    me.status === 'PATIENT_CONTACT'
                      ? 'bg-emerald-600 text-zinc-950 border-transparent hover:bg-emerald-500 shadow-md'
                      : 'bg-zinc-900 border-zinc-800/80 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  3. Log Release & Clear Scene
                </CanvaButton>
              </>
            ) : (
              /* Clearance Notes Overlay screen */
              <CanvaGlassPanel className="p-4 border-emerald-500/40 bg-zinc-900/90 flex flex-col gap-3 rounded-lg">
                <span className="text-emerald-400 text-xs font-black uppercase tracking-widest block text-center">
                  Incident Release Narrative
                </span>
                <CanvaTextarea
                  placeholder="Enter quick notes (e.g., Dehydration, administered fluids, cleared by medic)"
                  value={clearingNotes}
                  onChange={(e) => setClearingNotes(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-850 focus:border-emerald-500 text-zinc-100 rounded focus:outline-none"
                />
                <CanvaButton
                  onClick={handleFinalSubmitClear}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95"
                >
                  Submit Notes & Return to Standby
                </CanvaButton>
              </CanvaGlassPanel>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
