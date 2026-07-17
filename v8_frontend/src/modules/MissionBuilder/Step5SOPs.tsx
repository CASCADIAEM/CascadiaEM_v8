import React from 'react';
import { Sparkles, Check, Trash2, Plus } from 'lucide-react';

interface Step5SOPsProps {
  activeClassData: {
    title: string;
    defaultSop: string[];
  };
  objectives: string[];
  newObjective: string;
  setNewObjective: (val: string) => void;
  handleAddObjective: () => void;
  handleRemoveObjective: (idx: number) => void;
}

export const Step5SOPs: React.FC<Step5SOPsProps> = ({
  activeClassData,
  objectives,
  newObjective,
  setNewObjective,
  handleAddObjective,
  handleRemoveObjective
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
        <Sparkles size={18} className="text-amber-500" />
        <h2 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide">STEP 5: Tactical SOPs & SMART Objectives</h2>
      </div>

      {/* SOP checklist reference */}
      <div className="bg-zinc-950/45 border border-zinc-900 p-4 rounded-xl space-y-2.5">
        <div className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest block">
          CLASSIFICATION STANDARDIZED SOP CHECKLIST
        </div>
        <ul className="text-xs space-y-1.5 font-bold text-zinc-300">
          {activeClassData.defaultSop.map((sop, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span>{sop}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Active objectives roster list */}
      <div className="space-y-2">
        <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">Incident Operational Objectives</label>
        <div className="space-y-2">
          {objectives.map((obj, idx) => (
            <div key={idx} className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg flex items-center justify-between gap-3 text-xs font-bold text-zinc-300">
              <span className="leading-normal">{idx + 1}. {obj}</span>
              <button 
                onClick={() => handleRemoveObjective(idx)}
                className="p-1 hover:bg-red-500/10 hover:text-red-500 text-zinc-600 rounded transition-all active:scale-95 cursor-pointer shrink-0"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Objective Input Form */}
        <div className="flex items-center gap-2 pt-1">
          <input 
            type="text" 
            value={newObjective} 
            onChange={e => setNewObjective(e.target.value)} 
            placeholder="Enter custom incident objective..." 
            className="eoc-input flex-1"
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddObjective();
            }}
          />
          <button 
            onClick={handleAddObjective} 
            className="eoc-button-primary px-3 py-3 rounded-lg shrink-0"
            title="Add Objective"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
