import React, { useState, useEffect } from 'react';
import { CanvaGlassPanel, CanvaButton, CanvaInput } from '../../components/DesignSandbox';
import { 
  playTacticalAlert, 
  CANOE_STORAGE_KEYS, 
  fetchStoredState, 
  broadcastStateChange,
  type ResponderUnit, 
  type Incident, 
  type GlobalAlert 
} from './CanoeDataBus';
import { Shield, Bell, CloudLightning, PhoneCall, Plus, Trash2, Users } from 'lucide-react';

export const ICCommandDashboard: React.FC = () => {
  const [responders, setResponders] = useState<ResponderUnit[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alertMsg, setAlertMsg] = useState('');
  const [agencyNotified, setAgencyNotified] = useState<{ [key: string]: boolean }>({});
  
  // Incident input form state
  const [incTitle, setIncTitle] = useState('');
  const [incDesc, setIncDesc] = useState('');

  // Initial loading and live binding
  useEffect(() => {
    setResponders(fetchStoredState<ResponderUnit[]>(CANOE_STORAGE_KEYS.RESPONDERS, []));
    setIncidents(fetchStoredState<Incident[]>(CANOE_STORAGE_KEYS.INCIDENTS, []));

    const syncState = (e: StorageEvent | CustomEvent) => {
      let key = '';
      if (e instanceof StorageEvent) key = e.key || '';
      else key = e.detail?.key;

      if (key === CANOE_STORAGE_KEYS.RESPONDERS) {
        setResponders(fetchStoredState<ResponderUnit[]>(CANOE_STORAGE_KEYS.RESPONDERS, []));
      } else if (key === CANOE_STORAGE_KEYS.INCIDENTS) {
        setIncidents(fetchStoredState<Incident[]>(CANOE_STORAGE_KEYS.INCIDENTS, []));
      }
    };

    window.addEventListener('storage', syncState);
    window.addEventListener('cem_state_sync' as any, syncState);
    return () => {
      window.removeEventListener('storage', syncState);
      window.removeEventListener('cem_state_sync' as any, syncState);
    };
  }, []);

  // Dispatch Global Alerts to all connected phones (Tier I & II)
  const triggerGlobalBroadcast = (msg: string, severity: 'none' | 'yellow' | 'red') => {
    const alertData: GlobalAlert = { message: msg, severity, timestamp: Date.now() };
    broadcastStateChange(CANOE_STORAGE_KEYS.ALERT, alertData);
    playTacticalAlert(severity === 'red' ? 'dual_siren' : 'single_beep');
  };

  // Create an active rescue / medical emergency incident
  const createIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incTitle.trim()) return;
    const newInc: Incident = {
      id: 'inc_' + Date.now(),
      title: incTitle.trim(),
      description: incDesc.trim() || 'No description provided.',
      severity: 'red',
      timestamp: new Date().toLocaleTimeString(),
      assignedResponders: []
    };
    const updated = [newInc, ...incidents];
    broadcastStateChange(CANOE_STORAGE_KEYS.INCIDENTS, updated);
    setIncidents(updated);
    setIncTitle('');
    setIncDesc('');
    triggerGlobalBroadcast(`NEW DISPATCH INCIDENT: ${newInc.title}`, 'yellow');
  };

  // Dispatch Responder to active Incident
  const assignResponderToIncident = (respId: string, incId: string) => {
    // 1. Update Responder record
    const updatedPool = responders.map(r => {
      if (r.id === respId) {
        return { ...r, activeIncidentId: incId, status: 'STANDBY' as any };
      }
      return r;
    });
    broadcastStateChange(CANOE_STORAGE_KEYS.RESPONDERS, updatedPool);
    setResponders(updatedPool);

    // 2. Update Incident record
    const updatedIncidents = incidents.map(inc => {
      if (inc.id === incId && !inc.assignedResponders.includes(respId)) {
        return { ...inc, assignedResponders: [...inc.assignedResponders, respId] };
      }
      return inc;
    });
    broadcastStateChange(CANOE_STORAGE_KEYS.INCIDENTS, updatedIncidents);
    setIncidents(updatedIncidents);
    playTacticalAlert('single_beep');
  };

  const deleteIncident = (id: string) => {
    const filtered = incidents.filter(i => i.id !== id);
    broadcastStateChange(CANOE_STORAGE_KEYS.INCIDENTS, filtered);
    setIncidents(filtered);
    
    // Release any responder bound to it
    const updatedPool = responders.map(r => {
      if (r.activeIncidentId === id) {
        return { ...r, activeIncidentId: undefined, status: 'STANDBY' as any };
      }
      return r;
    });
    broadcastStateChange(CANOE_STORAGE_KEYS.RESPONDERS, updatedPool);
    setResponders(updatedPool);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-4 select-none font-sans gap-4">
      {/* IC Tactical Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-amber-500 animate-pulse" />
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-zinc-100">
              CASCADIAEM CANOE COMMAND COCKPIT - TIER III
            </h1>
            <p className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider mt-0.5">
              GETAC K120 / TABLET PORTABLE MODULE
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <CanvaButton onClick={() => triggerGlobalBroadcast('STANDDOWN - ALL CANOES SEEK SHELTER IMMEDIATELY', 'red')} variant="danger" className="py-1 px-3 text-[10px] bg-red-950 text-red-200">
            🚨 FORCE GLOBAL SHELTER STAND-DOWN
          </CanvaButton>
          <CanvaButton onClick={() => triggerGlobalBroadcast('Weather conditions clear. Resume normal safety operations.', 'none')} className="py-1 px-3 text-[10px] border-zinc-800 text-zinc-300">
            🟢 CLEAR GLOBAL ALERTS
          </CanvaButton>
        </div>
      </div>

      {/* Multi-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        
        {/* COLUMN 1: Broadcast & Call sheets */}
        <div className="flex flex-col gap-4">
          <CanvaGlassPanel highlight="none" bannerText="⚡ CENTRAL EMERGENCY BROADCAST CONSOLE" className="p-4">
            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
              Broadcast Message
            </label>
            <div className="flex gap-2">
              <CanvaInput
                placeholder="Alert text to flash on participant screens"
                value={alertMsg}
                onChange={(e) => setAlertMsg(e.target.value)}
                className="text-xs bg-zinc-950 border-zinc-850 flex-1"
              />
              <CanvaButton
                onClick={() => {
                  if (alertMsg.trim()) {
                    triggerGlobalBroadcast(alertMsg.trim(), 'yellow');
                    setAlertMsg('');
                  }
                }}
                className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black text-xs px-4"
              >
                Send
              </CanvaButton>
            </div>
            
            {/* Presets */}
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              <button onClick={() => triggerGlobalBroadcast('Lightning detected within 5 miles. Remain alert.', 'yellow')} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-[9px] uppercase tracking-wide rounded">
                ⚡ Lightning Alert
              </button>
              <button onClick={() => triggerGlobalBroadcast('Rough sea states reported. Double-escorts active.', 'yellow')} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-[9px] uppercase tracking-wide rounded">
                🌊 Rough Seas Alert
              </button>
            </div>
          </CanvaGlassPanel>

          {/* External Agency Checklist */}
          <CanvaGlassPanel highlight="none" bannerText="📞 EXTERNAL COORDINATION CONTACT SHEET" className="p-4 flex-1">
            <div className="flex flex-col gap-2 font-mono text-xs text-zinc-400">
              {[
                { name: 'Coast Guard Sector Puget Sound', channel: 'VHF Ch 16 / 206-217-6001' },
                { name: 'Seattle Fire Station 5 Dispatch', channel: 'VHF Ch 14 / 206-386-1400' },
                { name: 'King County Harbor Patrol', channel: 'VHF Ch 16 / 206-296-3333' }
              ].map((agency, i) => (
                <label key={i} className="flex items-start gap-2.5 p-2 bg-zinc-950/40 border border-zinc-850/60 rounded cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!agencyNotified[agency.name]}
                    onChange={(e) => {
                      setAgencyNotified(prev => ({ ...prev, [agency.name]: e.target.checked }));
                      if (e.target.checked) {
                        playTacticalAlert('single_beep');
                      }
                    }}
                    className="h-4 w-4 mt-0.5 accent-amber-500"
                  />
                  <div>
                    <span className="text-zinc-200 font-bold text-xs block">{agency.name}</span>
                    <span className="text-zinc-500 text-[10px] block mt-0.5">{agency.channel}</span>
                  </div>
                </label>
              ))}
            </div>
          </CanvaGlassPanel>
        </div>

        {/* COLUMN 2: Responder Matrix (Staging & Fields) */}
        <div className="flex flex-col">
          <CanvaGlassPanel highlight="none" bannerText="🏥 DISPATCHABLE ACTIVE FIELD UNITS (TIER II)" className="p-4 flex-1 flex flex-col">
            <div className="flex-1 bg-zinc-900/40 border border-zinc-850/60 rounded-lg p-2 overflow-y-auto max-h-[400px] flex flex-col gap-2">
              {responders.length === 0 ? (
                <p className="text-zinc-600 text-xs text-center font-mono py-6">No field responders connected yet. Place beach QR signs to check-in units.</p>
              ) : (
                responders.map(resp => {
                  let statusColor = 'text-zinc-400 bg-zinc-950 border-zinc-850';
                  if (resp.status === 'ACKNOWLEDGED') statusColor = 'text-amber-400 bg-amber-950/20 border-amber-800/60';
                  else if (resp.status === 'PATIENT_CONTACT') statusColor = 'text-sky-400 bg-sky-950/20 border-sky-800/60';

                  return (
                    <div key={resp.id} className={`p-3 rounded-lg border flex flex-col justify-between ${statusColor}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-xs uppercase text-zinc-100">{resp.name}</span>
                          <span className="text-[10px] text-zinc-500 block">📞 {resp.phone}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-zinc-800 bg-zinc-950/80">
                          {resp.status}
                        </span>
                      </div>
                      
                      {resp.notes && (
                        <div className="mt-2 bg-zinc-950/60 p-1.5 rounded text-[10px] font-mono text-zinc-300 border border-zinc-900">
                          <strong>Log Note:</strong> {resp.notes}
                        </div>
                      )}

                      {/* Dropdown to manually dispatch to any active incident */}
                      {resp.status === 'STANDBY' && incidents.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase text-zinc-500">Dispatch:</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                assignResponderToIncident(resp.id, e.target.value);
                                e.target.value = ''; // Reset dropdown
                              }
                            }}
                            className="bg-zinc-950 text-zinc-200 border border-zinc-800 p-1 rounded text-[10px] flex-1 focus:outline-none"
                          >
                            <option value="">Select Incident...</option>
                            {incidents.map(inc => (
                              <option key={inc.id} value={inc.id}>{inc.title}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CanvaGlassPanel>
        </div>

        {/* COLUMN 3: Incidents Dispatch Deck */}
        <div className="flex flex-col gap-4">
          <CanvaGlassPanel highlight="none" bannerText="➕ DECLARE MEDICAL / SAFETY EMERGENCY" className="p-4">
            <form onSubmit={createIncident} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
                  Incident Title / Location
                </label>
                <CanvaInput
                  required
                  placeholder="Medical Call: Landing Zone B"
                  value={incTitle}
                  onChange={(e) => setIncTitle(e.target.value)}
                  className="text-xs bg-zinc-950 border-zinc-850 w-full"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
                  Incident Narrative details
                </label>
                <textarea
                  placeholder="Dehydrated paddler coming ashore, requests oxygen"
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  rows={2}
                  className="bg-zinc-950 border border-zinc-850 text-zinc-100 rounded-lg p-2 text-xs w-full focus:outline-none"
                />
              </div>
              <CanvaButton type="submit" variant="primary" className="py-2 bg-red-950/40 border border-red-800 hover:bg-red-900 hover:text-white text-red-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-lg">
                <Plus className="h-4 w-4" /> Declare & Dispatch Alert
              </CanvaButton>
            </form>
          </CanvaGlassPanel>

          {/* Incidents Board */}
          <div className="flex-1 bg-zinc-900/60 border border-zinc-850/80 rounded-lg p-3 overflow-y-auto max-h-[300px] flex flex-col gap-2">
            <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1 block mb-1">
              ACTIVE FIELD INCIDENTS
            </span>
            {incidents.length === 0 ? (
              <p className="text-zinc-600 text-xs text-center font-mono py-8 uppercase">No active incidents declared.</p>
            ) : (
              incidents.map(inc => (
                <div key={inc.id} className="p-3 bg-red-950/15 border border-red-900/40 rounded-lg flex flex-col justify-between gap-1">
                  <div className="flex justify-between items-start">
                    <span className="text-red-400 font-extrabold text-xs uppercase">{inc.title}</span>
                    <button onClick={() => deleteIncident(inc.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-zinc-300 text-[10px] font-mono leading-relaxed">{inc.description}</p>
                  
                  {/* Assigned Responder count */}
                  <div className="mt-2 pt-1.5 border-t border-red-900/20 flex justify-between items-center text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> Responders: {inc.assignedResponders.length}
                    </span>
                    <span className="text-[9px] text-zinc-600">[{inc.timestamp}]</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
