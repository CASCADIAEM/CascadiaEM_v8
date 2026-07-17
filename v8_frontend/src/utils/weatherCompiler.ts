import React from 'react';
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  Wind, 
  CloudFog, 
  CloudSun 
} from 'lucide-react';

/**
 * Cascadia Matrix - Meteorological Utility Compiler & Config
 */

export interface WeatherDay {
  dayName: string;
  dateStr?: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: 'sun' | 'cloud' | 'cloud-rain' | 'cloud-snow' | 'cloud-lightning' | 'wind' | 'cloud-fog';
  windSpeed: number;
  windGust: number;
  windDirection?: string;
}

export interface HazardAlert {
  id: string;
  source: 'NWS' | 'PBS_WARN' | 'LOCAL_EOC';
  type: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  headline: string;
  description: string;
  polygonCenter?: [number, number];
  polygonRadius?: number;
  affectedArea: string;
  timestamp: string;
  outOfBandChannel?: string;
  onset?: string;
  ends?: string;
}

export interface WeatherIconMap {
  condition: string;
  icon: 'sun' | 'cloud' | 'cloud-fog' | 'cloud-rain' | 'cloud-snow' | 'cloud-lightning';
}

/**
 * Pre-seeded Cascadia presets database with user-friendly station names and coordinates
 */
export const WEATHER_PRESETS: Record<
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

/**
 * Maps Open-Meteo weather codes to descriptive text and Lucide icons
 */
export function getWeatherIconAndCondition(wCode: number): WeatherIconMap {
  if (wCode === 0) {
    return { condition: 'Sunny', icon: 'sun' };
  } else if (wCode <= 3) {
    return { condition: 'Partly Cloudy', icon: 'cloud' };
  } else if (wCode <= 48) {
    return { condition: 'Foggy', icon: 'cloud-fog' };
  } else if (wCode <= 57) {
    return { condition: 'Drizzle', icon: 'cloud-rain' };
  } else if (wCode <= 67) {
    return { condition: 'Showers', icon: 'cloud-rain' };
  } else if (wCode <= 77) {
    return { condition: 'Snowing', icon: 'cloud-snow' };
  } else if (wCode <= 82) {
    return { condition: 'Heavy Rain', icon: 'cloud-rain' };
  } else if (wCode <= 86) {
    return { condition: 'Snow Showers', icon: 'cloud-snow' };
  } else {
    return { condition: 'Thunderstorms', icon: 'cloud-lightning' };
  }
}

/**
 * Converted wind degrees into cardinal wind directions
 */
export function getWindDirectionCardinal(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((degrees % 360) / 45)) % 8;
  return directions[index];
}

/**
 * Generates a clean, direct, and actionable weather briefing sentence
 */
export function compileWeatherBriefing(
  cityName: string,
  currentCondition: string,
  currentTemp: number,
  cardinal: string,
  windSpeedVal: number,
  zip?: string
): string {
  const zipSuffix = zip ? ` (ZIP ${zip})` : '';
  return `Current condition in ${cityName}${zipSuffix} is ${currentCondition} with temperature at ${currentTemp}°F. Wind is blowing from the ${cardinal} at ${windSpeedVal} mph.`;
}

/**
 * Checks if an alert overlaps with a specific forecast day (timezone-safe)
 */
export const isAlertActiveOnDay = (dayDateStr?: string, onsetStr?: string, endsStr?: string): boolean => {
  if (!dayDateStr) return false;
  try {
    const dayStart = new Date(dayDateStr + 'T00:00:00').getTime();
    const dayEnd = new Date(dayDateStr + 'T23:59:59').getTime();
    
    const onsetTime = onsetStr ? new Date(onsetStr).getTime() : Date.now();
    const endsTime = endsStr ? new Date(endsStr).getTime() : onsetTime + 24 * 3600 * 1000;
    
    return onsetTime <= dayEnd && endsTime >= dayStart;
  } catch {
    return false;
  }
};

/**
 * Weather icon renderer helper
 */
export const renderWeatherIcon = (
  iconName: 'sun' | 'cloud' | 'cloud-rain' | 'cloud-snow' | 'cloud-lightning' | 'wind' | 'cloud-fog',
  size: number = 24,
  colorClass: string = "text-amber-500"
): React.ReactNode => {
  switch (iconName) {
    case 'sun': return React.createElement(Sun, { size, className: `${colorClass} animate-spin-slow` });
    case 'cloud': return React.createElement(Cloud, { size, className: colorClass });
    case 'cloud-rain': return React.createElement(CloudRain, { size, className: colorClass });
    case 'cloud-snow': return React.createElement(CloudSnow, { size, className: colorClass });
    case 'cloud-lightning': return React.createElement(CloudLightning, { size, className: colorClass });
    case 'wind': return React.createElement(Wind, { size, className: colorClass });
    case 'cloud-fog': return React.createElement(CloudFog, { size, className: colorClass });
    default: return React.createElement(CloudSun, { size, className: colorClass });
  }
};
