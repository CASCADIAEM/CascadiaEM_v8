import React from 'react';
import { CloudSun, CloudLightning, Sparkles } from 'lucide-react';
import { CanvaButton, CanvaFormRow, CanvaTextarea, CanvaInput } from '../../components/DesignSandbox';
import { 
  isAlertActiveOnDay, 
  renderWeatherIcon 
} from '../../utils/weatherCompiler';
import type { WeatherDay, HazardAlert } from '../../utils/weatherCompiler';
import { dataBus } from '../../services/DataBus';

interface Step2EnvironmentProps {
  fetchingWeather: boolean;
  zipCode: string;
  setZipCode: (zip: string) => void;
  weatherForecast: string;
  setWeatherForecast: (val: string) => void;
  safetyMessage: string;
  setSafetyMessage: (val: string) => void;
  missionForecast: WeatherDay[];
  setMissionForecast: (forecast: WeatherDay[]) => void;
  missionAlerts: HazardAlert[];
  setMissionAlerts: (alerts: HazardAlert[]) => void;
  weatherCoords: [number, number] | null;
  handlePullWeatherByZip: (zip: string) => void;
  handlePullWeatherByIncidentLocation: () => void;
  agencyName: string;
  setAgencyName: (val: string) => void;
  agencyLogo: string | null;
  setAgencyLogo: (logo: string | null) => void;
}

