import React, { useState, useEffect } from 'react';
import { useDropdowns } from '../services/DropdownService';
import type { Dropdowns, MissionCategory } from '../services/DropdownService';
import { Settings, Plus, Trash2, X, Save } from 'lucide-react';
import { useAdminEngine } from '../services/AdminEngineService';

// CanvaGlassPanel matches the required glassmorphic container standard
interface CanvaGlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
  highlight?: 'none' | 'yellow' | 'red' | 'amber-heavy' | 'red-heavy';
  bannerText?: string;
}

export const CanvaGlassPanel: React.FC<CanvaGlassPanelProps> = ({
  children,
  glow = false,
  className = '',
  highlight = 'none',
  bannerText,
  ...props
}) => {
  let highlightClass = '';
  if (highlight === 'yellow') {
    highlightClass = 'border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)] bg-amber-950/5';
  } else if (highlight === 'red') {
    highlightClass = 'border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)] bg-red-950/5';
  } else if (highlight === 'amber-heavy') {
    highlightClass = 'border-2 border-amber-500/80 shadow-[0_0_16px_rgba(245,158,11,0.25)] bg-amber-950/10';
  } else if (highlight === 'red-heavy') {
    highlightClass = 'border-2 border-red-500/80 shadow-[0_0_16px_rgba(239,68,68,0.35)] bg-red-950/10';
  }

  if (bannerText) {
    // Strip external padding classes from className to avoid double padding/margins on outer card
    const outerClassName = className
      .replace(/\bp-\d+(\.\d+)?\b/g, '')
      .replace(/\bpx-\d+(\.\d+)?\b/g, '')
      .replace(/\bpy-\d+(\.\d+)?\b/g, '');

    return (
      <div
        className={`glass-card relative overflow-hidden flex flex-col ${glow ? 'glass-card-glow' : ''} ${highlightClass} ${outerClassName}`}
        {...props}
      >
        <div className={`w-full text-center py-1 text-[8px] font-black uppercase tracking-widest border-b select-none shrink-0 ${
          highlight === 'red' || highlight === 'red-heavy' 
            ? 'bg-red-500/20 text-red-400 border-red-500/30' 
            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        }`}>
          {bannerText}
        </div>
        <div className="p-3.5 flex-1 flex flex-col justify-between">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`glass-card ${glow ? 'glass-card-glow' : ''} ${highlightClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// CanvaButton encapsulates styled action buttons (Primary, Secondary/Outline, Ghost, Danger)
interface CanvaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
}

export const CanvaButton: React.FC<CanvaButtonProps> = ({
  children,
  variant = 'secondary',
  className = '',
  ...props
}) => {
  let btnClass = '';
  switch (variant) {
    case 'primary':
      btnClass = 'eoc-button-primary';
      break;
    case 'danger':
      btnClass = 'px-4 py-2 bg-red-950/40 border border-red-800/60 hover:bg-red-900/60 hover:border-red-600 text-red-200 rounded-lg font-bold transition-all active:scale-95 text-sm uppercase tracking-wide cursor-pointer flex items-center justify-center gap-2';
      break;
    case 'ghost':
      btnClass = 'p-2 hover:bg-zinc-800/50 hover:text-zinc-100 text-zinc-400 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center';
      break;
    case 'secondary':
    default:
      btnClass = 'eoc-button';
      break;
  }

  return (
    <button className={`${btnClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

// CanvaInput provides high-contrast text fields
interface CanvaInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const CanvaInput = React.forwardRef<HTMLInputElement, CanvaInputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`eoc-input ${className}`}
        {...props}
      />
    );
  }
);
CanvaInput.displayName = 'CanvaInput';

// CanvaSelect provides customized drop-down filters or parameters
interface CanvaSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  children: React.ReactNode;
}

