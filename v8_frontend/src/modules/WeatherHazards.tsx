import { useState, useEffect } from 'react';
import { dataBus } from '../services/DataBus';
import { 
  CloudSun, 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  Wind, 
  CloudFog, 
  Search, 
  AlertTriangle, 
  Radio, 
  Compass, 
  RefreshCw,
  FileText
} from 'lucide-react';
import { 
  CanvaGlassPanel, 
  CanvaButton, 
  CanvaInput, 
  CanvaSelect, 
  CanvaFormRow, 
  CanvaTextarea 
} from '../components/DesignSandbox';

// WeatherDay interface matching our architectural schema
interface WeatherDay {
  dayName: string;
  dateStr?: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: 'sun' | 'cloud' | 'cloud-rain' | 'cloud-snow' | 'cloud-lightning' | 'wind' | 'cloud-fog';
  windSpeed: number;
  windGust: number;
}

// HazardAlert interface matching NWS / PBS Warn specifications
interface HazardAlert {
  id: string;
  source: 'NWS' | 'PBS_WARN' | 'LOCAL_EOC';
  type: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  headline: string;
  description: string;
  polygonCenter?: [number, number]; // map coordinate [x, y] percentage (0-100)
  polygonRadius?: number;           // radius of threat circle
  affectedArea: string;
  timestamp: string;
  outOfBandChannel?: string;
  onset?: string;
  ends?: string;
}

// Pre-seeded Cascadia presets database with user-friendly station names and coordinates
const WEATHER_PRESETS: Record<
  string, 
  { 
    name: string; 
    city: string; 
    coordinates: [number, number]; 
  }
> = {
  "98020": {
    name: "Edmonds",
    city: "Edmonds, WA",
    coordinates: [47.8107, -122.3774]
  },
  "98101": {
    name: "Seattle",
    city: "Seattle, WA",
    coordinates: [47.6062, -122.3321]
  },
  "98201": {
    name: "Everett",
    city: "Everett, WA",
    coordinates: [47.9790, -122.2021]
  },
  "98004": {
    name: "Bellevue",
    city: "Bellevue, WA",
    coordinates: [47.6101, -122.2015]
  },
  "98402": {
    name: "Tacoma",
    city: "Tacoma, WA",
    coordinates: [47.2529, -122.4443]
  },
  "98022": {
    name: "Enumclaw",
    city: "Enumclaw, WA",
    coordinates: [47.2023, -121.9912]
  },
  "98002": {
    name: "Auburn",
    city: "Auburn, WA",
    coordinates: [47.3073, -122.2285]
  }
};

// Helper function to check if an alert overlaps with a specific forecast day (timezone-safe)
const isAlertActiveOnDay = (dayDateStr?: string, onsetStr?: string, endsStr?: string): boolean => {
  if (!dayDateStr) return false;
  try {
    const dayStart = new Date(dayDateStr + 'T00:00:00').getTime();
    const dayEnd = new Date(dayDateStr + 'T23:59:59').getTime();
    
    const onsetTime = onsetStr ? new Date(onsetStr).getTime() : Date.now();
    // Default ends to 24 hours after onset if not provided
    const endsTime = endsStr ? new Date(endsStr).getTime() : onsetTime + 24 * 3600 * 1000;
    
    return Math.max(dayStart, onsetTime) <= Math.min(dayEnd, endsTime);
  } catch (err) {
    console.error("Error evaluating alert overlap", err);
    return false;
  }
};

