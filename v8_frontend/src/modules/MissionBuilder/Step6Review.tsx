import React from 'react';
import { ShieldAlert, Printer } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  role: string;
}

interface Facility {
  id: string;
  name: string;
}

interface Step6ReviewProps {
  missionName: string;
  seocMissionNum: string;
  opPeriodCode: string;
  activeClassData: {
    title: string;
  };
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
  commanderId: string;
  operationsId: string;
  logisticsId: string;
  assignedFacilityIds: string[];
  facilityInitialStates: Record<string, string>;
  objectives: string[];
  contacts: Contact[];
  facilities: Facility[];
}

export const Step6Review: React.FC<Step6ReviewProps> = ({
  missionName,
  seocMissionNum,
  opPeriodCode,
  activeClassData,
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
  commanderId,
  operationsId,
  logisticsId,
  assignedFacilityIds,
  facilityInitialStates,
  objectives,
  contacts,
  facilities
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-amber-500" />
          <h2 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide">STEP 6: Pre-Activation Review (ICS-201 Layout)</h2>
        </div>
        <button 
          type="button"
          onClick={() => window.print()}
          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold text-amber-500 uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer print:hidden"
        >
          <Printer size={14} />
          Print Setup Brief
        </button>
      </div>
      <p className="text-xs text-zinc-500 font-bold leading-normal">
        Verify the compiled Incident Action Plan parameters. Pull the trigger below to deploy resources.
      </p>

      {/* Printable High-Contrast ICS-201 Board */}
      <div className="border border-zinc-800 bg-zinc-950 rounded-2xl p-6 font-sans text-xs space-y-5 leading-normal text-zinc-300">
        <div className="border-b border-zinc-850 pb-3 flex items-center justify-between">
          <div>
            <div className="text-[9px] font-mono font-bold text-amber-500 tracking-wider">NIMS INCIDENT BRIEF SHEET</div>
            <div className="text-base font-black uppercase text-zinc-100">{missionName}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase">MISSION ID</div>
            <div className="font-mono font-black text-amber-500 text-sm">{seocMissionNum}</div>
          </div>
        </div>

        {/* Operational Period and Classification Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-zinc-900 pb-3">
          <div>
            <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Operational Period</span>
            <span className="font-extrabold text-zinc-200">{opPeriodCode}</span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">SOP Classification</span>
            <span className="font-extrabold text-zinc-200">{activeClassData.title}</span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Event Start</span>
            <span className="font-mono text-zinc-200 font-bold">{eventStartDate} {eventStartTime}</span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Event Stop</span>
            <span className="font-mono text-zinc-200 font-bold">{eventEndDate} {eventEndTime}</span>
          </div>
        </div>

        {/* Location & Jurisdiction Row */}
        {(address || city || county || state) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-zinc-900 pb-3 bg-[#0d0d11]/80 p-3 rounded-xl border border-zinc-900">
            <div className="md:col-span-2">
              <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Incident Location</span>
              <span className="font-bold text-zinc-200">{address || 'No specific street address provided.'}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Jurisdiction (City/County)</span>
              <span className="font-bold text-zinc-200">
                {city && county ? `${city}, ${county}` : city || county || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">State</span>
              <span className="font-bold text-zinc-200">{state || 'Washington'}</span>
            </div>
          </div>
        )}

        {/* Weather Forecast & Safety Briefing Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-zinc-900 pb-3">
          <div>
            <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Weather Forecast</span>
            <p className="font-bold text-zinc-300 text-xs leading-normal">{weatherForecast || 'Standard weather conditions.'}</p>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Operational Safety Message</span>
            <p className="font-bold text-zinc-300 text-xs leading-normal">{safetyMessage || 'Follow standard PPE protocols.'}</p>
          </div>
        </div>

        {/* ICS Chart Row */}
        <div className="space-y-2">
          <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Command Organizational Chart (ICS)</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-900">
              <div className="text-[8px] font-extrabold text-zinc-500 uppercase">Incident Commander</div>
              <div className="font-extrabold text-zinc-200 truncate">
                {contacts.find(c => c.id === commanderId)?.name || 'Unassigned'}
              </div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-900">
              <div className="text-[8px] font-extrabold text-zinc-500 uppercase">Operations Chief</div>
              <div className="font-extrabold text-zinc-200 truncate">
                {contacts.find(c => c.id === operationsId)?.name || 'Unassigned'}
              </div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-900">
              <div className="text-[8px] font-extrabold text-zinc-500 uppercase">Logistics Chief</div>
              <div className="font-extrabold text-zinc-200 truncate">
                {contacts.find(c => c.id === logisticsId)?.name || 'Unassigned'}
              </div>
            </div>
          </div>
        </div>

        {/* Shelter assignments row */}
        <div className="space-y-1.5">
          <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Logistical Shelter Nodes Assigned</span>
          <div className="flex flex-wrap gap-2">
            {assignedFacilityIds.map(facilityId => {
              const facility = facilities.find(f => f.id === facilityId);
              const status = facilityInitialStates[facilityId] || 'COLD';
              return (
                <span key={facilityId} className="px-2.5 py-1 bg-zinc-900 rounded-md border border-zinc-800 text-[10px] font-bold text-zinc-300 flex items-center gap-1.5">
                  <span className={status === 'ACTIVE' ? 'text-green-500' : 'text-amber-500'}>
                    {status === 'ACTIVE' ? '🔥' : status === 'STANDBY' ? '⏳' : '❄️'}
                  </span>
                  {facility?.name} ({status})
                </span>
              );
            })}
            {assignedFacilityIds.length === 0 && (
              <span className="text-zinc-600 font-bold italic">No active support facilities assigned to this mission.</span>
            )}
          </div>
        </div>

        {/* Active objectives roster */}
        <div className="space-y-1.5 border-t border-zinc-900 pt-3">
          <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider block">Incident Operational Objectives ({objectives.length})</span>
          <ul className="space-y-1 text-xs font-bold text-zinc-300">
            {objectives.map((obj, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-500 shrink-0">{idx + 1}.</span>
                <span className="leading-normal">{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
