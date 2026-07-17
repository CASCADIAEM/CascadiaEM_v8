import React from 'react';
import { Building2 } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  type: string;
  capacity: number;
}

interface Step4LogisticsProps {
  facilities: Facility[];
  assignedFacilityIds: string[];
  facilityInitialStates: Record<string, 'COLD' | 'STANDBY' | 'ACTIVE'>;
  handleFacilityToggle: (id: string) => void;
  handleFacilityStateChange: (id: string, status: 'COLD' | 'STANDBY' | 'ACTIVE') => void;
}

export const Step4Logistics: React.FC<Step4LogisticsProps> = ({
  facilities,
  assignedFacilityIds,
  facilityInitialStates,
  handleFacilityToggle,
  handleFacilityStateChange
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
        <Building2 size={18} className="text-amber-500" />
        <h2 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide">STEP 4: Support Facilities Assignment</h2>
      </div>
      <p className="text-xs text-zinc-500 font-bold leading-normal">
        Map logistical shelter sites and configure their starting status threshold for this operational period.
      </p>

      <div className="space-y-3.5 pt-2">
        {facilities.map(facility => {
          const isChecked = assignedFacilityIds.includes(facility.id);
          const currentStatus = facilityInitialStates[facility.id] || 'COLD';
          return (
            <div 
              key={facility.id}
              className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none ${
                isChecked 
                  ? 'bg-zinc-900/60 border-zinc-800 text-zinc-100' 
                  : 'bg-transparent border-zinc-950 text-zinc-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={isChecked}
                  onChange={() => handleFacilityToggle(facility.id)}
                  className="accent-amber-500 h-4.5 w-4.5 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                    <span>{facility.name}</span>
                    <span className="text-[9px] font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900 font-normal text-zinc-500 uppercase">
                      CAP: {facility.capacity}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">{facility.type}</div>
                </div>
              </div>

              {/* Starting Status Dropdown */}
              {isChecked && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">INITIAL STATUS:</span>
                  <select 
                    value={currentStatus}
                    onChange={(e) => handleFacilityStateChange(facility.id, e.target.value as any)}
                    className="font-mono text-[11px] font-black uppercase tracking-wider bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-1.5 rounded-lg cursor-pointer focus:outline-none"
                  >
                    <option value="COLD">❄️ COLD (INACTIVE)</option>
                    <option value="STANDBY">⏳ STAND-BY (WARM)</option>
                    <option value="ACTIVE">🔥 ACTIVE (HOT)</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