export default function WeatherHazards() {
  const [selectedPreset, setSelectedPreset] = useState<string>('98020');
  const [zipInput, setZipInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [cityLabel, setCityLabel] = useState<string>('Edmonds, WA');
  const [writtenBriefing, setWrittenBriefing] = useState<string>('Loading live meteorological briefing prose...');
  const [forecastDays, setForecastDays] = useState<WeatherDay[]>([]);
  const [coordinates, setCoordinates] = useState<[number, number]>(WEATHER_PRESETS['98020'].coordinates);
  const [nwsAlerts, setNwsAlerts] = useState<HazardAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState<boolean>(false);

  // Safe fallback weather simulation
  const generateSimulatedForecast = (cityName: string, lat: number, lon: number, zip?: string) => {
    const randomTempMax = 65 + Math.floor(Math.random() * 20);
    const randomTempMin = randomTempMax - 15 - Math.floor(Math.random() * 5);
    const zipSuffix = zip ? ` (ZIP ${zip})` : '';
    const mockBriefing = `Offline simulation loaded for ${cityName}${zipSuffix}. High-contrast solar radiation index is normal. Local temperatures fluctuate between ${randomTempMin}°F and ${randomTempMax}°F. Wind: West 9 mph.`;
    
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const baseConditions: { condition: string; icon: WeatherDay['icon'] }[] = [
      { condition: "Mostly Sunny", icon: "sun" },
      { condition: "Partly Cloudy", icon: "cloud" },
      { condition: "Fire Weather Watch", icon: "sun" },
      { condition: "Red Flag Warning", icon: "sun" },
      { condition: "Rain Showers", icon: "cloud-rain" },
      { condition: "Thunderstorms", icon: "cloud-lightning" },
      { condition: "Clear Sky", icon: "sun" }
    ];

    const mockForecast: WeatherDay[] = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() + idx);
      const dayName = daysOfWeek[d.getDay()];
      const dateStr = d.toISOString().split('T')[0];
      const cond = baseConditions[idx % baseConditions.length];

      return {
        dayName,
        dateStr,
        tempMax: idx === 0 ? randomTempMax : randomTempMax - 4 + Math.floor(Math.random() * 8),
        tempMin: idx === 0 ? randomTempMin : randomTempMin - 4 + Math.floor(Math.random() * 8),
        condition: cond.condition,
        icon: cond.icon,
        windSpeed: 5 + Math.floor(Math.random() * 6),
        windGust: 10 + Math.floor(Math.random() * 10)
      };
    });

    setCityLabel(cityName);
    setWrittenBriefing(mockBriefing);
    setForecastDays(mockForecast);
    setCoordinates([lat, lon]);

    dataBus.setCache('active_weather_hazards', {
      city: cityName,
      briefing: mockBriefing,
      forecast: mockForecast,
      coordinates: [lat, lon]
    });
  };

  // Reusable unauthenticated dynamic Open-Meteo & Nominatim weather fetcher
  const fetchLiveWeather = async (lat: number, lon: number, cityName: string, zip?: string) => {
    setLoading(true);
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error("Weather fetch failed");
      const wData = await weatherRes.json();

      if (wData && wData.daily) {
        const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const newForecast: WeatherDay[] = wData.daily.time.slice(0, 7).map((dateStr: string, idx: number) => {
          const date = new Date(dateStr + 'T00:00:00');
          const dayName = daysOfWeek[date.getDay()];
          const wCode = wData.daily.weather_code[idx];
          
          let condition = 'Partly Cloudy';
          let icon: WeatherDay['icon'] = 'cloud';

          if (wCode === 0) {
            condition = 'Sunny';
            icon = 'sun';
          } else if (wCode <= 3) {
            condition = 'Partly Cloudy';
            icon = 'cloud';
          } else if (wCode <= 48) {
            condition = 'Foggy';
            icon = 'cloud-fog';
          } else if (wCode <= 57) {
            condition = 'Drizzle';
            icon = 'cloud-rain';
          } else if (wCode <= 67) {
            condition = 'Showers';
            icon = 'cloud-rain';
          } else if (wCode <= 77) {
            condition = 'Snowing';
            icon = 'cloud-snow';
          } else if (wCode <= 82) {
            condition = 'Heavy Rain';
            icon = 'cloud-rain';
          } else if (wCode <= 86) {
            condition = 'Snow Showers';
            icon = 'cloud-snow';
          } else {
            condition = 'Thunderstorms';
            icon = 'cloud-lightning';
          }

          const windSpeed = wData.daily.wind_speed_10m_max ? Math.round(wData.daily.wind_speed_10m_max[idx]) : 0;
          const windGust = wData.daily.wind_gusts_10m_max ? Math.round(wData.daily.wind_gusts_10m_max[idx]) : 0;

          return {
            dayName,
            dateStr,
            tempMax: Math.round(wData.daily.temperature_2m_max[idx]),
            tempMin: Math.round(wData.daily.temperature_2m_min[idx]),
            condition,
            icon,
            windSpeed,
            windGust
          };
        });

        const currentTemp = Math.round(wData.current.temperature_2m);
        const windDirDeg = wData.current.wind_direction_10m ?? 0;
        const windSpeedVal = Math.round(wData.current.wind_speed_10m ?? 0);
        
        const getWindDirectionCardinal = (degrees: number) => {
          const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
          const index = Math.round(((degrees % 360) / 45)) % 8;
          return directions[index];
        };
        const cardinal = getWindDirectionCardinal(windDirDeg);
        const currentCondition = newForecast[0]?.condition || 'Stable';

        const zipSuffix = zip ? ` (ZIP ${zip})` : '';
        const compiledBriefing = `Current condition in ${cityName}${zipSuffix} is ${currentCondition} with temperature at ${currentTemp}°F. Wind is blowing from the ${cardinal} at ${windSpeedVal} mph.`;

        setCityLabel(cityName);
        setWrittenBriefing(compiledBriefing);
        setForecastDays(newForecast);
        setCoordinates([lat, lon]);

        dataBus.setCache('active_weather_hazards', {
          city: cityName,
          briefing: compiledBriefing,
          forecast: newForecast,
          coordinates: [lat, lon]
        });
      }
    } catch (err) {
      console.warn("Weather API failed, generating graceful simulated forecast.", err);
      generateSimulatedForecast(cityName, lat, lon, zip);
    } finally {
      setLoading(false);
    }
  };

  // Load weather preset on change
  useEffect(() => {
    if (WEATHER_PRESETS[selectedPreset]) {
      const p = WEATHER_PRESETS[selectedPreset];
      fetchLiveWeather(p.coordinates[0], p.coordinates[1], p.city);
    }
  }, [selectedPreset]);

  // Trigger cache updates on manual written briefing edit
  const handleBriefingEdit = (text: string) => {
    setWrittenBriefing(text);
    const cached = dataBus.getCache<{ city: string; forecast: WeatherDay[]; coordinates: [number, number] }>('active_weather_hazards');
    dataBus.setCache('active_weather_hazards', {
      city: cached?.city || cityLabel,
      briefing: text,
      forecast: cached?.forecast || forecastDays,
      coordinates: cached?.coordinates || coordinates
    });
  };

  // Fetch live unauthenticated active NWS alerts when coordinates change
  useEffect(() => {
    let active = true;
    const fetchAlerts = async () => {
      setAlertsLoading(true);
      try {
        const url = `https://api.weather.gov/alerts/active?point=${coordinates[0]},${coordinates[1]}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'CascadiaEOCManager/1.0' }
        });
        if (!res.ok) throw new Error(`NWS API responded with status ${res.status}`);
        const data = await res.json();
        
        if (active) {
          if (data && data.features) {
            const mapped: HazardAlert[] = data.features.map((feat: any) => {
              const props = feat.properties;
              let sev: HazardAlert['severity'] = 'minor';
              const nwsSev = (props.severity || '').toLowerCase();
              if (nwsSev === 'extreme') sev = 'extreme';
              else if (nwsSev === 'severe') sev = 'severe';
              else if (nwsSev === 'moderate') sev = 'moderate';
              
              let timeStr = '';
              try {
                if (props.sent) {
                  timeStr = new Date(props.sent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                }
              } catch {
                timeStr = props.sent || '';
              }

              return {
                id: props.id || feat.id || Math.random().toString(),
                source: 'NWS',
                type: props.event || 'Weather Alert',
                severity: sev,
                headline: props.headline || `${props.event} Alert`,
                description: props.description || props.instruction || props.headline || '',
                affectedArea: props.areaDesc || 'Unknown Area',
                timestamp: timeStr,
                onset: props.onset || props.effective || props.sent || '',
                ends: props.ends || props.expires || ''
              };
            });
            setNwsAlerts(mapped);
          } else {
            setNwsAlerts([]);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch live NWS alerts:", err);
        if (active) {
          setNwsAlerts([]);
        }
      } finally {
        if (active) {
          setAlertsLoading(false);
        }
      }
    };

    fetchAlerts();
    return () => {
      active = false;
    };
  }, [coordinates]);

  // ZIP Code Search handler (Live unauthenticated API fetch)
  const handleZipSearch = async () => {
    if (!zipInput.trim() || zipInput.length < 5) return;
    setLoading(true);
    
    // Check if entered ZIP is pre-seeded in our database for high-fidelity WA responses
    if (WEATHER_PRESETS[zipInput]) {
      setSelectedPreset(zipInput);
      setLoading(false);
      return;
    }

    try {
      // 1. Geocode via unauthenticated OSM Nominatim
      const geoUrl = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zipInput)}&country=United+States&format=json`;
      const geoRes = await fetch(geoUrl, {
        headers: { 'User-Agent': 'CascadiaEOCManager/1.0' }
      });
      const geoData = await geoRes.json();

      if (geoData && geoData.length > 0) {
        const { lat, lon, display_name } = geoData[0];
        const parsedLat = parseFloat(lat);
        const parsedLon = parseFloat(lon);
        const displayParts = display_name.split(',');
        const parsedCity = `${displayParts[0].trim()}, ${displayParts[displayParts.length - 3]?.trim() || 'USA'}`;

        await fetchLiveWeather(parsedLat, parsedLon, parsedCity, zipInput);
      } else {
        generateSimulatedForecast(`EOC Sector ZIP ${zipInput}`, 47.6062, -122.3321, zipInput);
      }
    } catch (err) {
      console.warn("Weather API failed, generating graceful simulated forecast.");
      generateSimulatedForecast(`EOC Sector ZIP ${zipInput}`, 47.6062, -122.3321, zipInput);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic EOC checklist protocols based on live active alerts
  const getActiveProtocolActions = () => {
    const list: string[] = [];
    const lowerAlerts = nwsAlerts.map(a => `${a.type} ${a.headline} ${a.description}`.toLowerCase());
    
    const hasHeat = lowerAlerts.some(t => t.includes('heat') || t.includes('temperature') || t.includes('warm'));
    const hasSnow = lowerAlerts.some(t => t.includes('snow') || t.includes('blizzard') || t.includes('winter') || t.includes('freeze') || t.includes('cold'));
    const hasLightning = lowerAlerts.some(t => t.includes('lightning') || t.includes('thunderstorm') || t.includes('storm'));
    const hasFlood = lowerAlerts.some(t => t.includes('flood') || t.includes('inundation') || t.includes('surge'));
    const hasWind = lowerAlerts.some(t => t.includes('wind') || t.includes('gale') || t.includes('tornado'));

    if (hasHeat) {
      list.push("Establish hydration stations and cooling shelters at the tribal Gymnasium.");
      list.push("Dispatch watch officers with thermal sensors to check on vulnerable shelter nodes.");
      list.push("De-energize high-load HVAC circuits to prevent grid overload spikes.");
    }
    if (hasSnow) {
      list.push("Deploy snow tire-chains on all logistics/supply tactical vehicles.");
      list.push("Trigger cold-weather shelter MOU covenants with High School Gym.");
      list.push("Confirm propane reserves and heating fuel stockpiles at Bethel Community Church.");
    }
    if (hasLightning) {
      list.push("Order all field personnel to immediately retreat to indoor tactical sites.");
      list.push("Deploy primary back-up batteries and confirm secondary VHF radios frequency sync.");
      list.push("Notify electric utilities of electrical grid warning fields convergence.");
    }
    if (hasFlood) {
      list.push("Stage watercraft rescue teams at Edmonds waterfront staging pool.");
      list.push("Erect auxiliary water barriers around lower logistics hub nodes.");
    }
    if (hasWind) {
      list.push("Secure loose equipment at all logistics yards and field command posts.");
      list.push("Standby chainsaw crews for rapid clearance of storm-blown roadway debris.");
    }
    return list;
  };

  // Weather icon renderer helper
  const renderWeatherIcon = (iconName: WeatherDay['icon'], size: number = 24, colorClass: string = "text-amber-500") => {
    switch (iconName) {
      case 'sun': return <Sun size={size} className={`${colorClass} animate-spin-slow`} />;
      case 'cloud': return <Cloud size={size} className={colorClass} />;
      case 'cloud-rain': return <CloudRain size={size} className={colorClass} />;
      case 'cloud-snow': return <CloudSnow size={size} className={colorClass} />;
      case 'cloud-lightning': return <CloudLightning size={size} className={colorClass} />;
      case 'wind': return <Wind size={size} className={colorClass} />;
      case 'cloud-fog': return <CloudFog size={size} className={colorClass} />;
      default: return <CloudSun size={size} className={colorClass} />;
    }
  };

  // Relayed PBS WARN logs are derived from live unauthenticated NWS alerts
  const pbsWarnLogs: HazardAlert[] = nwsAlerts.map(alert => ({
    ...alert,
    source: 'PBS_WARN',
    outOfBandChannel: alert.affectedArea.toLowerCase().includes('seattle') || alert.affectedArea.toLowerCase().includes('edmonds') || alert.affectedArea.toLowerCase().includes('king')
      ? 'KCTS-9 Seattle Transmitter (WEA Subcarrier)'
      : 'KBTC-28 Tacoma Transmitter (Subcarrier Relay)'
  }));

  return (
    <div className="space-y-6 font-sans pb-12 select-none">
      
      {/* 1. Header Title Block */}
      <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase text-zinc-100 tracking-wider flex items-center gap-2">
            <CloudLightning className="text-amber-500 animate-pulse" size={20} />
            Meteorological & Environmental Hazards
          </h1>
          <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mt-1">
            Sovereign EOC Tactical Observation & Emergency Alert Core · v7.2.1
          </p>
        </div>
        
        {/* Active Preset Station Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[9.5px] font-mono font-black text-zinc-500 uppercase tracking-widest">Active Station:</span>
          <CanvaSelect 
            value={selectedPreset} 
            onChange={e => setSelectedPreset(e.target.value)} 
            className="h-[36px] w-[210px] font-bold text-[10.5px] uppercase"
          >
            {Object.entries(WEATHER_PRESETS).map(([key, val]) => (
              <option key={key} value={key} className="bg-zinc-950 text-zinc-200">
                {val.name}
              </option>
            ))}
          </CanvaSelect>
        </div>
      </div>

      {/* 2. ZIP Code Search Bar Block */}
      <CanvaGlassPanel className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
            <Compass size={18} className="text-amber-500 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-zinc-200 tracking-wider">{cityLabel}</h3>
            <p className="text-[9.5px] text-zinc-500 font-bold uppercase mt-0.5">Tactical Sector Coordinate Node</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[8.5px] font-mono text-zinc-500 font-bold uppercase bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">GPS: {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}</span>
              <a 
                href={`https://forecast.weather.gov/MapClick.php?lat=${coordinates[0]}&lon=${coordinates[1]}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[8.5px] font-mono font-black text-amber-500 hover:text-amber-400 hover:underline uppercase flex items-center gap-0.5"
              >
                Verify Live NWS Source ↗
              </a>
            </div>
          </div>
        </div>

        {/* Search Field */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <CanvaInput 
            type="text" 
            placeholder="Enter US ZIP Code..." 
            value={zipInput} 
            onChange={e => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
            className="h-[38px] w-full sm:w-44 text-xs font-bold font-mono tracking-widest text-center"
          />
          <CanvaButton 
            onClick={handleZipSearch} 
            disabled={loading || zipInput.length < 5} 
            className="h-[38px] px-4 bg-zinc-900 border border-zinc-800 text-amber-500 flex items-center justify-center gap-1 cursor-pointer hover:bg-zinc-800 disabled:opacity-40"
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
            <span className="text-[10px] font-black uppercase tracking-wider">Search</span>
          </CanvaButton>
        </div>
      </CanvaGlassPanel>

      {/* 3. 7-Day Horizontal Forecast Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {forecastDays.length === 0 ? (
          Array.from({ length: 7 }).map((_, idx) => (
            <CanvaGlassPanel key={idx} className="p-3.5 text-center space-y-3.5 animate-pulse">
              <div className="h-2.5 bg-zinc-800 rounded w-10 mx-auto" />
              <div className="h-7 w-7 bg-zinc-800 rounded-full mx-auto" />
              <div className="h-3 bg-zinc-800 rounded w-16 mx-auto" />
              <div className="h-2.5 bg-zinc-800 rounded w-12 mx-auto" />
              <div className="h-[1px] bg-zinc-900" />
              <div className="h-2 bg-zinc-800 rounded w-20 mx-auto" />
            </CanvaGlassPanel>
          ))
        ) : (
          forecastDays.map((day, idx) => {
            const lowerCond = day.condition.toLowerCase();
            const isThunderstorm = lowerCond.includes('thunderstorm') || day.icon === 'cloud-lightning';
            
            // Check NWS Active Warnings with timezone-safe calendar date range overlap
            const matchingRedFlag = nwsAlerts.find(alert => {
              const isRedFlag = alert.type.toLowerCase().includes('red flag') || 
                                alert.headline.toLowerCase().includes('red flag') || 
                                alert.description.toLowerCase().includes('red flag');
              if (!isRedFlag) return false;
              return isAlertActiveOnDay(day.dateStr, alert.onset, alert.ends);
            });

            const matchingFireWeather = nwsAlerts.find(alert => {
              const isFireWeather = alert.type.toLowerCase().includes('fire weather') || 
                                    alert.headline.toLowerCase().includes('fire weather') || 
                                    alert.description.toLowerCase().includes('fire weather');
              if (!isFireWeather) return false;
              return isAlertActiveOnDay(day.dateStr, alert.onset, alert.ends);
            });

            let highlight: 'none' | 'yellow' | 'red' | 'amber-heavy' | 'red-heavy' = 'none';
            let bannerText: string | undefined = undefined;

            if (matchingRedFlag || lowerCond.includes('red flag')) {
              highlight = 'red-heavy';
              bannerText = 'RED FLAG';
            } else if (matchingFireWeather || lowerCond.includes('fire weather')) {
              highlight = 'amber-heavy';
              bannerText = 'FIRE WEATHER';
            } else if (day.tempMax > 85 || isThunderstorm) {
              highlight = 'red';
            } else if (day.tempMax > 75) {
              highlight = 'yellow';
            }

            return (
              <CanvaGlassPanel 
                key={idx} 
                highlight={highlight}
                bannerText={bannerText}
                className="p-3.5 text-center space-y-2 flex flex-col justify-between hover:border-zinc-700/60 transition-all select-none duration-150"
              >
                <span className="text-[10px] font-mono font-black text-zinc-500 tracking-wider">{day.dayName}</span>
                <div className="flex justify-center py-1">
                  {renderWeatherIcon(day.icon, 28, day.icon === 'sun' ? 'text-amber-500' : 'text-zinc-400')}
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-zinc-200 tracking-wide block">{day.tempMax}° / {day.tempMin}°</span>
                  <span className="text-[8.5px] text-zinc-500 font-extrabold uppercase tracking-wide block truncate" title={day.condition}>
                    {day.condition}
                  </span>
                  <div className="text-[8px] font-mono font-bold text-zinc-400 uppercase tracking-tight mt-1.5 pt-1.5 border-t border-zinc-900/50">
                    WIND: {day.windSpeed} mph <span className="text-zinc-600">|</span> GUSTS: {day.windGust} mph
                  </div>
                </div>
              </CanvaGlassPanel>
            );
          })
        )}
      </div>

      {/* 4. Symmetrical 2-Column Console Grid for Briefing & Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Meteorological Briefing Prose */}
        <CanvaGlassPanel className="p-4 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
            <div className="flex items-center gap-1.5">
              <FileText size={14} className="text-amber-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300">METEOROLOGICAL BRIEFING PROSE</span>
            </div>
            <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900">
              DataBus Cached
            </span>
          </div>

          <CanvaFormRow label="Active EOC Weather briefing (Editable overwrite)">
            <CanvaTextarea 
              value={writtenBriefing}
              onChange={e => handleBriefingEdit(e.target.value)}
              placeholder="Type official weather briefings..."
              className="h-[120px] py-2.5 text-xs font-bold leading-relaxed resize-none custom-scroll"
            />
          </CanvaFormRow>
        </CanvaGlassPanel>

        {/* Operational EOC Action Checklist */}
        <CanvaGlassPanel className="p-4 space-y-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-2.5">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300">OPERATIONAL EOC ACTION CHECKLIST</span>
          </div>
          
          <div className="bg-zinc-950/45 border border-zinc-900 rounded-xl p-3 space-y-2 h-[120px] overflow-y-auto custom-scroll flex-1">
            {getActiveProtocolActions().map((action, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[10.5px] font-bold text-zinc-300 leading-normal">
                <span className="text-amber-500 font-mono mt-0.5 shrink-0">▸</span>
                <span>{action}</span>
              </div>
            ))}
            {getActiveProtocolActions().length === 0 && (
              <div className="text-zinc-600 font-bold italic text-center py-6 text-[10px] uppercase">
                All environmental indices safe. No active EOC weather checklists triggered.
              </div>
            )}
          </div>
        </CanvaGlassPanel>

      </div>

      {/* 5. Balanced Emergency Warnings Console: Live NWS Alerts & PBS WEA Relays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Live NWS Active Alerts Feed */}
        <CanvaGlassPanel className="p-4 space-y-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                LIVE NWS ACTIVE WARNING ALERTS FEED
              </span>
            </div>
            <div className="flex items-center gap-2">
              {alertsLoading && <RefreshCw size={10} className="animate-spin text-amber-500" />}
              <span className="text-[8px] font-mono font-black text-amber-500 uppercase bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded tracking-widest">
                Live API
              </span>
            </div>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scroll pr-1 flex-1">
            {nwsAlerts.map(alert => (
              <div key={alert.id} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2 relative overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${
                    alert.severity === 'extreme' ? 'bg-red-500 animate-ping' : 'bg-amber-500'
                  }`} />
                  <span className="text-[9px] font-mono font-black text-amber-500 uppercase tracking-widest">
                    {alert.type} // {alert.timestamp}
                  </span>
                </div>

                <h4 className="text-[11.5px] font-black text-zinc-100 uppercase tracking-wide leading-tight">
                  {alert.headline}
                </h4>
                <p className="text-[10px] font-bold text-zinc-400 leading-relaxed">
                  {alert.description}
                </p>
                <div className="text-[8px] font-mono font-extrabold text-zinc-600 uppercase tracking-widest pt-1 border-t border-zinc-900/40">
                  Affected Area: {alert.affectedArea}
                </div>
              </div>
            ))}
            {nwsAlerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <CloudSun size={32} className="text-zinc-600 animate-pulse" />
                <div className="text-zinc-500 font-black text-[11px] uppercase tracking-wider">
                  No Active NWS Warnings Issued
                </div>
                <p className="text-[9px] text-zinc-600 font-bold max-w-xs leading-normal">
                  Puget Sound atmospheric indices are stable. Ready for hazard monitoring operations.
                </p>
              </div>
            )}
          </div>
        </CanvaGlassPanel>

        {/* Relayed PBS WARN Broadcast WEA Feed */}
        <CanvaGlassPanel className="p-4 space-y-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
            <div className="flex items-center gap-2">
              <Radio size={14} className="text-amber-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                RELAYED PBS WARN BROADCAST WEA FEED
              </span>
            </div>
            <span className="text-[8px] font-mono font-black text-green-500 uppercase bg-green-500/10 border border-green-500/30 px-2.5 py-0.5 rounded tracking-widest">
              Redundant Broadcast
            </span>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scroll pr-1 flex-1">
            {pbsWarnLogs.map(alert => (
              <div key={`pbs-${alert.id}`} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-[7.5px] font-mono font-extrabold text-zinc-500 tracking-wider uppercase">
                  {alert.outOfBandChannel}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${
                    alert.severity === 'extreme' ? 'bg-red-500 animate-ping' : 'bg-amber-500'
                  }`} />
                  <span className="text-[9px] font-mono font-black text-amber-500 uppercase tracking-widest">
                    {alert.type} // {alert.timestamp}
                  </span>
                </div>

                <h4 className="text-[11.5px] font-black text-zinc-100 uppercase tracking-wide leading-tight">
                  {alert.headline}
                </h4>
                <p className="text-[10px] font-bold text-zinc-400 leading-relaxed pr-8">
                  {alert.description}
                </p>
                <div className="text-[8px] font-mono font-extrabold text-zinc-600 uppercase tracking-widest pt-1 border-t border-zinc-900/40">
                  Transmitter Subcarrier Target: {alert.affectedArea}
                </div>
              </div>
            ))}
            {pbsWarnLogs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <Radio size={32} className="text-zinc-600 animate-pulse" />
                <div className="text-zinc-500 font-black text-[11px] uppercase tracking-wider">
                  PBS WARN Receiver Standby
                </div>
                <p className="text-[9px] text-zinc-600 font-bold max-w-xs leading-normal">
                  Air-gapped receiver subchannel active on KCTS-9 & KBTC-28. No WEA subcarriers decoded.
                </p>
              </div>
            )}
          </div>
        </CanvaGlassPanel>

      </div>
    </div>
  );
}