export const Step2Environment: React.FC<Step2EnvironmentProps> = ({
  fetchingWeather,
  zipCode,
  setZipCode,
  weatherForecast,
  setWeatherForecast,
  safetyMessage,
  setSafetyMessage,
  missionForecast,
  setMissionForecast,
  missionAlerts,
  setMissionAlerts,
  weatherCoords,
  handlePullWeatherByZip,
  handlePullWeatherByIncidentLocation,
  agencyName,
  setAgencyName,
  agencyLogo,
  setAgencyLogo
}) => {
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Error: Logo image exceeds 2MB size limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAgencyLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <CloudSun size={18} className="text-amber-500" />
          <h2 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide">STEP 2: Environmental Briefing & Tenant Branding</h2>
        </div>
        
        {/* Weather Override Controls Header Container (Upper Right & Large) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-28">
            <CanvaInput
              type="text"
              placeholder="98020"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              className="text-center font-mono text-sm font-black tracking-widest h-9 border border-zinc-800/80 focus:border-zinc-700 bg-zinc-950/50"
            />
          </div>
          
          {/* Pull Weather Button */}
          <div className="relative group">
            <CanvaButton
              type="button"
              onClick={() => handlePullWeatherByZip(zipCode)}
              disabled={fetchingWeather}
              className="p-2 h-9 w-10 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded cursor-pointer transition-all select-none"
            >
              {fetchingWeather ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
              ) : (
                <CloudSun size={18} className="text-emerald-500" />
              )}
            </CanvaButton>
            <div className="opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 flex flex-col items-center absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50">
              <div className="bg-zinc-950 border border-zinc-800 text-emerald-400 text-[9px] font-black uppercase tracking-wider py-1 px-2.5 rounded shadow-2xl whitespace-nowrap flex flex-col items-center gap-0.5">
                <span>Pull Weather</span>
                <span className="text-[8px] text-zinc-400 normal-case font-medium">Retrieve local forecast by ZIP code</span>
              </div>
              <div className="w-1.5 h-1.5 bg-zinc-950 border-r border-b border-zinc-800 rotate-45 -mt-[4px]" />
            </div>
          </div>

          {/* Sync Active Briefing Button */}
          <div className="relative group">
            <CanvaButton
              type="button"
              onClick={() => {
                const cached = dataBus.getCache<{ briefing: string; forecast?: WeatherDay[]; alerts?: HazardAlert[] } | null>('active_weather_hazards');
                if (cached && cached.briefing) {
                  setWeatherForecast(cached.briefing);
                  if (cached.forecast) setMissionForecast(cached.forecast);
                  if (cached.alerts) setMissionAlerts(cached.alerts);
                } else {
                  alert("No active weather briefing found in EOC cache. Please configure weather hazards first.");
                }
              }}
              className="p-2 h-9 w-10 flex items-center justify-center text-amber-500 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded cursor-pointer transition-all select-none"
            >
              <CloudLightning size={18} className="text-amber-500 animate-pulse" />
            </CanvaButton>
            <div className="opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 flex flex-col items-center absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50">
              <div className="bg-zinc-950 border border-zinc-800 text-amber-500 text-[9px] font-black uppercase tracking-wider py-1 px-2.5 rounded shadow-2xl whitespace-nowrap flex flex-col items-center gap-0.5">
                <span>Import EOC Weather</span>
                <span className="text-[8px] text-zinc-400 normal-case font-medium">Sync live active briefing from the EOC</span>
              </div>
              <div className="w-1.5 h-1.5 bg-zinc-950 border-r border-b border-zinc-800 rotate-45 -mt-[4px]" />
            </div>
          </div>
        </div>
      </div>
      
      {/* 7-Day Horizontal Forecast Ribbon */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
            📍 7-Day Environmental Forecast Ribbon
          </label>
          <div className="flex items-center gap-1">
            {weatherCoords && (
              <span className="text-[9px] font-mono font-bold text-zinc-500 mr-2">
                COORD: {weatherCoords[0].toFixed(4)}, {weatherCoords[1].toFixed(4)}
              </span>
            )}
            <CanvaButton
              type="button"
              onClick={handlePullWeatherByIncidentLocation}
              disabled={fetchingWeather}
              className="px-2 py-0.5 h-6 text-[9px] font-black uppercase bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded flex items-center gap-1 cursor-pointer transition-all duration-150"
            >
              {fetchingWeather ? (
                <div className="animate-spin rounded-full h-2 w-2 border border-amber-500 border-t-transparent" />
              ) : (
                <span>🔄 Sync Location Weather</span>
              )}
            </CanvaButton>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {missionForecast.length === 0 ? (
            Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="bg-[#0c0c0d]/40 border border-zinc-900/60 rounded-lg p-2.5 text-center space-y-2 animate-pulse">
                <div className="h-2 bg-zinc-800 rounded w-8 mx-auto" />
                <div className="h-6 w-6 bg-zinc-800 rounded-full mx-auto" />
                <div className="h-2.5 bg-zinc-800 rounded w-12 mx-auto" />
                <div className="h-2 bg-zinc-800 rounded w-16 mx-auto" />
              </div>
            ))
          ) : (
            missionForecast.slice(0, 7).map((day, idx) => {
              const lowerCond = day.condition.toLowerCase();
              const isThunderstorm = lowerCond.includes('thunderstorm') || day.icon === 'cloud-lightning';
              
              const matchingRedFlag = missionAlerts.find(alert => {
                const isRedFlag = alert.type.toLowerCase().includes('red flag') || 
                                  alert.headline.toLowerCase().includes('red flag') || 
                                  alert.description.toLowerCase().includes('red flag');
                if (!isRedFlag) return false;
                return isAlertActiveOnDay(day.dateStr, alert.onset, alert.ends);
              });

              const matchingFireWeather = missionAlerts.find(alert => {
                const isFireWeather = alert.type.toLowerCase().includes('fire weather') || 
                                      alert.headline.toLowerCase().includes('fire weather') || 
                                      alert.description.toLowerCase().includes('fire weather');
                if (!isFireWeather) return false;
                return isAlertActiveOnDay(day.dateStr, alert.onset, alert.ends);
              });

              let borderStyle = 'border-zinc-900/60';
              let bgStyle = 'bg-[#0c0c0d]/40';
              let badgeText = '';

              if (matchingRedFlag || lowerCond.includes('red flag')) {
                borderStyle = 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse';
                bgStyle = 'bg-red-500/10';
                badgeText = 'RED FLAG';
              } else if (matchingFireWeather || lowerCond.includes('fire weather')) {
                borderStyle = 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
                bgStyle = 'bg-amber-500/10';
                badgeText = 'FIRE DANGER';
              } else if (day.tempMax > 85 || isThunderstorm) {
                borderStyle = 'border-rose-500/30';
                bgStyle = 'bg-rose-500/5';
              } else if (day.tempMax > 75) {
                borderStyle = 'border-amber-500/20';
                bgStyle = 'bg-amber-500/5';
              }

              return (
                <div 
                  key={idx} 
                  className={`border ${borderStyle} ${bgStyle} rounded-lg p-2.5 text-center flex flex-col justify-between hover:border-zinc-700/40 transition-all select-none duration-150 relative overflow-hidden`}
                >
                  {badgeText && (
                    <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-[7px] font-black uppercase py-0.5 tracking-widest leading-none">
                      {badgeText}
                    </div>
                  )}
                  <div className={badgeText ? "pt-2 space-y-1" : "space-y-1"}>
                    <span className="text-[9px] font-mono font-black text-zinc-500 tracking-wider block">{day.dayName}</span>
                    <div className="flex justify-center py-0.5">
                      {renderWeatherIcon(day.icon as any, 20, day.icon === 'sun' ? 'text-amber-500' : 'text-zinc-400')}
                    </div>
                    <span className="text-[11px] font-extrabold text-zinc-200 tracking-wide block">{day.tempMax}° / {day.tempMin}°</span>
                    <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-wide block truncate" title={day.condition}>
                      {day.condition}
                    </span>
                    <div className="text-[7px] font-mono font-bold text-zinc-400 uppercase tracking-tight mt-1 pt-1 border-t border-zinc-900/40">
                      W: {day.windSpeed} mph
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Weather Forecast & Safety Message Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CanvaFormRow label="Weather Forecast Briefing">
          <CanvaTextarea 
            value={weatherForecast} 
            onChange={e => setWeatherForecast(e.target.value)} 
            placeholder="Enter meteorological conditions..." 
            className="h-20 py-2 resize-none text-xs font-bold leading-normal"
          />
        </CanvaFormRow>

        <CanvaFormRow label="Operational Safety Message">
          <CanvaTextarea 
            value={safetyMessage} 
            onChange={e => setSafetyMessage(e.target.value)} 
            placeholder="Enter hazard mitigations or safety directions..." 
            className="h-20 py-2 resize-none text-xs font-bold leading-normal"
          />
        </CanvaFormRow>
      </div>

      {/* Custom Branding & Settings Subsection */}
      <div className="border-t border-zinc-900 pt-6 space-y-4">
        <div className="flex items-center gap-2 pb-1">
          <Sparkles size={16} className="text-amber-500" />
          <h3 className="text-xs font-black uppercase text-zinc-200 tracking-wider">EOC Custom Branding & Tenant Configuration</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Custom Agency / Client Name</label>
            <input 
              type="text" 
              value={agencyName} 
              onChange={e => setAgencyName(e.target.value)} 
              placeholder="e.g., Cascadia Emergency Management" 
              className="eoc-input"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Custom Agency Logo (Min 200px width, Max 2MB)</label>
            <div className="flex items-center gap-3">
              <label className="eoc-button-primary px-4 py-2 rounded-lg cursor-pointer text-xs flex items-center gap-1.5 shrink-0 select-none">
                <span>Browse Logo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload} 
                  className="hidden"
                />
              </label>
              {agencyLogo ? (
                <div className="relative h-10 w-10 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 shrink-0 flex items-center justify-center">
                  <img src={agencyLogo} alt="Agency Logo Preview" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setAgencyLogo(null)}
                    className="absolute top-0 right-0 bg-red-500/80 hover:bg-red-600 text-white rounded-bl p-0.5 text-[8px] cursor-pointer"
                    title="Clear logo"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-zinc-600 font-bold italic">No custom logo uploaded (using default)</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
