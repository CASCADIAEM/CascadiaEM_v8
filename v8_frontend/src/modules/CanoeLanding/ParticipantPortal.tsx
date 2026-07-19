import React, { useState, useEffect } from 'react';
import { CanvaGlassPanel } from '../../components/DesignSandbox';
import { 
  playTacticalAlert, 
  CANOE_STORAGE_KEYS, 
  fetchStoredState, 
  type GlobalAlert 
} from './CanoeDataBus';
import { ShieldAlert, CloudLightning, ShieldCheck, Activity } from 'lucide-react';

interface ParticipantPortalProps {
  name: string;
  phone: string;
}

export const ParticipantPortal: React.FC<ParticipantPortalProps> = ({ name, phone }) => {
  const [globalAlert, setGlobalAlert] = useState<GlobalAlert>({
    message: 'System Initialized. Standby for official broadcasts.',
    severity: 'none',
    timestamp: Date.now()
  });

  const [bulletins, setBulletins] = useState<string[]>([
    'Welcome to the CascadiaEM safety safety system.',
    'Keep your phone browser open during the landing ceremony.'
  ]);

  // Handle live storage-event sync across browser tabs/devices
  useEffect(() => {
    // Initial fetch
    const currentAlert = fetchStoredState<GlobalAlert>(CANOE_STORAGE_KEYS.ALERT, {
      message: 'System Initialized. Standby for official broadcasts.',
      severity: 'none',
      timestamp: Date.now()
    });
    setGlobalAlert(currentAlert);

    const syncState = (e: StorageEvent | CustomEvent) => {
      let key = '';
      let data: any = null;

      if (e instanceof StorageEvent) {
        key = e.key || '';
        if (e.newValue) {
          try { data = JSON.parse(e.newValue); } catch {}
        }
      } else {
        key = e.detail?.key;
        data = e.detail?.data;
      }

      if (key === CANOE_STORAGE_KEYS.ALERT && data) {
        setGlobalAlert(data);
        // Play distinct alarms based on severity to attract user attention
        if (data.severity === 'red') {
          playTacticalAlert('dual_siren');
          setBulletins(prev => [`🚨 RED EMERGENCY ALERT: ${data.message}`, ...prev]);
        } else if (data.severity === 'yellow') {
          playTacticalAlert('single_beep');
          setBulletins(prev => [`⚠️ ADVISORY ALERT: ${data.message}`, ...prev]);
        } else {
          setBulletins(prev => [`ℹ️ UPDATE: ${data.message}`, ...prev]);
        }
      }
    };

    window.addEventListener('storage', syncState);
    window.addEventListener('cem_state_sync' as any, syncState);
    return () => {
      window.removeEventListener('storage', syncState);
      window.removeEventListener('cem_state_sync' as any, syncState);
    };
  }, []);

  // UI styling based on current alarm state
  let cardHighlight: 'none' | 'yellow' | 'red' | 'amber-heavy' | 'red-heavy' = 'none';
  let bannerText = 'STATUS: STANDBY';
  let Icon = ShieldCheck;
  let statusColor = 'text-emerald-500';

  if (globalAlert.severity === 'yellow') {
    cardHighlight = 'amber-heavy';
    bannerText = '⚠️ ACTIVE FIELD ADVISORY';
    Icon = CloudLightning;
    statusColor = 'text-amber-500';
  } else if (globalAlert.severity === 'red') {
    cardHighlight = 'red-heavy';
    bannerText = '🚨 IMMEDIATE CRITICAL EMERGENCY';
    Icon = ShieldAlert;
    statusColor = 'text-red-500 animate-pulse';
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col p-5 font-sans select-none gap-4">
      {/* Device Info top-bar */}
      <div className="flex flex-col gap-3 border-b-2 border-zinc-900 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
            <span className="text-xs md:text-sm font-black uppercase tracking-widest text-zinc-300">
              CEM-SAFE CONNECTED
            </span>
          </div>
          <span className="text-xs font-black text-zinc-400 uppercase tracking-widest border border-zinc-800 px-2 py-0.5 rounded bg-zinc-900">
            TIER I PARTICIPANT
          </span>
        </div>
        {/* At-a-glance Registration display */}
        <div className="bg-zinc-950 border-2 border-zinc-900 p-4 rounded-xl flex items-center justify-between">
          <span className="text-zinc-400 text-xs md:text-sm font-black uppercase tracking-wider">ON-BOARD CALL SIGN</span>
          <div className="text-right flex flex-col items-end">
            <span className="text-amber-400 font-black text-lg md:text-2xl uppercase tracking-widest font-mono">{name}</span>
            {phone && <span className="text-[10px] text-zinc-500 font-mono">📞 {phone}</span>}
          </div>
        </div>
      </div>

      {/* Main Status Panel */}
      <CanvaGlassPanel highlight={cardHighlight} bannerText={bannerText} className="p-6 md:p-8 flex flex-col items-center justify-center gap-6 text-center border-2 rounded-2xl">
        <Icon className={`h-24 w-24 md:h-32 md:w-32 ${statusColor}`} />
        <div className="w-full">
          <h2 className={`text-xl md:text-3xl font-black uppercase tracking-widest ${statusColor} mb-2`}>
            {globalAlert.severity === 'none' ? 'NORMAL ENVIRONMENT' : globalAlert.severity.toUpperCase() + ' BROADCAST'}
          </h2>
          <p className="text-white text-base md:text-2xl font-black font-mono leading-relaxed bg-black border-2 border-zinc-900 p-5 rounded-xl max-w-xl mx-auto shadow-md">
            {globalAlert.message}
          </p>
        </div>
      </CanvaGlassPanel>

      {/* Bulletins log */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-zinc-400 text-xs md:text-sm font-black uppercase tracking-widest mb-2.5 px-1">
          RELIABILITY SAFETY FEED (PULSEPOINT-STYLE)
        </h3>
        <div className="flex-1 bg-zinc-950 border-2 border-zinc-900 rounded-xl p-4 overflow-y-auto flex flex-col gap-3 font-mono text-sm md:text-base">
          {bulletins.map((bulletin, idx) => (
            <div key={idx} className="border-b border-zinc-900 pb-3 text-zinc-300 leading-relaxed last:border-b-0">
              <span className="text-zinc-500 text-xs font-bold block mb-1">
                [{new Date().toLocaleTimeString()}]
              </span>
              <span className="font-semibold">{bulletin}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
