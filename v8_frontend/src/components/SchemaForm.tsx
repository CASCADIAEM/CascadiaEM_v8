import React, { useState, useEffect } from 'react';
import { fetchFieldSchema, fetchDropdownLookups } from '../services/SchemaService';
import type { SchemaField, DropdownLookup } from '../services/SchemaService';
import { useAdminEngine } from '../services/AdminEngineService';
import { CanvaGlassPanel, CanvaFormRow, CanvaInput, CanvaSelect, CanvaTextarea, CanvaButton } from './DesignSandbox';
import { Trash2, Edit2, Download, Cloud, X, Plus } from 'lucide-react';

interface SchemaFormProps {
  schemaName: string;
  bannerText: string;
  submitLabel?: string;
  onSubmit: (data: Record<string, any>) => void;
  onDataChange?: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
}

export const SchemaForm: React.FC<SchemaFormProps> = ({
  schemaName,
  bannerText,
  submitLabel = 'Submit',
  onSubmit,
  onDataChange,
  initialData = {}
}) => {
  const { isAdminMode, saveSchemaToCloud, exportSchemaToCSV } = useAdminEngine();
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [lookups, setLookups] = useState<DropdownLookup[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [loading, setLoading] = useState(true);

  // Editor Modal states
  const [editingField, setEditingField] = useState<SchemaField | null>(null);
  const [isAddingField, setIsAddingField] = useState<boolean>(false);
  const [editorModalOpen, setEditorModalOpen] = useState<boolean>(false);

  // Field attributes for the form editor popup
  const [editId, setEditId] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editType, setEditType] = useState('text_input');
  const [editDataType, setEditDataType] = useState('string');
  const [editValidation, setEditValidation] = useState('');
  const [editPayloadKey, setEditPayloadKey] = useState('');

  useEffect(() => {
    const loadSchema = async () => {
      setLoading(true);
      const fetchedFields = await fetchFieldSchema(schemaName);
      const fetchedLookups = await fetchDropdownLookups();
      setFields(fetchedFields);
      setLookups(fetchedLookups);
      
      // Initialize form fields with defaults from validation or initialData
      const defaults: Record<string, any> = { ...initialData };
      fetchedFields.forEach(field => {
        if (defaults[field.fieldId] === undefined) {
          const isHidden = field.inputType.toLowerCase().includes('hidden');
          const requirementStr = field.validation || '';
          if (isHidden && requirementStr.includes('Defaults to')) {
            const match = requirementStr.match(/Defaults to\s+([a-zA-Z0-9_]+)/);
            defaults[field.fieldId] = match ? match[1] : '';
          } else {
            defaults[field.fieldId] = '';
          }
        }
      });
      setFormData(defaults);
      setLoading(false);
    };
    loadSchema();
  }, [schemaName]);

  // Notify parent component of data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange(formData);
    }
  }, [formData]);

  const handleChange = (fieldId: string, val: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: val
    }));
  };

  /**
   * Helper to parse and evaluate visibility rules (e.g. "incident_type == wildfire")
   */
  const evaluateCondition = (conditionStr: string): boolean => {
    const cond = conditionStr.trim();
    if (!cond || cond === 'Always Visible') return true;

    // Matches standard "field_id == value" pattern
    const match = cond.match(/^([a-zA-Z0-9_]+)\s*==\s*([a-zA-Z0-9_]+)$/);
    if (!match) return true;

    const sourceField = match[1];
    const targetValue = match[2];

    return String(formData[sourceField]) === String(targetValue);
  };

  /**
   * Translates nomenclature headers dynamically based on form state
   */
  const getDynamicLabel = (field: SchemaField): string => {
    const label = field.displayLabel;
    if (field.fieldId === 'impact_area') {
      if (formData.incident_type === 'wildfire') return '🔥 ACRES BURNED';
      if (formData.incident_type === 'earthquake') return '🗺️ EPICENTER IMPACT ZONE';
      if (formData.incident_type === 'flood') return '🌊 INUNDATION ZONE (SQ MILES)';
    }
    return label;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Opens the inline editor to modify an existing field
  const startEditField = (field: SchemaField) => {
    setEditingField(field);
    setIsAddingField(false);
    setEditId(field.fieldId);
    setEditLabel(field.displayLabel);
    setEditType(field.inputType);
    setEditDataType(field.dataType);
    setEditValidation(field.validation);
    setEditPayloadKey(field.apiPayloadKey);
    setEditorModalOpen(true);
  };

  // Opens the inline editor to add a brand-new field
  const startAddField = (type: 'text_input' | 'action_button') => {
    setEditingField(null);
    setIsAddingField(true);
    setEditId(`custom_field_${Date.now().toString().slice(-6)}`);
    setEditLabel(type === 'action_button' ? 'NEW ACTION BUTTON' : 'NEW CUSTOM FIELD');
    setEditType(type);
    setEditDataType(type === 'action_button' ? 'button' : 'string');
    setEditValidation('');
    setEditPayloadKey(type === 'action_button' ? 'button_trigger' : `custom_attributes.field_${Date.now().toString().slice(-4)}`);
    setEditorModalOpen(true);
  };

  // Saves modifications to local state
  const saveFieldConfig = () => {
    if (!editId.trim() || !editLabel.trim()) return;

    const newField: SchemaField = {
      fieldId: editId,
      displayLabel: editLabel,
      inputType: editType,
      dataType: editDataType,
      validation: editValidation,
      apiPayloadKey: editPayloadKey,
      isUserDefined: isAddingField || editingField?.isUserDefined
    };

    if (isAddingField) {
      setFields(prev => [...prev, newField]);
    } else {
      setFields(prev => prev.map(f => f.fieldId === editingField?.fieldId ? newField : f));
    }
    setEditorModalOpen(false);
  };

  // Deletes a custom field from local schema
  const deleteField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.fieldId !== fieldId));
    setEditorModalOpen(false);
  };

  const handleLowCodeButtonClick = (field: SchemaField) => {
    alert(`⚡ [LOW-CODE DISPATCH]: Triggered event for action: ${field.displayLabel}.\nParameters: ${field.validation || 'Default'}`);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">
        Syncing Metadata Schema...
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full relative">
      <CanvaGlassPanel 
        bannerText={bannerText} 
        highlight={isAdminMode ? "amber-heavy" : "yellow"} 
        className="w-full relative overflow-visible"
      >
        {/* Admin Sync Action Bar */}
        {isAdminMode && (
          <div className="absolute top-2.5 right-6 flex items-center gap-2 z-10 scale-90">
            <button
              onClick={() => exportSchemaToCSV(schemaName, fields)}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] font-mono font-black text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-1 cursor-pointer"
              title="Download updated spreadsheet file"
            >
              <Download size={11} />
              EXPORT CSV
            </button>
            <button
              onClick={() => saveSchemaToCloud(schemaName, fields)}
              className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-[9px] font-mono font-black text-amber-500 hover:bg-amber-500/20 flex items-center gap-1 cursor-pointer"
              title="Publish layout config to central Firestore"
            >
              <Cloud size={11} />
              PUBLISH CLOUD
            </button>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto custom-scroll pr-1.5 py-1">
            {fields.map(field => {
              const inputTypeLower = field.inputType.toLowerCase();
              if (inputTypeLower.includes('hidden')) return null;

              const isVisible = evaluateCondition(field.validation);
              if (!isVisible && !isAdminMode) return null;

              const fieldLabel = getDynamicLabel(field);
              const isDropdown = inputTypeLower.includes('dropdown') || inputTypeLower.includes('selector');
              const isTextarea = inputTypeLower.includes('textarea') || inputTypeLower.includes('notes');
              const isNumber = inputTypeLower.includes('number') || inputTypeLower.includes('integer');
              const isPassword = inputTypeLower.includes('password') || inputTypeLower.includes('pin');
              const isDatetime = inputTypeLower.includes('datetime') || inputTypeLower.includes('date');
              const isToggle = inputTypeLower.includes('toggle') || inputTypeLower.includes('multi-select') || inputTypeLower.includes('segmented');
              const isActionButton = inputTypeLower.includes('button');

              return (
                <div key={field.fieldId} className={`relative group/row ${!isVisible && isAdminMode ? 'opacity-40 border border-dashed border-zinc-800 p-1.5 rounded-lg' : ''}`}>
                  
                  {/* Admin Individual Component Edit Buttons */}
                  {isAdminMode && (
                    <div className="absolute top-1 right-2 flex items-center gap-1 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity bg-zinc-950/80 px-1 py-0.5 rounded border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => startEditField(field)}
                        className="p-1 text-amber-500 hover:text-amber-400 cursor-pointer"
                        title="Edit properties"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteField(field.fieldId)}
                        className="p-1 text-red-500 hover:text-red-400 cursor-pointer"
                        title="Remove field"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}

                  <CanvaFormRow
                    label={fieldLabel}
                    className={isTextarea || isToggle || isActionButton ? 'col-span-1 md:col-span-2' : ''}
                  >
                    {isDropdown && (
                      <CanvaSelect
                        value={formData[field.fieldId] || ''}
                        onChange={e => handleChange(field.fieldId, e.target.value)}
                      >
                        <option value="" disabled className="text-zinc-600">-- SELECT OPTION --</option>
                        {lookups
                          .filter(item => item.dropdownId === field.fieldId)
                          .map(opt => (
                            <option key={opt.optionValue} value={opt.optionValue} className="bg-zinc-950 text-white">
                              {opt.displayText}
                            </option>
                          ))}
                      </CanvaSelect>
                    )}

                    {isTextarea && (
                      <CanvaTextarea
                        value={formData[field.fieldId] || ''}
                        onChange={e => handleChange(field.fieldId, e.target.value)}
                        placeholder={`Enter additional notes...`}
                        rows={3}
                      />
                    )}

                    {isNumber && (
                      <CanvaInput
                        type="number"
                        value={formData[field.fieldId] || ''}
                        onChange={e => handleChange(field.fieldId, e.target.value)}
                        placeholder="0"
                      />
                    )}

                    {isPassword && (
                      <CanvaInput
                        type="password"
                        value={formData[field.fieldId] || ''}
                        onChange={e => handleChange(field.fieldId, e.target.value)}
                        placeholder="••••"
                      />
                    )}

                    {isDatetime && (
                      <CanvaInput
                        type="datetime-local"
                        value={formData[field.fieldId] || ''}
                        onChange={e => handleChange(field.fieldId, e.target.value)}
                      />
                    )}

                    {isToggle && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {getToggleOptionsForField(field.fieldId).map(opt => {
                          const currentVal = formData[field.fieldId];
                          const isSelected = Array.isArray(currentVal) 
                            ? currentVal.includes(opt.value)
                            : currentVal === opt.value;

                          const handleToggleClick = () => {
                            if (inputTypeLower.includes('multi-select') || Array.isArray(currentVal)) {
                              const activeArr = Array.isArray(currentVal) ? currentVal : [];
                              if (activeArr.includes(opt.value)) {
                                handleChange(field.fieldId, activeArr.filter((v: any) => v !== opt.value));
                              } else {
                                handleChange(field.fieldId, [...activeArr, opt.value]);
                              }
                            } else {
                              handleChange(field.fieldId, isSelected ? '' : opt.value);
                            }
                          };

                          return (
                            <CanvaButton
                              key={opt.value}
                              type="button"
                              variant={isSelected ? 'primary' : 'secondary'}
                              onClick={handleToggleClick}
                              className="px-4 py-2 text-xs font-bold uppercase tracking-wider"
                            >
                              {opt.label}
                            </CanvaButton>
                          );
                        })}
                      </div>
                    )}

                    {isActionButton && (
                      <CanvaButton
                        type="button"
                        variant="primary"
                        onClick={() => handleLowCodeButtonClick(field)}
                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 font-black uppercase tracking-widest text-[11px] shadow-[0_0_15px_rgba(239,68,68,0.15)] flex items-center justify-center gap-2 rounded-xl"
                      >
                        {fieldLabel}
                      </CanvaButton>
                    )}

                    {!isDropdown && !isTextarea && !isNumber && !isPassword && !isDatetime && !isToggle && !isActionButton && (
                      <CanvaInput
                        type="text"
                        value={formData[field.fieldId] || ''}
                        onChange={e => handleChange(field.fieldId, e.target.value)}
                        placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                      />
                    )}
                  </CanvaFormRow>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-zinc-900/60 flex items-center justify-between">
            {/* Admin Add Buttons Row */}
            {isAdminMode ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startAddField('text_input')}
                  className="px-3 py-1.5 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-amber-500 hover:text-amber-400 rounded-lg text-[10px] font-mono font-black uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={11} />
                  ADD FIELD
                </button>
                <button
                  type="button"
                  onClick={() => startAddField('action_button')}
                  className="px-3 py-1.5 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-red-500 hover:text-red-400 rounded-lg text-[10px] font-mono font-black uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={11} />
                  ADD ACTION BUTTON
                </button>
              </div>
            ) : (
              <div />
            )}

            <CanvaButton type="submit" variant="primary" className="px-6 py-2.5 font-black uppercase tracking-widest text-xs">
              {submitLabel}
            </CanvaButton>
          </div>
        </form>
      </CanvaGlassPanel>

      {/* MODAL OVERLAY: ADMIN ELEMENT BUILDER PANEL */}
      {editorModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setEditorModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1">
              <div className="text-[10px] font-extrabold uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Element Editor Panel</span>
              </div>
              <h3 className="text-sm font-black uppercase text-zinc-100 tracking-wide font-sans">
                {isAddingField ? 'CREATE DYNAMIC LAYOUT ELEMENT' : 'MODIFY ELEMENT PROPERTIES'}
              </h3>
            </div>

            <div className="space-y-3 pt-2">
              <CanvaFormRow label="Field Display Label (UI)">
                <CanvaInput
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="e.g. EVACUATION ROUTE"
                />
              </CanvaFormRow>

              <CanvaFormRow label="Internal Field ID (Database Key)">
                <CanvaInput
                  value={editId}
                  onChange={e => setEditId(e.target.value)}
                  placeholder="e.g. custom_field_route"
                  disabled={!isAddingField}
                />
              </CanvaFormRow>

              <CanvaFormRow label="Component Input Type">
                <CanvaSelect
                  value={editType}
                  onChange={e => {
                    setEditType(e.target.value);
                    if (e.target.value === 'action_button') {
                      setEditDataType('button');
                    } else if (e.target.value === 'number') {
                      setEditDataType('number');
                    } else {
                      setEditDataType('string');
                    }
                  }}
                >
                  <option value="text_input" className="bg-zinc-950">Standard Text Box</option>
                  <option value="textarea" className="bg-zinc-950">Large Paragraph Area</option>
                  <option value="dropdown" className="bg-zinc-950">Dropdown List Selector</option>
                  <option value="number" className="bg-zinc-950">Numeric Entry</option>
                  <option value="datetime" className="bg-zinc-950">Date / Time Picker</option>
                  <option value="action_button" className="bg-zinc-950">⚡ Action Button (Low-Code)</option>
                </CanvaSelect>
              </CanvaFormRow>

              <CanvaFormRow label={editType === 'action_button' ? 'Action / Behavior Map' : 'Validation / Visibility Condition'}>
                <CanvaInput
                  value={editValidation}
                  onChange={e => setEditValidation(e.target.value)}
                  placeholder={editType === 'action_button' ? 'e.g. ACTION_DISPATCH_ALERT' : 'e.g. Always Visible'}
                />
              </CanvaFormRow>
            </div>

            <div className="pt-4 border-t border-zinc-900 flex justify-end gap-2">
              <button
                onClick={() => setEditorModalOpen(false)}
                className="px-4 py-2 border border-zinc-800 rounded-xl text-[10px] font-mono font-black uppercase text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveFieldConfig}
                className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-500 rounded-xl text-[10px] font-mono font-black uppercase cursor-pointer"
              >
                Save Element
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getToggleOptionsForField(fieldId: string): Array<{ value: string; label: string }> {
  if (fieldId === 'transmission_channels') {
    return [
      { value: 'SMS', label: '📟 SMS Pager' },
      { value: 'EMAIL', label: '📧 HTML Email' },
      { value: 'VOICE', label: '📞 Voice Line' }
    ];
  }
  if (fieldId === 'dispatch_mode') {
    return [
      { value: 'IMMEDIATE', label: '⚡ IMMEDIATE DISPATCH' },
      { value: 'SCHEDULED', label: '📅 SCHEDULED ALERT' }
    ];
  }
  if (fieldId === 'twilio_sim_mode' || fieldId === 'email_dispatch_gate') {
    return [
      { value: 'TRUE', label: '🟢 ENABLED / ACTIVE' },
      { value: 'FALSE', label: '🔴 BYPASS / INACTIVE' }
    ];
  }
  return [
    { value: 'true', label: 'YES' },
    { value: 'false', label: 'NO' }
  ];
}
