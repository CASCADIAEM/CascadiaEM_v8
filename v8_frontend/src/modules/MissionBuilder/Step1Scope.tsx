import React from 'react';
import { Compass } from 'lucide-react';
import { CanvaInput, CanvaFormRow, CanvaDropdownCustomizer } from '../../components/DesignSandbox';
import { useAdminEngine } from '../../services/AdminEngineService';

interface Step1ScopeProps {
  missionName: string;
  setMissionName: (val: string) => void;
  classCategory: string;
  setClassCategory: (val: string) => void;
  classification: string;
  setClassification: (val: string) => void;
  seocMissionNum: string;
  setSeocMissionNumber: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  county: string;
  setCounty: (val: string) => void;
  state: string;
  setState: (val: string) => void;
  zipCode: string;
  setZipCode: (val: string) => void;
  opPeriodCode: string;
  setOpPeriodCode: (val: string) => void;
  eventStartDate: string;
  setEventStartDate: (val: string) => void;
  eventStartTime: string;
  setEventStartTime: (val: string) => void;
  eventEndDate: string;
  setEventEndDate: (val: string) => void;
  eventEndTime: string;
  setEventEndTime: (val: string) => void;

  setCategory: (val: 'PLANNED' | 'TRAINING' | 'INCIDENT') => void;
  setWeatherForecast: (val: string) => void;
  setSafetyMessage: (val: string) => void;
  classificationCategories: any[];
  classificationLibrary: Record<string, any>;
  activeCategoryData: any;
}

