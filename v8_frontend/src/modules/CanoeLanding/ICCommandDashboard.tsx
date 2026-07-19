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
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col p-5 select-none font-sans gap-5">
      {/* IC Tactical Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-zinc-900 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-amber-500 animate-pulse" />
          <div>
            <h1 className="text-base md:text-xl font-black uppercase tracking-widest text-zinc-100">
              CASCADIAEM CANOE COMMAND COCKPIT - TIER III
            </h1>
            <p className="text-xs text-zinc-400 font-extrabold uppercase tracking-wider mt-0.5">
              GETAC K120 / TABLET PORTABLE MODULE
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <CanvaButton onClick={() => triggerGlobalBroadcast('STANDDOWN - ALL CANOES SEEK SHELTER IMMEDIATELY', 'red')} variant="danger" className="py-2.5 px-4 text-xs bg-red-950/80 border-2 border-red-500 text-red-100 font-black tracking-widest rounded-xl transition-all active:scale-95">
            🚨 FORCE GLOBAL SHELTER STAND-DOWN
          </CanvaButton>
          <CanvaButton onClick={() => triggerGlobalBroadcast('Weather conditions clear. Resume normal safety operations.', 'none')} className="py-2.5 px-4 text-xs border-2 border-zinc-800 bg-zinc-950 text-zinc-300 font-black tracking-widest rounded-xl transition-all active:scale-95">
            🟢 CLEAR GLOBAL ALERTS
          </CanvaButton>
        </div>
      </div>

      {/* Multi-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1">
        
        {/* COLUMN 1: Broadcast & Call sheets */}
        <div className="flex flex-col gap-5">
          <CanvaGlassPanel highlight="none" bannerText="⚡ CENTRAL EMERGENCY BROADCAST CONSOLE" className="p-5 border-2 rounded-2xl">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-400 block mb-2">
              Broadcast Message
            </label>
            <div className="flex gap-2">
              <input
                placeholder="Alert text to flash on participant screens"
                value={alertMsg}
                onChange={(e) => setAlertMsg(e.target.value)}
                className="text-base font-bold bg-black border-2 border-zinc-900 p-3 rounded-xl flex-1 focus:border-amber-500 focus:outline-none text-white placeholder-zinc-700"
              />
              <CanvaButton
                onClick={() => {
                  if (alertMsg.trim()) {
                    triggerGlobalBroadcast(alertMsg.trim(), 'yellow');
                    setAlertMsg('');
                  }
                }}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm px-5 rounded-xl transition-all active:scale-95"
              >
                Send
              </CanvaButton>
            </div>
            
            {/* Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              <button onClick={() => triggerGlobalBroadcast('Lightning detected within 5 miles. Remain alert.', 'yellow')} className="p-3 bg-zinc-950 hover:bg-zinc-900 border-2 border-zinc-900 hover:border-amber-500 text-zinc-200 font-black text-xs uppercase tracking-wider rounded-xl transition-all">
                ⚡ Lightning Alert
              </button>
              <button onClick={() => triggerGlobalBroadcast('Rough sea states reported. Double-escorts active.', 'yellow')} className="p-3 bg-zinc-950 hover:bg-zinc-900 border-2 border-zinc-900 hover:border-amber-500 text-zinc-200 font-black text-xs uppercase tracking-wider rounded-xl transition-all">
                🌊 Rough Seas Alert
              </button>
            </div>
          </CanvaGlassPanel>

          {/* External Agency Checklist */}
          <CanvaGlassPanel highlight="none" bannerText="📞 EXTERNAL COORDINATION CONTACT SHEET" className="p-5 flex-1 border-2 rounded-2xl">
            <div className="flex flex-col gap-3 font-mono text-sm text-zinc-400">
              {[
                { name: 'Coast Guard Sector Puget Sound', channel: 'VHF Ch 16 / 206-217-6001' },
                { name: 'Seattle Fire Station 5 Dispatch', channel: 'VHF Ch 14 / 206-386-1400' },
                { name: 'King County Harbor Patrol', channel: 'VHF Ch 16 / 206-296-3333' }
              ].map((agency, i) => (
                <label key={i} className="flex items-center gap-3.5 p-3 bg-zinc-950 border-2 border-zinc-900 rounded-xl cursor-pointer select-none hover:border-zinc-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!agencyNotified[agency.name]}
                    onChange={(e) => {
                      setAgencyNotified(prev => ({ ...prev, [agency.name]: e.target.checked }));
                      if (e.target.checked) {
                        playTacticalAlert('single_beep');
                      }
                    }}
                    className="h-6 w-6 accent-amber-500 rounded border-2 border-zinc-700 cursor-pointer min-w-[24px]"
                  />
                  <div>
                    <span className="text-zinc-200 font-black text-xs md:text-sm block">{agency.name}</span>
                    <span className="text-zinc-500 text-[11px] block mt-0.5">{agency.channel}</span>
                  </div>
                </label>
              ))}
            </div>
          </CanvaGlassPanel>
        </div>

        {/* COLUMN 2: Responder Matrix (Staging & Fields) */}
        <div className="flex flex-col">
          <CanvaGlassPanel highlight="none" bannerText="🏥 DISPATCHABLE ACTIVE FIELD UNITS (TIER II)" className="p-5 flex-1 flex flex-col border-2 rounded-2xl">
            <div className="flex-1 bg-zinc-950 border-2 border-zinc-900 rounded-xl p-3 overflow-y-auto max-h-[500px] flex flex-col gap-3">
              {responders.length === 0 ? (
                <p className="text-zinc-600 text-xs md:text-sm text-center font-mono py-12 uppercase">No field responders connected yet. Place beach QR signs to check-in units.</p>
              ) : (
                responders.map(resp => {
                  let statusColor = 'text-zinc-300 bg-black border-zinc-900';
                  if (resp.status === 'ACKNOWLEDGED') statusColor = 'text-amber-400 bg-amber-950/20 border-amber-800';
                  else if (resp.status === 'PATIENT_CONTACT') statusColor = 'text-sky-400 bg-sky-950/20 border-sky-800';

                  return (
                    <div key={resp.id} className={`p-4 rounded-xl border-2 flex flex-col justify-between gap-3 ${statusColor}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-sm md:text-base uppercase text-zinc-100 block">{resp.name}</span>
                          <span className="text-xs text-zinc-500 block font-mono mt-0.5">📞 {resp.phone}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-1 rounded border border-zinc-800 bg-zinc-950">
                          {resp.status}
                        </span>
                      </div>
                      
                      {resp.notes && (
                        <div className="bg-black p-3 rounded-lg text-xs font-mono text-zinc-300 border border-zinc-900 leading-relaxed">
                          <strong className="text-amber-500">Log Note:</strong> {resp.notes}
                        </div>
                      )}

                      {/* Dropdown to manually dispatch to any active incident */}
                      {resp.status === 'STANDBY' && incidents.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-black uppercase text-zinc-400">Dispatch:</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                assignResponderToIncident(resp.id, e.target.value);
                                e.target.value = ''; // Reset dropdown
                              }
                            }}
                            className="bg-black text-zinc-200 border-2 border-zinc-900 p-2 rounded-lg text-xs flex-1 focus:outline-none focus:border-amber-500 font-bold"
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
        <div className="flex flex-col gap-5">
          <CanvaGlassPanel highlight="none" bannerText="➕ DECLARE MEDICAL / SAFETY EMERGENCY" className="p-5 border-2 rounded-2xl">
            <form onSubmit={createIncident} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Incident Title / Location
                </label>
                <input
                  required
                  placeholder="Medical Call: Landing Zone B"
                  value={incTitle}
                  onChange={(e) => setIncTitle(e.target.value)}
                  className="w-full text-base font-bold p-3 bg-black border-2 border-zinc-900 focus:border-red-500 focus:outline-none rounded-xl text-white placeholder-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Incident Narrative details
                </label>
                <textarea
                  placeholder="Dehydrated paddler coming ashore, requests oxygen"
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  rows={2}
                  className="w-full text-base font-semibold p-3 bg-black border-2 border-zinc-900 focus:border-red-500 focus:outline-none rounded-xl text-white placeholder-zinc-700"
                />
              </div>
              <CanvaButton type="submit" variant="primary" className="py-4 bg-red-950/40 border-2 border-red-500 hover:bg-red-900/60 hover:text-white text-red-200 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-xl transition-all active:scale-95 shadow-md">
                <Plus className="h-5 w-5" /> Declare & Dispatch Alert
              </CanvaButton>
            </form>
          </CanvaGlassPanel>

          {/* Incidents Board */}
          <div className="flex-1 bg-zinc-950 border-2 border-zinc-900 rounded-xl p-4 overflow-y-auto max-h-[400px] flex flex-col gap-3">
            <span className="text-zinc-400 text-xs font-black uppercase tracking-widest px-1 block">
              ACTIVE FIELD INCIDENTS
            </span>
            {incidents.length === 0 ? (
              <p className="text-zinc-600 text-xs md:text-sm text-center font-mono py-12 uppercase">No active incidents declared.</p>
            ) : (
              incidents.map(inc => (
                <div key={inc.id} className="p-4 bg-red-950/20 border-2 border-red-900/60 rounded-xl flex flex-col justify-between gap-2 shadow-md">
                  <div className="flex justify-between items-start">
                    <span className="text-red-400 font-black text-sm md:text-base uppercase">{inc.title}</span>
                    <button onClick={() => deleteIncident(inc.id)} className="text-zinc-500 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                  <p className="text-zinc-300 text-xs md:text-sm font-mono leading-relaxed bg-black/40 border border-zinc-900/80 p-2 rounded-lg">{inc.description}</p>
                  
                  {/* Assigned Responder count */}
                  <div className="mt-1 pt-2 border-t border-red-900/20 flex justify-between items-center text-xs text-zinc-400">
                    <span className="flex items-center gap-1 font-bold">
                      <Users className="h-4.5 w-4.5 text-zinc-500" /> Responders: {inc.assignedResponders.length}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">[{inc.timestamp}]</span>
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