export const CanvaSelect: React.FC<CanvaSelectProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <select
      className={`bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-100 rounded-lg p-3 text-sm focus:outline-none cursor-pointer w-full ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

// CanvaFormRow wraps layouts consistently with label styles
interface CanvaFormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  children: React.ReactNode;
  className?: string;
  rightElement?: React.ReactNode;
}

export const CanvaFormRow: React.FC<CanvaFormRowProps> = ({
  label,
  children,
  className = '',
  rightElement,
  ...props
}) => {
  return (
    <div className={`space-y-1.5 ${className}`} {...props}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-wider block">
          {label}
        </label>
        {rightElement}
      </div>
      {children}
    </div>
  );
};

// Canva Form Textarea Template
interface CanvaTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

/**
 * CanvaTextarea
 * Standardized textarea component utilizing a fully opaque background to isolate
 * the input container from any active page background glows, grids, or visual layers.
 * Also suppresses third-party spellcheck and grammar plugins (e.g. Grammarly)
 * that inject absolute glowing widgets inside textareas.
 */
export const CanvaTextarea: React.FC<CanvaTextareaProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="text-zinc-400 uppercase tracking-wider block text-xs font-extrabold font-mono">
          {label}
        </label>
      )}
      <textarea
        spellCheck={false}
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        {...props}
        className={`w-full text-white font-semibold placeholder-zinc-600 uppercase transition-all duration-300 ${className}`}
        style={{
          borderRadius: '12px',
          padding: '12px 16px',
          border: '1px solid rgba(39, 39, 42, 0.8)',
          fontSize: '14px',
          outline: 'none',
          backgroundColor: '#09090b', // Fully opaque dark background to lock out backdrop bleed
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'rgba(245, 158, 11, 0.8)';
          e.target.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.15)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(39, 39, 42, 0.8)';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
};

// Canva Standard Status-Bordered Unit Badge
export interface CanvaUnitBadgeProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name: string;
  status: 'DISPATCHED' | 'RELEASED' | 'ON SCENE' | string;
  onClick?: (e: any) => void;
  className?: string;
  label?: string;            // Optional custom label text to display instead of name
  isSelected?: boolean;      // Option for highlighted selection state
  isDisabled?: boolean;      // Option for disabled/inactive state
  size?: 'small' | 'normal'; // Sizing option to allow scaling inside tight grids
  children?: React.ReactNode;// Optional extra elements inside the label container
}

/**
 * CanvaUnitBadge
 * Standardized status badge for active operational units with status-colored right border.
 * Upgraded to match Canva-style 3D card layout with larger status flag blocks,
 * bold black borders, and deep realistic drop shadows.
 */
export const CanvaUnitBadge: React.FC<CanvaUnitBadgeProps> = ({
  name,
  status,
  onClick,
  className = '',
  label,
  isSelected = false,
  isDisabled = false,
  size = 'normal',
  children,
  ...props
}) => {
  let statusHex = '#00a82d'; // Green (DISPATCHED/ACTIVE)
  let statusLabel = 'ACTIVE';

  const normStatus = status.trim().toUpperCase();
  if (normStatus === 'RELEASED' || normStatus === 'STANDBY' || normStatus === 'STAGE' || normStatus === 'STG') {
    statusHex = '#ffd000'; // Yellow
    statusLabel = 'RELEASED';
  } else if (normStatus === 'ON SCENE' || normStatus === 'ON_SCENE' || normStatus === 'CRITICAL') {
    statusHex = '#d90000'; // Red
    statusLabel = 'ON SCENE';
  } else if (normStatus === 'DISPATCHED' || normStatus === 'ACTIVE') {
    statusHex = '#00a82d'; // Green
    statusLabel = 'ACTIVE';
  } else {
    statusHex = '#555555'; // Dark Gray
    statusLabel = normStatus || 'STANDBY';
  }

  const bgStyle = isDisabled
    ? '#1f1f23' // Dark disabled background
    : isSelected
      ? '#fef3c7' // Amber highlight background
      : '#bebebe'; // Standard matte silver-grey container

  const textClass = isDisabled
    ? 'text-zinc-650 font-bold'
    : 'text-zinc-950 font-black';

  const borderClass = isSelected
    ? 'border-[2px] border-amber-500 ring-2 ring-amber-500/80'
    : 'border-[2px] border-black';

  const shadowStyle = isDisabled
    ? 'none'
    : '0 8px 18px rgba(0, 0, 0, 0.7), inset 0 1.5px 0 rgba(255, 255, 255, 0.3)';

  const classList = className.split(/\s+/);
  const hasWidthClass = classList.some(c => c.startsWith('w-') || c.startsWith('max-w-') || c.startsWith('min-w-'));
  const hasHeightClass = classList.some(c => c.startsWith('h-') || c.startsWith('max-h-') || c.startsWith('min-h-'));

  const sizeStyles: React.CSSProperties = {};
  if (!hasWidthClass) {
    sizeStyles.minWidth = size === 'small' ? '76px' : '96px';
  }
  if (!hasHeightClass) {
    sizeStyles.height = size === 'small' ? '36px' : '48px';
  }

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={`relative flex items-stretch select-none transition-all duration-300 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:brightness-110 active:scale-95'} rounded-[8px] overflow-hidden ${borderClass} ${className}`}
      style={{
        backgroundColor: bgStyle,
        ...sizeStyles,
        boxShadow: shadowStyle,
        ...props.style,
      }}
      title={onClick ? `Click to cycle status. Current: ${statusLabel}` : `Status: ${statusLabel}`}
      {...props}
    >
      <div className="flex-1 flex items-center justify-center px-2 py-1 gap-0.5 min-w-0">
        <span className={`${textClass} font-sans ${size === 'small' ? 'text-[11px]' : 'text-[13px]'} tracking-tight uppercase leading-none font-black whitespace-nowrap`}>
          {String(label ? label : name).trim().toUpperCase()}
        </span>
        {children}
      </div>

      <div 
        className={`${size === 'small' ? 'w-3.5' : 'w-5'} shrink-0 border-l-[2px] border-black flex items-center justify-center`}
        style={{ 
          backgroundColor: isDisabled ? '#27272a' : statusHex,
          boxShadow: 'inset -2px 0 5px rgba(0,0,0,0.15)'
        }}
      />
    </button>
  );
};

