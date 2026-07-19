import React, { useState, useEffect } from 'react';
import { dataBus, type BusPacket } from '../services/DataBus';
import { Activity, ShieldAlert, CheckCircle, BookOpen } from 'lucide-react';
import { CANOE_STORAGE_KEYS, fetchStoredState, type ResponderUnit } from './CanoeLanding/CanoeDataBus';

const Dashboard: React.FC = () => {
  const [logs, setLedger] = useState<BusPacket[]>(() => {
    return dataBus.getCache<BusPacket[]>('dashboard_logs') || [];
  });
  interface DashboardStats {
    activeMissions: number;
    activeShelters: number;
    activeStaff: number;
  }

  const [stats, setStats] = useState<DashboardStats>(() => {
    return dataBus.getCache<DashboardStats>('dashboard_stats') || {
      activeMissions: 3,
      activeShelters: 0,
      activeStaff: 12
    };
  });

  const [responders, setResponders] = useState<ResponderUnit[]>([]);

  useEffect(() => {
    setResponders(fetchStoredState<ResponderUnit[]>(CANOE_STORAGE_KEYS.RESPONDERS, []));

    const syncCanoeState = (e: StorageEvent | CustomEvent) => {
      let key = '';
      if (e instanceof StorageEvent) key = e.key || '';
      else key = e.detail?.key;

      if (key === CANOE_STORAGE_KEYS.RESPONDERS) {
        setResponders(fetchStoredState<ResponderUnit[]>(CANOE_STORAGE_KEYS.RESPONDERS, []));
      }
    };

    window.addEventListener('storage', syncCanoeState);
    window.addEventListener('cem_state_sync' as any, syncCanoeState);
    return () => {
      window.removeEventListener('storage', syncCanoeState);
      window.removeEventListener('cem_state_sync' as any, syncCanoeState);
    };
  }, []);

  useEffect(() => {
    dataBus.setCache('dashboard_stats', stats);
  }, [stats]);

  useEffect(() => {
    // 📥 Fetch historical logs from local immutable active ledger backend
    const fetchHistory = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5001/api/logs');
        if (response.ok) {
          const historicalPackets = await response.json();
          setLedger((prev) => {
            // Merge historical packets with any real-time packets received since mount
            // Deduplicate by ID
            const merged = [...prev];
            historicalPackets.forEach((p: BusPacket) => {
              if (!merged.some(m => m.id === p.id)) {
                merged.push(p);
              }
            });
            // Keep newest first and limit to 25 items
            return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 25);
          });
        }
      } catch (err) {
        console.error('🚨 [DASHBOARD LEDGER]: Failed to fetch historical logs:', err);
      }
    };

    fetchHistory();

    const unsubscribe = dataBus.subscribe((packet) => {
      // If we receive a background sync update for the activity ledger
      if (packet.type === 'SYSTEM' && packet.payload?.entity === 'dashboard_logs' && packet.payload?.action === 'update') {
        const updated = dataBus.getCache<BusPacket[]>('dashboard_logs');
        if (updated && Array.isArray(updated)) {
          setLedger((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(updated)) {
              return prev;
            }
            return updated.slice(0, 25);
          });
        }
        return; // Exclude sync signal packet from active rendering
      }

      // Exclude all background sync signals from the UI ledger feed
      const isSystemSignal = packet.origin === 'FIRESTORE_SYNC_ENGINE' || 
                             (packet.type === 'SYSTEM' && packet.payload?.entity);
      if (isSystemSignal) {
        return;
      }

      setLedger((prev) => {
        if (prev.some(p => p.id === packet.id)) {
          return prev;
        }
        const updated = [packet, ...prev].slice(0, 25);
        return updated;
      });

      if (packet.type === 'LOGISTICS' && packet.payload?.facilityStatus) {
        // Adjust stats based on logistics status changes
        setStats(prev => {
          const status = packet.payload.facilityStatus;
          let newShelters = prev.activeShelters;
          if (status === 'ACTIVE') {
            newShelters = Math.max(0, prev.activeShelters + 1);
          } else if (status === 'COLD') {
            newShelters = Math.max(0, prev.activeShelters - 1);
          }
          return { ...prev, activeShelters: newShelters };
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Multi-Mission Tactical Resources calculations
  const branchCounts = {
    alki: responders.filter(r => (r.currentBranch || 'Branch I (Alki Beach)') === 'Branch I (Alki Beach)').length,
    reservation: responders.filter(r => r.currentBranch === 'Branch II (Reservation)').length,
    transit: responders.filter(r => r.currentBranch === 'Transit').length
  };

  const statusCounts = {
    staging: responders.filter(r => (r.resourceStatus || 'STAGING') === 'STAGING').length,
    transit: responders.filter(r => r.resourceStatus === 'IN_TRANSIT').length,
    assigned: responders.filter(r => r.resourceStatus === 'ASSIGNED').length
  };

  const totalRespondersCount = responders.length > 0 ? responders.length : stats.activeStaff;

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-black uppercase text-zinc-100 tracking-wider">EOC Command Dashboard</h1>
        <p className="text-sm text-zinc-500 font-medium">Real-time situational intelligence and active mission oversight.</p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-extrabold uppercase tracking-widest block mb-2">ACTIVE MISSIONS</span>
            <span className="text-4xl font-black text-amber-500 font-mono">{stats.activeMissions}</span>
          </div>
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldAlert size={28} className="text-amber-500" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-extrabold uppercase tracking-widest block mb-2">ACTIVE FACILITIES</span>
            <span className="text-4xl font-black text-green-500 font-mono">{stats.activeShelters}</span>
          </div>
          <div className="w-14 h-14 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle size={28} className="text-green-500" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-extrabold uppercase tracking-widest block mb-2">RESPONDERS DEPLOYED</span>
            <span className="text-4xl font-black text-cyan-500 font-mono">{totalRespondersCount}</span>
          </div>
          <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Activity size={28} className="text-cyan-500" />
          </div>
        </div>
      </div>

      {/* Multi-Mission Tactical Resources (NIMS Dashboard Panel) */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
          <Activity size={18} className="text-cyan-500" />
          <h2 className="text-lg font-black uppercase text-zinc-100 tracking-wide">Multi-Mission Tactical Resources (NIMS)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Branch Dispositions */}
          <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl space-y-4">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest block">Operational Branch Dispositions</span>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1.5">
                  <span>Branch I (Alki Beach Landing)</span>
                  <span className="text-cyan-400 font-mono">{branchCounts.alki} Units</span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.6)] transition-all duration-500" 
                    style={{ width: `${responders.length > 0 ? (branchCounts.alki / responders.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1.5">
                  <span>Branch II (Muckleshoot Reservation)</span>
                  <span className="text-amber-500 font-mono">{branchCounts.reservation} Units</span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-all duration-500" 
                    style={{ width: `${responders.length > 0 ? (branchCounts.reservation / responders.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1.5">
                  <span>Transit Support (In-Route / Marine)</span>
                  <span className="text-zinc-400 font-mono">{branchCounts.transit} Units</span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full bg-zinc-400 rounded-full shadow-[0_0_8px_rgba(161,161,170,0.6)] transition-all duration-500" 
                    style={{ width: `${responders.length > 0 ? (branchCounts.transit / responders.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status Metrics */}
          <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl flex flex-col justify-between gap-3">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest block mb-1">NIMS Deployment States</span>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-900/40 border border-emerald-950 rounded-xl text-center">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">STAGING</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">{statusCounts.staging}</span>
              </div>
              <div className="p-3 bg-zinc-900/40 border border-amber-950 rounded-xl text-center">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">IN_TRANSIT</span>
                <span className="text-2xl font-black text-amber-500 font-mono">{statusCounts.transit}</span>
              </div>
              <div className="p-3 bg-zinc-900/40 border border-cyan-950 rounded-xl text-center">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">ASSIGNED</span>
                <span className="text-2xl font-black text-cyan-400 font-mono">{statusCounts.assigned}</span>
              </div>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono text-center border-t border-zinc-900/40 pt-2 uppercase">
              Operational readiness tracking active. Dynamic sync verified.
            </div>
          </div>
        </div>
      </div>

      {/* Incident Log / Feed */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
          <BookOpen size={18} className="text-amber-500" />
          <h2 className="text-lg font-black uppercase text-zinc-100 tracking-wide">ACTIVE INTEGRATED LEDGER</h2>
        </div>

        <div className="space-y-2.5 max-h-[350px] overflow-y-auto custom-scroll pr-2">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 font-bold text-sm tracking-wide">
              SYSTEM ONLINE - STANDBY FOR LOG TRANSMISSIONS
            </div>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id} 
                className="p-3.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full text-zinc-400">
                      {log.type}
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">
                      {log.origin}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-zinc-200">
                    {log.payload?.message || JSON.stringify(log.payload)}
                  </p>
                </div>
                <span className="text-[10px] font-mono font-medium text-zinc-600 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
