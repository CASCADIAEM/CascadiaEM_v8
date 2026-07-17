import React, { useState, useEffect } from 'react';
import { dataBus, type BusPacket } from '../services/DataBus';
import { Activity, ShieldAlert, CheckCircle, BookOpen } from 'lucide-react';

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
            <span className="text-4xl font-black text-cyan-500 font-mono">{stats.activeStaff}</span>
          </div>
          <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Activity size={28} className="text-cyan-500" />
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
