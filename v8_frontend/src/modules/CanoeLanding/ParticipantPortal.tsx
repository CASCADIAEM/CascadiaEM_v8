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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-4 font-sans select-none">
      {/* Device Info top-bar */}
      <div className="flex flex-col gap-2 mb-4 border-b border-zinc-900 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              CEM-SAFE CONNECTED
            </span>
          </div>
          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
            TIER I PARTICIPANT
          </span>
        </div>
        {/* At-a-glance Registration display */}
        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg flex items-center justify-between">
          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">ON-BOARD CALL SIGN</span>
          <span className="text-amber-500 font-black text-sm uppercase tracking-wide font-mono">{name}</span>
        </div>
      </div>

      {/* Main Status Panel */}
      <CanvaGlassPanel highlight={cardHighlight} bannerText={bannerText} className="mb-4 p-5 flex flex-col items-center justify-center gap-4 text-center">
        <Icon className={`h-16 w-16 ${statusColor}`} />
        <div>
          <h2 className={`text-lg font-black uppercase tracking-wider ${statusColor}`}>
            {globalAlert.severity === 'none' ? 'NORMAL ENVIRONMENT' : globalAlert.severity.toUpperCase() + ' BROADCAST'}
          </h2>
          <p className="text-zinc-200 text-sm font-semibold mt-1 max-w-sm font-mono leading-relaxed bg-zinc-950/40 border border-zinc-800/40 p-3 rounded-lg">
            {globalAlert.message}
          </p>
        </div>
      </CanvaGlassPanel>

      {/* Bulletins log */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2 px-1">
          RELIABILITY SAFETY FEED (PULSEPOINT-STYLE)
        </h3>
        <div className="flex-1 bg-zinc-900/60 border border-zinc-850/80 rounded-lg p-3 max-h-80 overflow-y-auto flex flex-col gap-2 font-mono text-xs">
          {bulletins.map((bulletin, idx) => (
            <div key={idx} className="border-b border-zinc-900/80 pb-2 text-zinc-400 leading-relaxed last:border-b-0">
              <span className="text-zinc-600 text-[9px] block mb-0.5">
                [{new Date().toLocaleTimeString()}]
              </span>
              {bulletin}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
