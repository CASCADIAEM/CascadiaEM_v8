import React from 'react';
import { ClipboardCheck, X, Printer, Check } from 'lucide-react';
import { CanvaButton } from '../../components/DesignSandbox';

interface Contact {
  id: string;
  name: string;
}

interface Facility {
  id: string;
  name: string;
}

interface ComplianceModalProps {
  showComplianceModal: boolean;
  setShowComplianceModal: (val: boolean) => void;
  missionName: string;
  seocMissionNum: string;
  opPeriodCode: string;
  classification: string;
  classCategory: string;
  eventStartDate: string;
  eventStartTime: string;
  eventEndDate: string;
  eventEndTime: string;
  address: string;
  city: string;
  county: string;
  state: string;
  weatherForecast: string;
  safetyMessage: string;
  agencyName: string;
  agencyLogo: string | null;
  commanderId: string;
  operationsId: string;
  logisticsId: string;
  assignedFacilityIds: string[];
  facilityInitialStates: Record<string, string>;
  objectives: string[];
  contacts: Contact[];
  facilities: Facility[];
  activeClassData: any;
  activeCategoryData: any;
}

export const ComplianceModal: React.FC<ComplianceModalProps> = ({
  showComplianceModal,
  setShowComplianceModal,
  missionName,
  seocMissionNum,
  opPeriodCode,
  classification,
  classCategory,
  eventStartDate,
  eventStartTime,
  eventEndDate,
  eventEndTime,
  address,
  city,
  county,
  state,
  weatherForecast,
  safetyMessage,
  agencyName,
  agencyLogo,
  commanderId,
  operationsId,
  logisticsId,
  assignedFacilityIds,
  facilityInitialStates,
  objectives,
  contacts,
  facilities,
  activeClassData,
  activeCategoryData
}) => {
  if (!showComplianceModal) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={() => setShowComplianceModal(false)}
    >
      <div 
        className="bg-[#09090b]/95 border-2 border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-scale-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: 'calc(100vh - 40px)' }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 px-6 py-4 bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-amber-500 animate-pulse" />
            <h3 className="text-sm font-black uppercase text-zinc-100 tracking-wider">Live Compliance Preview</h3>
          </div>
          <button 
            type="button"
            onClick={() => setShowComplianceModal(false)}
            className="p-1 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-100 rounded-lg transition-all active:scale-95 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 leading-normal text-zinc-300">
          {/* Step 1: Mission Identity Profile */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Step 1: Mission Identity</span>
              {missionName.trim() && seocMissionNum.trim() && opPeriodCode.trim() ? (
                <span className="text-[9px] font-mono font-bold text-green-500 uppercase flex items-center gap-1">
                  <Check size={10} /> Compliant
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold text-amber-500 uppercase">
                  ⚠️ Incomplete
                </span>
              )}
            </div>
            <div className="bg-zinc-950/50 border border-zinc-900/60 p-2.5 rounded-lg space-y-1 font-sans text-[11px] leading-relaxed">
              <div>
                <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide block">Code Name / SEOC ID</span>
                <span className="font-extrabold text-zinc-200">
                  {missionName.trim() ? missionName : <span className="text-red-500 italic">Required</span>} 
                  {seocMissionNum.trim() && <span className="text-zinc-500 font-mono font-normal"> [{seocMissionNum}]</span>}
                </span>
              </div>
              {classification && activeClassData && (
                <div>
                  <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide block">Classification & Category</span>
                  <span className="font-bold text-zinc-300">
                    {activeClassData.title} <span className="text-zinc-500 font-mono text-[9px]">({activeCategoryData?.label || classCategory})</span>
                  </span>
                </div>
              )}
              {opPeriodCode.trim() && (
                <div>
                  <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide block">Operational Period</span>
                  <span className="font-mono text-zinc-300 font-bold">{opPeriodCode}</span>
                </div>
              )}
              {eventStartDate.trim() && (
                <div>
                  <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide block">Event Start</span>
                  <span className="font-mono text-zinc-300 font-bold text-[10px]">{eventStartDate} {eventStartTime}</span>
                </div>
              )}
              {eventEndDate.trim() && (
                <div>
                  <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide block">Event Stop</span>
                  <span className="font-mono text-zinc-300 font-bold text-[10px]">{eventEndDate} {eventEndTime}</span>
                </div>
              )}
              {(address || city || county || state) && (
                <div>
                  <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide block">Location / Jurisdiction</span>
                  <span className="font-bold text-zinc-300 text-[10px]">
                    {address ? `${address}, ` : ''}
                    {city ? `${city}, ` : ''}
                    {county ? `${county}, ` : ''}
                    {state || 'Washington'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Environmental Conditions & Tenant Branding */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Step 2: Environment & Branding</span>
              {weatherForecast.trim() && safetyMessage.trim() && agencyName.trim() ? (
                <span className="text-[9px] font-mono font-bold text-green-500 uppercase flex items-center gap-1">
                  <Check size={10} /> Compliant
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold text-amber-500 uppercase">
                  ⚠️ Incomplete
                </span>
              )}
            </div>
            <div className="bg-zinc-950/50 border border-zinc-900/60 p-2.5 rounded-lg space-y-1 font-sans text-[11px] leading-relaxed">
              {weatherForecast.trim() && (
                <div>
                  <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide block">Weather Forecast</span>
                  <span className="font-bold text-zinc-300 truncate block text-[10px]" title={weatherForecast}>{weatherForecast}</span>
                </div>
              )}
              {safetyMessage.trim() && (
                <div>
                  <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide block">Safety Message</span>
                  <span className="font-bold text-zinc-300 truncate block text-[10px]" title={safetyMessage}>{safetyMessage}</span>
                </div>
              )}
              <div>
                <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide block">EOC Custom Branding</span>
                <span className="font-bold text-zinc-300 block text-[10px]">
                  Agency Name: {agencyName || 'Using Default'}
                  {agencyLogo && <span className="text-green-500 font-mono text-[9px] ml-1.5">(Custom Logo Loaded)</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Step 3: Unified Command structure */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Step 3: Unified Command</span>
              <span className="text-[9px] font-mono font-bold text-green-500 uppercase flex items-center gap-1">
                <Check size={10} /> Compliant
              </span>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-900/60 p-2.5 rounded-lg space-y-1.5 font-sans text-[11px] leading-relaxed">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide">Incident Commander</span>
                <span className="font-extrabold text-zinc-200 truncate max-w-[140px]" title={contacts.find(c => c.id === commanderId)?.name}>
                  {contacts.find(c => c.id === commanderId)?.name || 'Unassigned'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide">Operations Chief</span>
                <span className="font-bold text-zinc-300 truncate max-w-[140px]" title={contacts.find(c => c.id === operationsId)?.name}>
                  {contacts.find(c => c.id === operationsId)?.name || 'Unassigned'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide">Logistics Chief</span>
                <span className="font-bold text-zinc-300 truncate max-w-[140px]" title={contacts.find(c => c.id === logisticsId)?.name}>
                  {contacts.find(c => c.id === logisticsId)?.name || 'Unassigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Step 4: Logistics Sites */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Step 4: Logistics Sites</span>
              {assignedFacilityIds.length > 0 ? (
                <span className="text-[9px] font-mono font-bold text-green-500 uppercase flex items-center gap-1">
                  <Check size={10} /> Compliant
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold text-amber-500 uppercase">
                  ⚠️ No Sites Assigned
                </span>
              )}
            </div>
            <div className="bg-zinc-950/50 border border-zinc-900/60 p-2.5 rounded-lg font-sans text-[11px] leading-relaxed">
              {assignedFacilityIds.length > 0 ? (
                <div className="space-y-1">
                  <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide block">Assigned Support Nodes</span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {assignedFacilityIds.map(fid => {
                      const fac = facilities.find(f => f.id === fid);
                      const status = facilityInitialStates[fid] || 'COLD';
                      return (
                        <span key={fid} className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[9px] font-bold text-zinc-300 flex items-center gap-1.5">
                          <span className={status === 'ACTIVE' ? 'text-green-500' : 'text-amber-500'}>●</span>
                          <span className="truncate max-w-[120px]">{fac?.name || fid}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-zinc-600 font-bold italic text-center py-1">No logistical sites linked to this mission yet.</div>
              )}
            </div>
          </div>

          {/* Step 5: SMART Objectives */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Step 5: SMART Objectives</span>
              {objectives.length > 0 ? (
                <span className="text-[9px] font-mono font-bold text-green-500 uppercase flex items-center gap-1">
                  <Check size={10} /> Compliant
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold text-amber-500 uppercase">
                  ⚠️ No Objectives Defined
                </span>
              )}
            </div>
            <div className="bg-zinc-950/50 border border-zinc-900/60 p-2.5 rounded-lg font-sans text-[11px] leading-relaxed">
              {objectives.length > 0 ? (
                <div className="space-y-1">
                  <span className="text-zinc-500 font-extrabold uppercase text-[9px] tracking-wide block">Core Operational Targets</span>
                  <ul className="list-decimal list-inside space-y-1 text-[10px] font-bold text-zinc-300">
                    {objectives.slice(0, 2).map((obj, idx) => (
                      <li key={idx} className="truncate" title={obj}>
                        {obj}
                      </li>
                    ))}
                    {objectives.length > 2 && (
                      <li className="list-none text-zinc-500 text-[9px] italic text-right">
                        + {objectives.length - 2} more objective(s)
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="text-zinc-600 font-bold italic text-center py-1">No operational objectives defined yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-zinc-900 px-6 py-4 bg-zinc-950/40">
          <button 
            type="button"
            onClick={() => {
              setShowComplianceModal(false);
              window.print();
            }}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold text-amber-500 uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={12} />
            Print Preview Report
          </button>
          <CanvaButton variant="secondary" onClick={() => setShowComplianceModal(false)} className="px-5 py-2 text-xs">
            Close Preview
          </CanvaButton>
        </div>
      </div>
    </div>
  );
};