export const Step1Scope: React.FC<Step1ScopeProps> = ({
  missionName,
  setMissionName,
  classCategory,
  setClassCategory,
  classification,
  setClassification,
  seocMissionNum,
  setSeocMissionNumber,
  address,
  setAddress,
  city,
  setCity,
  county,
  setCounty,
  state,
  setState,
  zipCode,
  setZipCode,
  opPeriodCode,
  setOpPeriodCode,
  eventStartDate,
  setEventStartDate,
  eventStartTime,
  setEventStartTime,
  eventEndDate,
  setEventEndDate,
  eventEndTime,
  setEventEndTime,
  setCategory,
  setWeatherForecast,
  setSafetyMessage,
  classificationCategories,
  classificationLibrary,
  activeCategoryData
}) => {
  const { isAdminMode } = useAdminEngine();

  return (
    <div className="space-y-4">
      {isAdminMode && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10px] font-mono text-amber-500 uppercase tracking-wider flex items-center gap-2.5 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.05)]">
          <span className="text-sm">⚙️</span>
          <div>
            <strong>[ADMIN ENGINE ACTIVE]</strong>: Real-time customization overlays enabled. Click any glowing gear icon next to a pull-down menu to add, edit, or delete option labels instantly.
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Compass size={18} className="text-amber-500" />
          <h2 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide">STEP 1: Incident Scope & Mission Definition</h2>
        </div>
        
        {activeCategoryData && (
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border font-sans text-[10px] ${activeCategoryData.tagColor} shrink-0`}>
            <div className={`w-1.5 h-1.5 rounded-full ${activeCategoryData.dotColor} animate-pulse shrink-0`} />
            <div className="min-w-0">
              <span className="font-extrabold text-[9px] uppercase tracking-wide">
                {activeCategoryData.label} — {(activeCategoryData.types.find((t: any) => t.key === classification)?.label || classification).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Mission Code Name</label>
          <input 
            type="text" 
            value={missionName} 
            onChange={e => setMissionName(e.target.value)} 
            placeholder="e.g., SEISMIC-EXERCISE-2026" 
            className="eoc-input"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">Mission Category (NIMS Type)</label>
            <CanvaDropdownCustomizer 
              dropdownKey="mission_categories" 
              label="Mission Category" 
              className={isAdminMode ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 animate-pulse p-1 rounded-md shadow-[0_0_10px_rgba(245,158,11,0.3)] scale-110' : ''}
            />
          </div>
          <select 
            value={classCategory}
            onChange={(e) => {
              const newCatKey = e.target.value;
              setClassCategory(newCatKey);
              
              let mappedCategory: 'PLANNED' | 'TRAINING' | 'INCIDENT' = 'TRAINING';
              if (newCatKey === 'event_support') mappedCategory = 'PLANNED';
              else if (newCatKey === 'exercise_drill' || newCatKey === 'test_mission') mappedCategory = 'TRAINING';
              else if (newCatKey === 'natural_hazards' || newCatKey === 'man_made_hazards') mappedCategory = 'INCIDENT';
              setCategory(mappedCategory);
              
              const cat = classificationCategories.find(c => c.key === newCatKey);
              if (cat && cat.types.length > 0) {
                const firstTypeKey = cat.types[0].key;
                setClassification(firstTypeKey);
                
                const selectedData = classificationLibrary[firstTypeKey];
                if (selectedData) {
                  setWeatherForecast(selectedData.defaultWeather);
                  setSafetyMessage(selectedData.defaultSafety);
                }
              }
            }}
            className="eoc-input bg-zinc-950 cursor-pointer font-bold text-xs uppercase"
          >
            {classificationCategories.map((cat) => (
              <option key={cat.key} value={cat.key} className="bg-[#08080a] text-zinc-100 uppercase font-mono">
                {cat.label.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
              {classCategory === 'natural_hazards' ? 'Natural Hazards Type' :
               classCategory === 'man_made_hazards' ? 'Man Made Hazards Type' :
               classCategory === 'exercise_drill' ? 'Exercise / Drill Type' :
               classCategory === 'event_support' ? 'Event Support Type' :
               classCategory === 'test_mission' ? 'Test Mission Type' : 'Specific Incident Type'}
            </label>
            <CanvaDropdownCustomizer 
              dropdownKey="mission_categories" 
              label={
                classCategory === 'natural_hazards' ? 'Natural Hazards Type' :
                classCategory === 'man_made_hazards' ? 'Man Made Hazards Type' :
                classCategory === 'exercise_drill' ? 'Exercise / Drill Type' :
                classCategory === 'event_support' ? 'Event Support Type' :
                classCategory === 'test_mission' ? 'Test Mission Type' : 'Incident Type'
              } 
              categoryKey={classCategory} 
              className={isAdminMode ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 animate-pulse p-1 rounded-md shadow-[0_0_10px_rgba(245,158,11,0.3)] scale-110' : ''}
            />
          </div>
          <select 
            value={classification}
            onChange={(e) => {
              const newClass = e.target.value;
              setClassification(newClass);
              const selectedData = classificationLibrary[newClass];
              if (selectedData) {
                setWeatherForecast(selectedData.defaultWeather);
                setSafetyMessage(selectedData.defaultSafety);
              }
            }}
            className="eoc-input bg-zinc-950 cursor-pointer font-bold text-xs uppercase"
          >
            {classificationCategories.find(c => c.key === classCategory)?.types.map((t: any) => (
              <option key={t.key} value={t.key} className="bg-[#08080a] text-zinc-100 uppercase font-mono">
                {t.label.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">State SEOC Mission Number</label>
          <input 
            type="text" 
            value={seocMissionNum} 
            onChange={e => setSeocMissionNumber(e.target.value)} 
            placeholder="e.g., WA-SEOC-26-XXXX" 
            className="eoc-input font-mono font-bold"
          />
        </div>

        {/* Location & Jurisdiction Section */}
        <div className="col-span-1 sm:col-span-2 border-t border-zinc-900/50 pt-4 mt-2">
          <div className="text-[11px] font-extrabold uppercase text-amber-500 tracking-widest mb-3 flex items-center gap-1.5">
            <span>📍 Incident / Event Location & Jurisdiction</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
            {/* Street Address */}
            <div className="sm:col-span-2 md:col-span-2">
              <CanvaFormRow label="Street Address / Intersection">
                <CanvaInput 
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g., 39015 172nd Ave SE"
                />
              </CanvaFormRow>
            </div>

            {/* City */}
            <div>
              <CanvaFormRow label="City / Municipality">
                <CanvaInput 
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Search city..."
                  list="cities-list"
                />
              </CanvaFormRow>
              <datalist id="cities-list">
                <option value="Auburn" />
                <option value="Bellevue" />
                <option value="Bellingham" />
                <option value="Bothell" />
                <option value="Edmonds" />
                <option value="Everett" />
                <option value="Federal Way" />
                <option value="Kent" />
                <option value="Olympia" />
                <option value="Renton" />
                <option value="Seattle" />
                <option value="Spokane" />
                <option value="Tacoma" />
                <option value="Vancouver" />
                <option value="Yakima" />
              </datalist>
            </div>

            {/* County */}
            <div>
              <CanvaFormRow label="County">
                <CanvaInput 
                  type="text"
                  value={county}
                  onChange={e => setCounty(e.target.value)}
                  placeholder="Search county..."
                  list="counties-list"
                />
              </CanvaFormRow>
              <datalist id="counties-list">
                <option value="Clallam County" />
                <option value="Clark County" />
                <option value="Cowlitz County" />
                <option value="Grays Harbor County" />
                <option value="Island County" />
                <option value="Jefferson County" />
                <option value="King County" />
                <option value="Kitsap County" />
                <option value="Mason County" />
                <option value="Pacific County" />
                <option value="Pierce County" />
                <option value="San Juan County" />
                <option value="Skagit County" />
                <option value="Snohomish County" />
                <option value="Spokane County" />
                <option value="Thurston County" />
                <option value="Whatcom County" />
                <option value="Yakima County" />
              </datalist>
            </div>

            {/* State */}
            <div>
              <CanvaFormRow label="State / Province">
                <CanvaInput 
                  type="text"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  placeholder="Search state..."
                  list="states-list"
                />
              </CanvaFormRow>
              <datalist id="states-list">
                <option value="Washington" />
                <option value="Oregon" />
                <option value="Idaho" />
                <option value="British Columbia" />
              </datalist>
            </div>

            {/* ZIP / Postal Code */}
            <div>
              <CanvaFormRow label="ZIP / Postal Code">
                <CanvaInput 
                  type="text"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="e.g., 98020"
                />
              </CanvaFormRow>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-900/50 pt-4">
        <div>
          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Operational Period Designation</label>
          <input 
            type="text" 
            value={opPeriodCode} 
            onChange={e => setOpPeriodCode(e.target.value)} 
            placeholder="e.g., OP-01" 
            className="eoc-input font-mono font-bold"
          />
        </div>

        <div>
          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Event Start (Date & Time)</label>
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="date" 
              value={eventStartDate} 
              onChange={e => setEventStartDate(e.target.value)} 
              className="eoc-input font-mono font-bold cursor-pointer"
            />
            <input 
              type="time" 
              value={eventStartTime} 
              onChange={e => setEventStartTime(e.target.value)} 
              className="eoc-input font-mono font-bold cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Event Stop (Date & Time)</label>
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="date" 
              value={eventEndDate} 
              onChange={e => setEventEndDate(e.target.value)} 
              className="eoc-input font-mono font-bold cursor-pointer"
            />
            <input 
              type="time" 
              value={eventEndTime} 
              onChange={e => setEventEndTime(e.target.value)} 
              className="eoc-input font-mono font-bold cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
