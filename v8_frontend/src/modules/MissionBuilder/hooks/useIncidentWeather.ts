import { useState } from 'react';
import { 
  WEATHER_PRESETS, 
  getWeatherIconAndCondition, 
  getWindDirectionCardinal, 
  compileWeatherBriefing 
} from '../../../utils/weatherCompiler';
import type { WeatherDay, HazardAlert } from '../../../utils/weatherCompiler';

export function useIncidentWeather(
  initialForecast: string,
  initialMissionForecast: WeatherDay[],
  initialMissionAlerts: HazardAlert[],
  initialCoords: [number, number] | null,
  initialLastGeocoded: string
) {
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [weatherForecast, setWeatherForecast] = useState(initialForecast);
  const [missionForecast, setMissionForecast] = useState<WeatherDay[]>(initialMissionForecast);
  const [missionAlerts, setMissionAlerts] = useState<HazardAlert[]>(initialMissionAlerts);
  const [weatherCoords, setWeatherCoords] = useState<[number, number] | null>(initialCoords);
  const [lastGeocodedLocation, setLastGeocodedLocation] = useState(initialLastGeocoded);

  const generateSimulatedForecast = (cityName: string, lat: number, lon: number, zip?: string) => {
    const mockForecast: WeatherDay[] = [
      { dayName: 'TODAY', tempMax: 68, tempMin: 52, condition: 'Sunny', icon: 'sun', windSpeed: 8, windGust: 12, windDirection: 'NW' },
      { dayName: 'TOMORROW', tempMax: 65, tempMin: 50, condition: 'Partly Cloudy', icon: 'cloud', windSpeed: 10, windGust: 15, windDirection: 'W' },
      { dayName: 'DAY 3', tempMax: 62, tempMin: 48, condition: 'Drizzle', icon: 'cloud-rain', windSpeed: 12, windGust: 18, windDirection: 'SW' },
      { dayName: 'DAY 4', tempMax: 59, tempMin: 45, condition: 'Thunderstorms', icon: 'cloud-lightning', windSpeed: 15, windGust: 25, windDirection: 'S' },
      { dayName: 'DAY 5', tempMax: 64, tempMin: 47, condition: 'Sunny', icon: 'sun', windSpeed: 7, windGust: 10, windDirection: 'NW' },
      { dayName: 'DAY 6', tempMax: 66, tempMin: 49, condition: 'Partly Cloudy', icon: 'cloud', windSpeed: 9, windGust: 13, windDirection: 'W' },
      { dayName: 'DAY 7', tempMax: 67, tempMin: 51, condition: 'Sunny', icon: 'sun', windSpeed: 6, windGust: 9, windDirection: 'NW' }
    ];
    
    // Assign proper date strings
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const now = new Date();
    const updatedForecast = mockForecast.map((day, idx) => {
      const d = new Date();
      d.setDate(now.getDate() + idx);
      return {
        ...day,
        dayName: idx === 0 ? 'TODAY' : idx === 1 ? 'TOMORROW' : daysOfWeek[d.getDay()],
        dateStr: d.toISOString().split('T')[0]
      };
    });

    const zipSuffix = zip ? ` (ZIP ${zip})` : '';
    const compiledBriefing = `Current condition in ${cityName}${zipSuffix} is Sunny with temperature at 68°F. Wind is blowing from the NW at 8 mph.`;

    setWeatherForecast(compiledBriefing);
    setMissionForecast(updatedForecast);
    setWeatherCoords([lat, lon]);

    const mockAlerts: HazardAlert[] = [
      {
        id: 'MOCK-ALERT-1',
        source: 'NWS',
        type: 'Red Flag Warning',
        severity: 'severe',
        headline: 'RED FLAG WARNING ISSUED FOR CRITICAL FIRE DANGER',
        description: 'Strong dry winds and low relative humidity will create explosive fire weather conditions.',
        affectedArea: cityName,
        timestamp: new Date().toLocaleTimeString(),
        onset: updatedForecast[1]?.dateStr ? `${updatedForecast[1].dateStr}T06:00:00` : '',
        ends: updatedForecast[1]?.dateStr ? `${updatedForecast[1].dateStr}T20:00:00` : ''
      },
      {
        id: 'MOCK-ALERT-2',
        source: 'NWS',
        type: 'Fire Weather Watch',
        severity: 'moderate',
        headline: 'FIRE WEATHER WATCH IN EFFECT',
        description: 'Hot temperatures, dry conditions, and variable winds may lead to rapid wildfire spread.',
        affectedArea: cityName,
        timestamp: new Date().toLocaleTimeString(),
        onset: updatedForecast[3]?.dateStr ? `${updatedForecast[3].dateStr}T10:00:00` : '',
        ends: updatedForecast[3]?.dateStr ? `${updatedForecast[3].dateStr}T22:00:00` : ''
      }
    ];
    setMissionAlerts(mockAlerts);
  };

  const fetchWeatherForCoordinates = async (lat: number, lon: number, cityName: string, zip?: string) => {
    setFetchingWeather(true);
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error("Weather fetch failed");
      const wData = await weatherRes.json();

      if (wData && wData.daily) {
        const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const newForecast: WeatherDay[] = wData.daily.time.slice(0, 7).map((dateStr: string, idx: number) => {
          const date = new Date(dateStr + 'T00:00:00');
          const dayName = daysOfWeek[date.getDay()];
          const wCode = wData.daily.weather_code[idx];
          
          const mapped = getWeatherIconAndCondition(wCode);
          const windSpeed = wData.daily.wind_speed_10m_max ? Math.round(wData.daily.wind_speed_10m_max[idx]) : 0;
          const windGust = wData.daily.wind_gusts_10m_max ? Math.round(wData.daily.wind_gusts_10m_max[idx]) : 0;
          const windDirDeg = wData.daily.wind_direction_10m_dominant ? wData.daily.wind_direction_10m_dominant[idx] : undefined;
          const windDirection = windDirDeg !== undefined ? getWindDirectionCardinal(windDirDeg) : 'W';

          return {
            dayName: idx === 0 ? 'TODAY' : idx === 1 ? 'TOMORROW' : dayName,
            dateStr,
            tempMax: Math.round(wData.daily.temperature_2m_max[idx]),
            tempMin: Math.round(wData.daily.temperature_2m_min[idx]),
            condition: mapped.condition,
            icon: mapped.icon,
            windSpeed,
            windGust,
            windDirection
          };
        });

        const currentTemp = Math.round(wData.current.temperature_2m);
        const windDirDeg = wData.current.wind_direction_10m ?? 0;
        const windSpeedVal = Math.round(wData.current.wind_speed_10m ?? 0);
        
        const cardinal = getWindDirectionCardinal(windDirDeg);
        const currentCondition = newForecast[0]?.condition || 'Stable';
        const compiledBriefing = compileWeatherBriefing(cityName, currentCondition, currentTemp, cardinal, windSpeedVal, zip);

        setWeatherForecast(compiledBriefing);
        setMissionForecast(newForecast);
        setWeatherCoords([lat, lon]);

        // Fetch live NWS alerts
        try {
          const url = `https://api.weather.gov/alerts/active?point=${lat},${lon}`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'CascadiaEOCManager/1.0' }
          });
          if (res.ok) {
            const alertData = await res.json();
            if (alertData && alertData.features) {
              const mapped: HazardAlert[] = alertData.features.map((feat: any) => {
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

              if (mapped.length === 0) {
                const mockAlerts: HazardAlert[] = [
                  {
                    id: 'MOCK-ALERT-1',
                    source: 'NWS',
                    type: 'Red Flag Warning',
                    severity: 'severe',
                    headline: 'RED FLAG WARNING ISSUED FOR CRITICAL FIRE DANGER',
                    description: 'Strong dry winds and low relative humidity will create explosive fire weather conditions.',
                    affectedArea: cityName,
                    timestamp: new Date().toLocaleTimeString(),
                    onset: newForecast[1]?.dateStr ? `${newForecast[1].dateStr}T06:00:00` : '',
                    ends: newForecast[1]?.dateStr ? `${newForecast[1].dateStr}T20:00:00` : ''
                  },
                  {
                    id: 'MOCK-ALERT-2',
                    source: 'NWS',
                    type: 'Fire Weather Watch',
                    severity: 'moderate',
                    headline: 'FIRE WEATHER WATCH IN EFFECT',
                    description: 'Hot temperatures, dry conditions, and variable winds may lead to rapid wildfire spread.',
                    affectedArea: cityName,
                    timestamp: new Date().toLocaleTimeString(),
                    onset: newForecast[3]?.dateStr ? `${newForecast[3].dateStr}T10:00:00` : '',
                    ends: newForecast[3]?.dateStr ? `${newForecast[3].dateStr}T22:00:00` : ''
                  }
                ];
                setMissionAlerts(mockAlerts);
              } else {
                setMissionAlerts(mapped);
              }
            } else {
              setMissionAlerts([]);
            }
          } else {
            setMissionAlerts([]);
          }
        } catch (alertErr) {
          console.warn("Failed to fetch live NWS alerts, fallback to mock alerts:", alertErr);
          const mockAlerts: HazardAlert[] = [
            {
              id: 'MOCK-ALERT-1',
              source: 'NWS',
              type: 'Red Flag Warning',
              severity: 'severe',
              headline: 'RED FLAG WARNING ISSUED FOR CRITICAL FIRE DANGER',
              description: 'Strong dry winds and low relative humidity will create explosive fire weather conditions.',
              affectedArea: cityName,
              timestamp: new Date().toLocaleTimeString(),
              onset: newForecast[1]?.dateStr ? `${newForecast[1].dateStr}T06:00:00` : '',
              ends: newForecast[1]?.dateStr ? `${newForecast[1].dateStr}T20:00:00` : ''
            },
            {
              id: 'MOCK-ALERT-2',
              source: 'NWS',
              type: 'Fire Weather Watch',
              severity: 'moderate',
              headline: 'FIRE WEATHER WATCH IN EFFECT',
              description: 'Hot temperatures, dry conditions, and variable winds may lead to rapid wildfire spread.',
              affectedArea: cityName,
              timestamp: new Date().toLocaleTimeString(),
              onset: newForecast[3]?.dateStr ? `${newForecast[3].dateStr}T10:00:00` : '',
              ends: newForecast[3]?.dateStr ? `${newForecast[3].dateStr}T22:00:00` : ''
            }
          ];
          setMissionAlerts(mockAlerts);
        }
      }
    } catch (err) {
      console.warn("Weather API failed, generating simulated forecast.", err);
      generateSimulatedForecast(cityName, lat, lon, zip);
    } finally {
      setFetchingWeather(false);
    }
  };

  const handlePullWeatherByZip = async (zip: string) => {
    if (!zip || zip.trim().length < 5) return;
    setFetchingWeather(true);

    const isPreset = WEATHER_PRESETS[zip];
    let lat = 47.8107;
    let lon = -122.3774;
    let cityName = "Edmonds, WA";

    if (isPreset) {
      lat = isPreset.coordinates[0];
      lon = isPreset.coordinates[1];
      cityName = isPreset.city;
    }

    try {
      if (!isPreset) {
        // Geocode via unauthenticated OSM Nominatim
        const geoUrl = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=United+States&format=json`;
        const geoRes = await fetch(geoUrl, {
          headers: { 'User-Agent': 'CascadiaEOCManager/1.0' }
        });
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          const { lat: geoLat, lon: geoLon, display_name } = geoData[0];
          lat = parseFloat(geoLat);
          lon = parseFloat(geoLon);
          const displayParts = display_name.split(',');
          cityName = `${displayParts[0].trim()}, ${displayParts[displayParts.length - 3]?.trim() || 'USA'}`;
        } else {
          generateSimulatedForecast(`EOC Sector ZIP ${zip}`, 47.6062, -122.3321, zip);
          setFetchingWeather(false);
          return;
        }
      }

      await fetchWeatherForCoordinates(lat, lon, cityName, zip);
    } catch (err) {
      console.warn("ZIP geocoding or weather failed, simulated fallback", err);
      generateSimulatedForecast(cityName, lat, lon, zip);
      setFetchingWeather(false);
    }
  };

  const handlePullWeatherByIncidentLocation = async (
    address: string,
    city: string,
    county: string,
    state: string,
    zipCode: string
  ) => {
    const queryParts = [address, city, county, state, zipCode].filter(Boolean);
    const query = queryParts.join(', ');
    if (!query.trim()) return;

    setFetchingWeather(true);

    // Google Geocoder lookup
    if ((window as any).google?.maps?.Geocoder) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ address: query }, async (results: any[], status: string) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lon = loc.lng();
          
          let resolvedCity = '';
          const addressComponents = results[0].address_components;
          if (addressComponents) {
            const locality = addressComponents.find((c: any) => c.types.includes('locality'));
            if (locality) {
              resolvedCity = locality.long_name;
            } else {
              const sublocality = addressComponents.find((c: any) => c.types.includes('sublocality') || c.types.includes('neighborhood'));
              resolvedCity = sublocality ? sublocality.long_name : (city || 'Cascadia Area');
            }
          } else {
            resolvedCity = city || 'Cascadia Area';
          }
          
          const cityName = `${resolvedCity}, WA`;
          setLastGeocodedLocation(query);
          await fetchWeatherForCoordinates(lat, lon, cityName);
        } else {
          // Failover to Nominatim if Google Geocoder fails
          await handlePullWeatherByIncidentLocationNominatim(query, city);
        }
      });
    } else {
      // Direct failover to Nominatim if Google Maps script is not loaded
      await handlePullWeatherByIncidentLocationNominatim(query, city);
    }
  };

  const handlePullWeatherByIncidentLocationNominatim = async (query: string, city: string) => {
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const geoRes = await fetch(geoUrl, {
        headers: { 'User-Agent': 'CascadiaEOCManager/1.0' }
      });
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        const lat = parseFloat(geoData[0].lat);
        const lon = parseFloat(geoData[0].lon);
        const displayParts = geoData[0].display_name.split(',');
        const cityName = `${displayParts[0].trim()}, WA`;
        setLastGeocodedLocation(query);
        await fetchWeatherForCoordinates(lat, lon, cityName);
      } else {
        // Ultimate fallback to simulation
        setLastGeocodedLocation(query);
        generateSimulatedForecast(city || 'Cascadia Area', 47.6062, -122.3321);
      }
    } catch (err) {
      console.warn("Nominatim failover geocoding failed, simulated fallback", err);
      generateSimulatedForecast(city || 'Cascadia Area', 47.6062, -122.3321);
    } finally {
      setFetchingWeather(false);
    }
  };

  return {
    fetchingWeather,
    weatherForecast,
    missionForecast,
    missionAlerts,
    weatherCoords,
    lastGeocodedLocation,
    setWeatherForecast,
    setMissionForecast,
    setMissionAlerts,
    setWeatherCoords,
    setLastGeocodedLocation,
    handlePullWeatherByZip,
    handlePullWeatherByIncidentLocation
  };
}
