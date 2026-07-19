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
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col p-5 select-none font-sans gap-5">
      {/* Device bar */}
      <div className="flex flex-col gap-3 border-b-2 border-zinc-950 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-500 animate-pulse" />
            <span className="text-xs md:text-sm font-black uppercase tracking-widest text-zinc-300">
              RESPONDER PORTAL - TIER II
            </span>
          </div>
          <span className="text-xs font-black text-zinc-400 uppercase tracking-widest border border-zinc-800 px-2 py-0.5 rounded bg-zinc-900">
            {me.role.toUpperCase()} SUPPORT
          </span>
        </div>
        {/* At-a-glance Registration display */}
        <div className="bg-zinc-950 border-2 border-zinc-900 p-4 rounded-xl flex items-center justify-between">
          <span className="text-zinc-400 text-xs md:text-sm font-black uppercase tracking-wider">ACTIVE FIELD UNIT</span>
          <span className="text-amber-400 font-black text-lg md:text-2xl uppercase tracking-widest font-mono">{me.name}</span>
        </div>
      </div>

      {/* Global Command Broadcast Alert Banner - MAX LEGIBILITY FOR TABLET */}
      {globalAlert.severity !== 'none' && (
        <div className={`p-5 md:p-8 rounded-2xl border-4 flex items-start gap-4 shadow-xl ${
          globalAlert.severity === 'red' 
            ? 'bg-red-950/60 border-red-500 text-red-100 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.25)]' 
            : 'bg-amber-950/50 border-amber-500 text-amber-100'
        }`}>
          <div className="flex-shrink-0 mt-1">
            <AlertTriangle className={`h-8 w-8 md:h-12 md:w-12 ${globalAlert.severity === 'red' ? 'text-red-400' : 'text-amber-400 animate-bounce'}`} />
          </div>
          <div className="flex-1 leading-relaxed">
            <span className="font-black uppercase tracking-widest block text-xs md:text-base opacity-90 mb-1.5">
              {globalAlert.severity === 'red' ? '🚨 CRITICAL COMMAND BROADCAST' : '⚠️ COMMAND FIELD ADVISORY'}
            </span>
            <span className="text-base md:text-2xl font-black font-mono block">
              {globalAlert.message}
            </span>
          </div>
        </div>
      )}

      {/* Standby view vs Dispatch view */}
      {!activeIncident ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-12">
          <Shield className="h-28 w-28 md:h-36 md:w-36 text-emerald-400/90 animate-pulse" />
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-emerald-400 uppercase tracking-widest">
              STANDBY IN FIELD
            </h2>
            <p className="text-zinc-400 text-sm md:text-lg max-w-sm font-mono leading-relaxed mx-auto">
              Monitoring active frequencies. Keep browser open. You will be alerted when a rescue or incident is dispatched to you.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6">
          {/* Dispatch Alert Box */}
          <CanvaGlassPanel highlight="red-heavy" bannerText="🚨 COMMAND INCIDENT DISPATCH" className="p-6 border-2 border-red-500/80 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="h-6 w-6 md:h-8 md:w-8 text-red-500 animate-bounce" />
              <h2 className="text-red-400 text-lg md:text-2xl font-black uppercase tracking-widest">
                {activeIncident.title}
              </h2>
            </div>
            <p className="text-white text-base md:text-xl font-black font-mono leading-relaxed bg-black border-2 border-zinc-900 p-4 md:p-6 rounded-xl mb-1">
              {activeIncident.description}
            </p>
          </CanvaGlassPanel>

          {/* Dynamic Three-Tap Actions Flow - OVERSIZED TARGETS */}
          <div className="flex-1 flex flex-col justify-end gap-5 pb-6">
            {!showClearNotesBox ? (
              <>
                {/* Step 1: Acknowledge */}
                <CanvaButton
                  onClick={handleAcknowledge}
                  disabled={me.status !== 'STANDBY'}
                  className={`w-full py-5 md:py-7 text-sm md:text-lg font-black uppercase tracking-wider flex items-center justify-center gap-3 rounded-xl transition-all active:scale-95 border-2 ${
                    me.status === 'STANDBY'
                      ? 'bg-amber-500 text-zinc-950 border-transparent hover:bg-amber-400 shadow-lg'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="h-5 w-5 md:h-7 md:w-7" />
                  1. Confirm Dispatch Acknowledge
                </CanvaButton>

                {/* Step 2: Patient Contact */}
                <CanvaButton
                  onClick={handlePatientContact}
                  disabled={me.status !== 'ACKNOWLEDGED'}
                  className={`w-full py-5 md:py-7 text-sm md:text-lg font-black uppercase tracking-wider flex items-center justify-center gap-3 rounded-xl transition-all active:scale-95 border-2 ${
                    me.status === 'ACKNOWLEDGED'
                      ? 'bg-sky-500 text-zinc-950 border-transparent hover:bg-sky-400 shadow-lg'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <Activity className="h-5 w-5 md:h-7 md:w-7" />
                  2. Log Patient Contact
                </CanvaButton>

                {/* Step 3: Clear / Release */}
                <CanvaButton
                  onClick={handleClearRelease}
                  disabled={me.status !== 'PATIENT_CONTACT'}
                  className={`w-full py-5 md:py-7 text-sm md:text-lg font-black uppercase tracking-wider flex items-center justify-center gap-3 rounded-xl transition-all active:scale-95 border-2 ${
                    me.status === 'PATIENT_CONTACT'
                      ? 'bg-emerald-500 text-zinc-950 border-transparent hover:bg-emerald-400 shadow-lg'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <FileText className="h-5 w-5 md:h-7 md:w-7" />
                  3. Log Release & Clear Scene
                </CanvaButton>
              </>
            ) : (
              /* Clearance Notes Overlay screen */
              <CanvaGlassPanel className="p-6 border-2 border-emerald-500 bg-zinc-950 flex flex-col gap-4 rounded-2xl shadow-2xl">
                <span className="text-emerald-400 text-sm md:text-lg font-black uppercase tracking-widest block text-center">
                  Incident Release Narrative
                </span>
                <textarea
                  placeholder="Enter quick notes (e.g., Dehydration, administered fluids, cleared by medic)"
                  value={clearingNotes}
                  onChange={(e) => setClearingNotes(e.target.value)}
                  rows={4}
                  className="w-full text-base md:text-lg font-semibold p-4 bg-black border-2 border-zinc-900 focus:border-emerald-500 text-zinc-100 rounded-xl focus:outline-none placeholder-zinc-600"
                />
                <CanvaButton
                  onClick={handleFinalSubmitClear}
                  className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm md:text-base uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg"
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