// Canva Standard Unified Incident Card
export interface CanvaIncidentCardProps {
  priority: 'medical' | 'hazard' | 'security' | string;
  icon: React.ReactNode;
  is911?: boolean;
  title: string;
  incidentType: string;
  division?: string;
  location: string;
  serialId: string;
  timestamp: string | Date;
  assignedUnits?: Array<{ id: string; name: string; status: string }>;
  onResolve?: () => void;
  onCycleUnitStatus?: (unitId: string) => void;
  onClick?: () => void;
  className?: string;
}

export const CanvaIncidentCard: React.FC<CanvaIncidentCardProps> = ({
  priority,
  icon,
  is911 = false,
  title,
  incidentType,
  division = 'DIV-A',
  location,
  serialId,
  timestamp,
  assignedUnits = [],
  onResolve,
  onCycleUnitStatus,
  onClick,
  className = ''
}) => {
  let barColor = 'bg-blue-600';
  if (priority === 'medical' || priority === 'critical') {
    barColor = 'bg-red-600';
  } else if (priority === 'hazard' || priority === 'caution' || priority === 'warning') {
    barColor = 'bg-amber-500';
  }

  let timeStr = '00:00:00';
  if (timestamp) {
    const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    if (!isNaN(d.getTime())) {
      timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } else {
      timeStr = String(timestamp);
    }
  }

  return (
    <div
      onClick={onClick}
      className={`relative bg-black text-white rounded-[16px] p-5 pt-7 flex flex-row items-center justify-between border border-zinc-900/80 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] hover:border-zinc-800 transition-all select-none cursor-pointer ${className}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-[6px] rounded-t-[16px] ${barColor}`} />

      {onResolve && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onResolve();
          }}
          className="absolute top-3.5 right-3.5 p-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-red-500/40 hover:text-red-400 text-zinc-600 rounded-lg transition-all active:scale-95 shadow-md z-10"
          title="Resolve & Clear"
        >
          <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}

      <div className="flex flex-col items-center gap-1.5 shrink-0 select-none">
        <div className="w-12 h-12 rounded-[12px] bg-[#0c0c0c] border border-zinc-800 flex items-center justify-center text-white shrink-0">
          {icon}
        </div>
        <div className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-black tracking-widest text-center select-none ${
          is911
            ? 'bg-red-650 text-white font-black shadow-[0_0_8px_rgba(220,38,38,0.6)] border border-red-500' 
            : 'bg-zinc-800 text-zinc-500'
        }`}>
          911
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center pl-3.5 pr-3.5">
        <div className="text-lg font-black text-[#ffd000] tracking-wide uppercase leading-tight font-sans truncate" title={`${title} | ${incidentType}`}>
          {cleanTitleAndType(title, incidentType)}
        </div>

        <div className="text-sm font-extrabold text-white tracking-wider uppercase mt-1 leading-snug truncate font-sans">
          {division.toUpperCase()} <span className="text-zinc-700 font-normal mx-1">|</span> <span className="truncate" title={location}>{cleanAddressForDisplay(location).toUpperCase()}</span>
        </div>

        <div className="text-xs font-mono font-bold text-zinc-500 tracking-wider mt-1 leading-none uppercase">
          {serialId || 'MIT-XXXXXXXX'} <span className="text-zinc-700 font-normal mx-1">|</span> TIME: {timeStr}
        </div>
      </div>

      <div className="flex flex-col justify-center items-end shrink-0 pl-3 border-l border-zinc-900/60">
        <div className="flex flex-col justify-center gap-1.5">
          {assignedUnits.slice(0, 4).map((unit) => (
            <CanvaUnitBadge
              key={unit.id}
              name={unit.name}
              status={unit.status}
              size="small"
              onClick={onCycleUnitStatus ? () => onCycleUnitStatus(unit.id) : undefined}
            />
          ))}
          {assignedUnits.length === 0 && (
            <div className="text-[9px] text-zinc-600 font-extrabold font-mono text-center select-none uppercase tracking-wider py-4 w-[76px]">
              STANDBY
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// cleanAddressForDisplay
export const cleanAddressForDisplay = (addressStr: string): string => {
  if (!addressStr) return "";
  const unbracketed = addressStr.replace(/\[([^\]]+)\]/g, '$1');
  const parts = unbracketed.split(',').map(p => p.trim());
  const cleanedParts: string[] = [];
  
  const blacklist = [
    'SEATTLE', 'PORTLAND', 'VANCOUVER', 'SPOKANE', 'TACOMA', 'OLYMPIA', 'BELLEVUE', 'EVERETT', 'KENT', 'RENTON',
    'FEDERAL WAY', 'KING COUNTY', 'MULTNOMAH COUNTY', 'PIERCE COUNTY', 'SNOHOMISH COUNTY', 'WASHINGTON', 'OREGON',
    'WA', 'OR', 'UNITED STATES', 'USA', 'US', 'CANADA', 'BC', 'BRITISH COLUMBIA'
  ];

  for (const part of parts) {
    const upper = part.toUpperCase();
    if (blacklist.some(item => upper === item || upper.includes('COUNTY') || upper.includes(item))) {
      continue;
    }
    if (/^\d{5}(-\d{4})?$/.test(upper)) {
      continue;
    }
    cleanedParts.push(part);
  }

  let displayStr = cleanedParts.length > 0 ? cleanedParts.slice(0, 2).join(', ') : parts[0] || "";

  const abbreviations: [RegExp, string][] = [
    [/\bAVENUE\b/gi, 'AVE'], [/\bSTREET\b/gi, 'ST'], [/\bBOULEVARD\b/gi, 'BLVD'], [/\bPARKWAY\b/gi, 'PKWY'],
    [/\bCOURT\b/gi, 'CT'], [/\bPLACE\b/gi, 'PL'], [/\bROAD\b/gi, 'RD'], [/\bLANE\b/gi, 'LN'],
    [/\bDRIVE\b/gi, 'DR'], [/\bHIGHWAY\b/gi, 'HWY'], [/\bTERRACE\b/gi, 'TER'], [/\bSQUARE\b/gi, 'SQ'],
    [/\bWAY\b/gi, 'WY'], [/\bCIRCLE\b/gi, 'CIR'], [/\bCOVE\b/gi, 'CV'], [/\bTRAIL\b/gi, 'TRL'], [/\bPARK\b/gi, 'PK'],
    [/\bSOUTHWEST\b/gi, 'SW'], [/\bNORTHWEST\b/gi, 'NW'], [/\bSOUTHEAST\b/gi, 'SE'], [/\bNORTHEAST\b/gi, 'NE'],
    [/\bNORTH\b/gi, 'N'], [/\bSOUTH\b/gi, 'S'], [/\bEAST\b/gi, 'E'], [/\bWEST\b/gi, 'W']
  ];

  let result = displayStr;
  for (const [regex, replacement] of abbreviations) {
    result = result.replace(regex, replacement);
  }
  return result.trim();
};

// splitIgnoringBrackets
export function splitIgnoringBrackets(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let bracketDepth = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '[') {
      bracketDepth++;
    } else if (char === ']') {
      bracketDepth--;
    }
    
    if (bracketDepth === 0 && (char === '|' || char === '-')) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.filter(s => s !== '');
}

// cleanTitleAndType
export function cleanTitleAndType(title: string | undefined, type: string | undefined): string {
  const rawTitle = title || '';
  const rawType = type || '';
  
  const titleSegs = splitIgnoringBrackets(rawTitle);
  const typeSegs = splitIgnoringBrackets(rawType);
  
  let allSegs = [...titleSegs, ...typeSegs]
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
    
  allSegs = Array.from(new Set(allSegs));
  
  if (allSegs.length > 1) {
    allSegs = allSegs.filter(s => s !== 'GENERAL');
  }
  
  allSegs = allSegs.filter((seg, index) => {
    const isSubset = allSegs.some((otherSeg, otherIndex) => {
      if (index === otherIndex) return false;
      return otherSeg.includes(seg);
    });
    return !isSubset;
  });
  
  if (allSegs.length === 0) {
    return 'GENERAL';
  }
  
  return allSegs.join(' | ');
}

// getPTMilitaryTime
export function getPTMilitaryTime(dateInput?: Date | string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  return formatter.format(date).replace(':', '');
}

// formatChronologicalTimeline
export function formatChronologicalTimeline(text: string | undefined): string {
  if (!text) return "";
  const timestampRegex = /\[\s*(?:(\d{1,2})[-:]?(\d{2})\s*(AM|PM)?|(\d{4}))\s*\]/gi;
  const matches: { index: number; matchStr: string; hh: string; mm: string; ampm?: string }[] = [];
  let match;
  while ((match = timestampRegex.exec(text)) !== null) {
    if (match[4]) {
      matches.push({
        index: match.index,
        matchStr: match[0],
        hh: match[4].substring(0, 2),
        mm: match[4].substring(2, 4),
      });
    } else {
      matches.push({
        index: match.index,
        matchStr: match[0],
        hh: match[1],
        mm: match[2],
        ampm: match[3],
      });
    }
  }

  if (matches.length === 0) {
    return text.trim();
  }

  const entries: { time: string; content: string }[] = [];
  const firstSegment = text.substring(0, matches[0].index).trim();
  if (firstSegment) {
    entries.push({ time: "", content: firstSegment });
  }

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const segmentContent = text.substring(currentMatch.index + currentMatch.matchStr.length, nextIndex).trim();

    let h = parseInt(currentMatch.hh, 10);
    const m = currentMatch.mm;
    const ampm = currentMatch.ampm ? currentMatch.ampm.toUpperCase() : null;

    if (ampm) {
      if (ampm === "PM" && h < 12) {
        h += 12;
      } else if (ampm === "AM" && h === 12) {
        h = 0;
      }
    }

    const hStr = h.toString().padStart(2, '0');
    const time24 = `${hStr}${m}`;

    entries.push({
      time: time24,
      content: segmentContent
    });
  }

  return entries
    .map(entry => {
      if (!entry.time) {
        return entry.content;
      }
      let cleanContent = entry.content;
      if (cleanContent.startsWith('-')) {
        cleanContent = cleanContent.substring(1).trim();
      }
      if (cleanContent.startsWith('|')) {
        cleanContent = cleanContent.substring(1).trim();
      }
      return `${entry.time} - ${cleanContent}`;
    })
    .filter(Boolean)
    .join('\n');
}

// ---------------------------------------------------------
// CANVA DROPDOWN CUSTOMIZER (INLINE GEAR MODULE EDITOR)
// ---------------------------------------------------------
interface CanvaDropdownCustomizerProps {
  dropdownKey: keyof Dropdowns;
  label: string;
  categoryKey?: string; // Optional: used when editing incident types inside a specific categoryKey
  className?: string;
}

export const CanvaDropdownCustomizer: React.FC<CanvaDropdownCustomizerProps> = ({
  dropdownKey,
  label,
  categoryKey,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { dropdowns, saveDropdowns } = useDropdowns();
  const [localItems, setLocalDropdowns] = useState<Dropdowns | null>(null);
  const [newOption, setNewOption] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { isAdminMode } = useAdminEngine();

  useEffect(() => {
    if (dropdowns) {
      setLocalDropdowns({ ...dropdowns });
    }
  }, [dropdowns, isOpen]);

  if (!isAdminMode) {
    return null;
  }

  if (!isOpen || !localItems) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`p-1 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-500 rounded-md transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.2)] ${className}`}
        title={`Customize ${label} options`}
      >
        <Settings size={12} />
      </button>
    );
  }

  // Determine current options list
  let currentList: string[] = [];
  if (dropdownKey === 'alert_templates') {
    currentList = (localItems.alert_templates || []).map(t => t.name);
  } else if (dropdownKey !== 'mission_categories') {
    currentList = (localItems[dropdownKey] as string[]) || [];
  } else if (categoryKey) {
    // We are editing types within a specific mission category
    const cat = localItems.mission_categories.find(c => c.key === categoryKey);
    currentList = cat ? cat.types.map(t => t.label) : [];
  } else {
    // We are editing the categories themselves
    currentList = localItems.mission_categories.map(c => c.label);
  }

  const handleAdd = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;

    if (dropdownKey === 'alert_templates') {
      const arr = (localItems.alert_templates || []);
      if (arr.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) return;
      const newKey = `T-${Date.now()}`;
      const newTpl = {
        id: newKey,
        name: trimmed,
        subject: `LOGISTICS OPERATIONAL ALERT: ${trimmed.toUpperCase()}`,
        body: `ALERT DIRECTIVE: New message body for ${trimmed}. Update with active details in Rapid Console.`,
        type: 'SMS' as const
      };
      setLocalDropdowns({
        ...localItems,
        alert_templates: [...arr, newTpl]
      });
    } else if (dropdownKey !== 'mission_categories') {
      const arr = [...currentList];
      if (arr.includes(trimmed)) return;
      setLocalDropdowns({
        ...localItems,
        [dropdownKey]: [...arr, trimmed]
      });
    } else if (categoryKey) {
      // Add type
      const updatedCategories = localItems.mission_categories.map(cat => {
        if (cat.key === categoryKey) {
          if (cat.types.some(t => t.label.toLowerCase() === trimmed.toLowerCase())) return cat;
          const newKey = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          return {
            ...cat,
            types: [...cat.types, { key: newKey, label: trimmed }]
          };
        }
        return cat;
      });
      setLocalDropdowns({
        ...localItems,
        mission_categories: updatedCategories
      });
    } else {
      // Add category
      if (localItems.mission_categories.some(c => c.label.toLowerCase() === trimmed.toLowerCase())) return;
      const newKey = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const newCat: MissionCategory = {
        key: newKey,
        label: trimmed,
        tagColor: 'text-zinc-400 border-zinc-500/20 bg-zinc-500/5',
        dotColor: 'bg-zinc-400',
        types: []
      };
      setLocalDropdowns({
        ...localItems,
        mission_categories: [...localItems.mission_categories, newCat]
      });
    }
    setNewOption('');
  };

  const handleRemove = (index: number) => {
    if (dropdownKey === 'alert_templates') {
      const arr = (localItems.alert_templates || []).filter((_, idx) => idx !== index);
      setLocalDropdowns({
        ...localItems,
        alert_templates: arr
      });
    } else if (dropdownKey !== 'mission_categories') {
      const arr = currentList.filter((_, idx) => idx !== index);
      setLocalDropdowns({
        ...localItems,
        [dropdownKey]: arr
      });
    } else if (categoryKey) {
      // Remove type
      const updatedCategories = localItems.mission_categories.map(cat => {
        if (cat.key === categoryKey) {
          return {
            ...cat,
            types: cat.types.filter((_, idx) => idx !== index)
          };
        }
        return cat;
      });
      setLocalDropdowns({
        ...localItems,
        mission_categories: updatedCategories
      });
    } else {
      // Remove category
      const arr = localItems.mission_categories.filter((_, idx) => idx !== index);
      setLocalDropdowns({
        ...localItems,
        mission_categories: arr
      });
    }
  };

  const handlePublish = async () => {
    try {
      setIsSaving(true);
      await saveDropdowns(localItems);
      setIsOpen(false);
    } catch (err) {
      console.error('Error saving dropdown changes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setIsOpen(false)}>
      <div 
        className="glass-card w-full max-w-sm p-4 flex flex-col justify-between border border-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.15)] bg-[#08080a]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-3 select-none">
          <div className="flex items-center gap-2">
            <Settings className="text-amber-500" size={16} />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-100">
              Customize {label} Options
            </h3>
          </div>
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-200 rounded-md cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Existing elements pool */}
        <div className="flex flex-wrap gap-1.5 p-2.5 bg-zinc-950 border border-zinc-900/60 rounded-xl min-h-[70px] max-h-[160px] overflow-y-auto custom-scroll mb-3">
          {currentList.length === 0 ? (
            <div className="text-[10px] font-mono text-zinc-600 font-bold uppercase tracking-widest text-center w-full my-auto select-none">
              No options defined.
            </div>
          ) : (
            currentList.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md text-xs font-bold">
                <span>{opt}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-zinc-600 hover:text-rose-400 transition-all cursor-pointer inline-flex items-center"
                  title="Remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Input box */}
        <div className="flex gap-2 mb-4">
          <CanvaInput
            value={newOption}
            onChange={e => setNewOption(e.target.value)}
            placeholder={`Add new option...`}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            className="flex-1 text-xs"
          />
          <CanvaButton
            type="button"
            onClick={handleAdd}
            className="p-2 shrink-0"
          >
            <Plus size={16} />
          </CanvaButton>
        </div>

        {/* Action button row */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
          <CanvaButton
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="px-3 py-2 text-xs font-bold border-transparent hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 uppercase tracking-wider"
          >
            Cancel
          </CanvaButton>

          <CanvaButton
            type="button"
            variant="primary"
            onClick={handlePublish}
            disabled={isSaving}
            className="flex items-center gap-1.5 text-xs py-2 px-4 font-extrabold uppercase tracking-wider"
          >
            <Save size={14} />
            {isSaving ? 'Publishing...' : 'Publish'}
          </CanvaButton>
        </div>
      </div>
    </div>
  );
};
