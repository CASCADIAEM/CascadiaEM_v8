import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './Firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface SchemaField {
  fieldId: string;
  displayLabel: string;
  inputType: string;
  dataType: string;
  validation: string;
  apiPayloadKey: string;
  isUserDefined?: boolean;
  actionBinding?: {
    actionType: string;
    parameters: Record<string, any>;
  };
}

interface AdminEngineContextType {
  isAdminMode: boolean;
  setAdminMode: (active: boolean) => void;
  saveSchemaToCloud: (schemaName: string, fields: SchemaField[]) => Promise<void>;
  exportSchemaToCSV: (schemaName: string, fields: SchemaField[]) => void;
}

const AdminEngineContext = createContext<AdminEngineContextType | undefined>(undefined);

export const AdminEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminMode, setAdminMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cascadia_admin_mode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('cascadia_admin_mode', String(isAdminMode));
  }, [isAdminMode]);

  // Saves updated schema to Firestore for cloud deployment sync
  const saveSchemaToCloud = async (schemaName: string, fields: SchemaField[]) => {
    try {
      const docRef = doc(db, 'ui_schemas', schemaName);
      await setDoc(docRef, {
        fields,
        meta: {
          updatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      });
      console.log(`✅ [SUCCESS]: Schema "${schemaName}" successfully published to Firestore.`);
    } catch (err) {
      console.error('🚨 [CRITICAL]: Failed to save schema to cloud:', err);
    }
  };

  // Generates the updated CSV contents and triggers a local file download
  const exportSchemaToCSV = (schemaName: string, fields: SchemaField[]) => {
    const headers = 'Field ID (Technical),Display Label (UI),Input Component Type,Data Type,Validation / Requirements,API Payload Key';
    const rows = fields.map(field => {
      // Escape commas and wrap fields in quotes if necessary
      const escape = (val: string) => {
        const str = val || '';
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      return [
        escape(field.fieldId),
        escape(field.displayLabel),
        escape(field.inputType),
        escape(field.dataType),
        escape(field.validation),
        escape(field.apiPayloadKey)
      ].join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${schemaName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log(`📥 [EXPORT COMPLETE]: CSV for "${schemaName}" downloaded successfully.`);
  };

  return (
    <AdminEngineContext.Provider value={{
      isAdminMode,
      setAdminMode,
      saveSchemaToCloud,
      exportSchemaToCSV
    }}>
      {children}
    </AdminEngineContext.Provider>
  );
};

export const useAdminEngine = () => {
  const context = useContext(AdminEngineContext);
  if (!context) {
    throw new Error('useAdminEngine must be used within an AdminEngineProvider');
  }
  return context;
};
