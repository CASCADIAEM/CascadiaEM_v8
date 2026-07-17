import React from 'react';
import { Users } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

interface Step3StaffingProps {
  commanderId: string;
  setCommanderId: (id: string) => void;
  operationsId: string;
  setOperationsId: (id: string) => void;
  logisticsId: string;
  setLogisticsId: (id: string) => void;
  safetyId: string;
  setSafetyId: (id: string) => void;
  pioId: string;
  setPIOId: (id: string) => void;
  contacts: Contact[];
}

export const Step3Staffing: React.FC<Step3StaffingProps> = ({
  commanderId,
  setCommanderId,
  operationsId,
  setOperationsId,
  logisticsId,
  setLogisticsId,
  safetyId,
  setSafetyId,
  pioId,
  setPIOId,
  contacts
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
        <Users size={18} className="text-amber-500" />
        <h2 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide">STEP 3: Command Structure (NIMS Roles)</h2>
      </div>
      <p className="text-xs text-zinc-500 font-bold leading-normal">
        Bind physical, off-hours responders in our directories to official ICS Unified Command roles.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">Incident Commander (IC)</label>
          <select 
            value={commanderId} 
            onChange={e => setCommanderId(e.target.value)}
            className="eoc-input bg-zinc-950 text-xs font-bold cursor-pointer"
          >
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">Operations Section Chief</label>
          <select 
            value={operationsId} 
            onChange={e => setOperationsId(e.target.value)}
            className="eoc-input bg-zinc-950 text-xs font-bold cursor-pointer"
          >
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">Logistics Section Chief</label>
          <select 
            value={logisticsId} 
            onChange={e => setLogisticsId(e.target.value)}
            className="eoc-input bg-zinc-950 text-xs font-bold cursor-pointer"
          >
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">Incident Safety Officer</label>
          <select 
            value={safetyId} 
            onChange={e => setSafetyId(e.target.value)}
            className="eoc-input bg-zinc-950 text-xs font-bold cursor-pointer"
          >
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">Public Information Officer (PIO)</label>
          <select 
            value={pioId} 
            onChange={e => setPIOId(e.target.value)}
            className="eoc-input bg-zinc-950 text-xs font-bold cursor-pointer"
          >
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
