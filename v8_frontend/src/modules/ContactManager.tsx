import React, { useState, useEffect } from 'react';
import { dataBus } from '../services/DataBus';
import { useDropdowns } from '../services/DropdownService';
import {
  Download,
  Upload,
  Plus,
  Trash2,
  Search,
  Edit2,
  User,
  Briefcase,
  Bell,
  PhoneCall,
  DollarSign,
  X,
  Check,
  MapPin
} from 'lucide-react';
import {
  CanvaGlassPanel,
  CanvaButton,
  CanvaInput,
  CanvaSelect,
  CanvaFormRow,
  CanvaDropdownCustomizer
} from '../components/DesignSandbox';

// ==========================================
// 1. NESTED MASTER CONTACT SCHEMA INTERFACES
// ==========================================

export interface ContactInfo {
  name: string;
  role: string;
  esf: string;
  workAddress: string;
  useWorkAddressForGeofencing: boolean;
  homeAddress: string;
  phoneWork: string;
  phoneWorkCell: string;
  phoneHome: string;
  phonePersonalCell: string;
  emailWork: string;
  emailPersonal: string;
}

export interface AlertingSettings {
  optInStatus: boolean;
  groupA: boolean;
  groupB: boolean;
  groupC: boolean;
  alertEmergency: boolean;
  alertAdmin: boolean;
  alertErtEsf: boolean;
  alertTest: boolean;
}

export interface ProfessionalProfile {
  titleRank: string;
  certifications: string;
  associations: string;
  callSign: string;
  agencyId: string;
  isEmergencyWorker: boolean;
  esfPosition: string;
  isVolunteer: boolean;
  isContractor: boolean;
  hourlyRate: number;
  cbaUnitClassification: string;
}

export interface EmergencyContact {
  contactName: string;
  address: string;
  phonePrimary: string;
  phoneAlternate: string;
  email: string;
}

export interface Contact {
  id: string;
  name: string; // Synced with contactInfo.name for quick lists/lookups
  role: string; // Synced with contactInfo.role
  esf: string;  // Synced with contactInfo.esf
  status: 'ACTIVE' | 'STANDBY' | 'INACTIVE';
  contactInfo: ContactInfo;
  alerting: AlertingSettings;
  professionalProfile: ProfessionalProfile;
  emergencyContact: EmergencyContact;
}

// ==========================================
// 2. DATA MIGRATION & DEFAULTS BUILDER
// ==========================================

export const migrateLegacyContact = (raw: any): Contact => {
  const hasNestedInfo = raw.contactInfo && typeof raw.contactInfo === 'object';
  const id = raw.id || `CON-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const status = raw.status || 'ACTIVE';

  if (hasNestedInfo) {
    return {
      id,
      name: raw.name || raw.contactInfo.name || '',
      role: raw.role || raw.contactInfo.role || '',
      esf: raw.esf || raw.contactInfo.esf || 'ESF-5 (Emergency Management)',
      status,
      contactInfo: {
        name: raw.name || raw.contactInfo.name || '',
        role: raw.role || raw.contactInfo.role || '',
        esf: raw.esf || raw.contactInfo.esf || 'ESF-5 (Emergency Management)',
        workAddress: raw.contactInfo.workAddress || '',
        useWorkAddressForGeofencing: !!raw.contactInfo.useWorkAddressForGeofencing,
        homeAddress: raw.contactInfo.homeAddress || '',
        phoneWork: raw.contactInfo.phoneWork || '',
        phoneWorkCell: raw.contactInfo.phoneWorkCell || '',
        phoneHome: raw.contactInfo.phoneHome || '',
        phonePersonalCell: raw.contactInfo.phonePersonalCell || raw.phone || '',
        emailWork: raw.contactInfo.emailWork || raw.email || '',
        emailPersonal: raw.contactInfo.emailPersonal || ''
      },
      alerting: {
        optInStatus: raw.alerting?.optInStatus !== false,
        groupA: !!raw.alerting?.groupA,
        groupB: !!raw.alerting?.groupB,
        groupC: !!raw.alerting?.groupC,
        alertEmergency: raw.alerting?.alertEmergency !== false,
        alertAdmin: !!raw.alerting?.alertAdmin,
        alertErtEsf: raw.alerting?.alertErtEsf !== false,
        alertTest: !!raw.alerting?.alertTest
      },
      professionalProfile: {
        titleRank: raw.professionalProfile?.titleRank || '',
        certifications: raw.professionalProfile?.certifications || '',
        associations: raw.professionalProfile?.associations || '',
        callSign: raw.professionalProfile?.callSign || '',
        agencyId: raw.professionalProfile?.agencyId || '',
        isEmergencyWorker: !!raw.professionalProfile?.isEmergencyWorker,
        esfPosition: raw.professionalProfile?.esfPosition || '',
        isVolunteer: !!raw.professionalProfile?.isVolunteer,
        isContractor: !!raw.professionalProfile?.isContractor,
        hourlyRate: Number(raw.professionalProfile?.hourlyRate) || 0,
        cbaUnitClassification: raw.professionalProfile?.cbaUnitClassification || ''
      },
      emergencyContact: {
        contactName: raw.emergencyContact?.contactName || '',
        address: raw.emergencyContact?.address || '',
        phonePrimary: raw.emergencyContact?.phonePrimary || '',
        phoneAlternate: raw.emergencyContact?.phoneAlternate || '',
        email: raw.emergencyContact?.email || ''
      }
    };
  }

  // Handle older, flat format
  const name = raw.name || '';
  const role = raw.role || '';
  const esf = raw.esf || 'ESF-5 (Emergency Management)';
  const phone = raw.phone || '';
  const email = raw.email || '';

  return {
    id,
    name,
    role,
    esf,
    status,
    contactInfo: {
      name,
      role,
      esf,
      workAddress: '',
      useWorkAddressForGeofencing: false,
      homeAddress: '',
      phoneWork: '',
      phoneWorkCell: '',
      phoneHome: '',
      phonePersonalCell: phone,
      emailWork: email,
      emailPersonal: ''
    },
    alerting: {
      optInStatus: true,
      groupA: false,
      groupB: false,
      groupC: false,
      alertEmergency: true,
      alertAdmin: false,
      alertErtEsf: true,
      alertTest: false
    },
    professionalProfile: {
      titleRank: role,
      certifications: '',
      associations: '',
      callSign: '',
      agencyId: '',
      isEmergencyWorker: true,
      esfPosition: role,
      isVolunteer: false,
      isContractor: false,
      hourlyRate: 0,
      cbaUnitClassification: ''
    },
    emergencyContact: {
      contactName: '',
      address: '',
      phonePrimary: '',
      phoneAlternate: '',
      email: ''
    }
  };
};

const createEmptyContact = (): Contact => ({
  id: '',
  name: '',
  role: '',
  esf: 'ESF-5 (Emergency Management)',
  status: 'ACTIVE',
  contactInfo: {
    name: '',
    role: '',
    esf: 'ESF-5 (Emergency Management)',
    workAddress: '',
    useWorkAddressForGeofencing: false,
    homeAddress: '',
    phoneWork: '',
    phoneWorkCell: '',
    phoneHome: '',
    phonePersonalCell: '',
    emailWork: '',
    emailPersonal: ''
  },
  alerting: {
    optInStatus: true,
    groupA: false,
    groupB: false,
    groupC: false,
    alertEmergency: true,
    alertAdmin: false,
    alertErtEsf: true,
    alertTest: false
  },
  professionalProfile: {
    titleRank: '',
    certifications: '',
    associations: '',
    callSign: '',
    agencyId: '',
    isEmergencyWorker: true,
    esfPosition: '',
    isVolunteer: false,
    isContractor: false,
    hourlyRate: 0,
    cbaUnitClassification: ''
  },
  emergencyContact: {
    contactName: '',
    address: '',
    phonePrimary: '',
    phoneAlternate: '',
    email: ''
  }
});

// ==========================================
// 3. INITIAL RICH MASTER ROSTER
// ==========================================

const INITIAL_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Michael Fearnehough',
    role: 'Watch Center Lead',
    esf: 'ESF-5 (Emergency Management)',
    status: 'ACTIVE',
    contactInfo: {
      name: 'Michael Fearnehough',
      role: 'Watch Center Lead',
      esf: 'ESF-5 (Emergency Management)',
      workAddress: 'Cascadia HQ, Seattle WA',
      useWorkAddressForGeofencing: true,
      homeAddress: 'Seattle, WA',
      phoneWork: '(206) 786-5300',
      phoneWorkCell: '(206) 786-5300',
      phoneHome: '',
      phonePersonalCell: '(206) 786-5300',
      emailWork: 'watchcenter@cascadia-em.com',
      emailPersonal: 'michael.b.fearnehough@gmail.com'
    },
    alerting: {
      optInStatus: true,
      groupA: true,
      groupB: true,
      groupC: false,
      alertEmergency: true,
      alertAdmin: true,
      alertErtEsf: true,
      alertTest: true
    },
    professionalProfile: {
      titleRank: 'Watch Lead',
      certifications: 'FEMA ICS-400, CEM, GIS Specialist',
      associations: 'IAEM, NEMA',
      callSign: 'CASCADIA-1',
      agencyId: 'CEM-01',
      isEmergencyWorker: true,
      esfPosition: 'Watch Lead',
      isVolunteer: false,
      isContractor: false,
      hourlyRate: 125,
      cbaUnitClassification: 'Management'
    },
    emergencyContact: {
      contactName: 'Jane Fearnehough',
      address: 'Seattle, WA',
      phonePrimary: '(206) 555-9011',
      phoneAlternate: '',
      email: 'jane.f@gmail.com'
    }
  },
  {
    id: '2',
    name: 'Lisa Jackson',
    role: 'Logistics Supervisor',
    esf: 'ESF-7 (Resources & Logistics)',
    status: 'ACTIVE',
    contactInfo: {
      name: 'Lisa Jackson',
      role: 'Logistics Supervisor',
      esf: 'ESF-7 (Resources & Logistics)',
      workAddress: 'Logistics Depot 2, Tacoma WA',
      useWorkAddressForGeofencing: false,
      homeAddress: 'Tacoma, WA',
      phoneWork: '(253) 555-0144',
      phoneWorkCell: '(253) 555-0145',
      phoneHome: '',
      phonePersonalCell: '(206) 555-0144',
      emailWork: 'lisa.j@cascadia-em.com',
      emailPersonal: 'lisa.jackson.personal@gmail.com'
    },
    alerting: {
      optInStatus: true,
      groupA: true,
      groupB: false,
      groupC: true,
      alertEmergency: true,
      alertAdmin: false,
      alertErtEsf: true,
      alertTest: true
    },
    professionalProfile: {
      titleRank: 'Logistics Chief',
      certifications: 'FEMA ICS-300, Logistics Expert',
      associations: 'APICS',
      callSign: 'CASCADIA-2',
      agencyId: 'CEM-08',
      isEmergencyWorker: true,
      esfPosition: 'Logistics Sup',
      isVolunteer: false,
      isContractor: true,
      hourlyRate: 95,
      cbaUnitClassification: 'Contractor Unit 2'
    },
    emergencyContact: {
      contactName: 'David Miller',
      address: 'Tacoma, WA',
      phonePrimary: '(253) 555-0190',
      phoneAlternate: '',
      email: 'd.miller@gmail.com'
    }
  },
  {
    id: '3',
    name: 'Tom Smith',
    role: 'Facilities Coordinator',
    esf: 'ESF-6 (Mass Care & Shelter)',
    status: 'STANDBY',
    contactInfo: {
      name: 'Tom Smith',
      role: 'Facilities Coordinator',
      esf: 'ESF-6 (Mass Care & Shelter)',
      workAddress: 'Shelter Hub A, Everett WA',
      useWorkAddressForGeofencing: true,
      homeAddress: 'Everett, WA',
      phoneWork: '(425) 555-0199',
      phoneWorkCell: '(425) 555-0188',
      phoneHome: '(425) 555-0211',
      phonePersonalCell: '(425) 555-0199',
      emailWork: 'tom.smith@cascadia-em.com',
      emailPersonal: 'tsmith101@hotmail.com'
    },
    alerting: {
      optInStatus: true,
      groupA: false,
      groupB: true,
      groupC: true,
      alertEmergency: true,
      alertAdmin: false,
      alertErtEsf: true,
      alertTest: false
    },
    professionalProfile: {
      titleRank: 'Facilities Coordinator',
      certifications: 'Red Cross Shelter Lead, CPR/First Aid',
      associations: 'Volunteer Corps',
      callSign: 'CASCADIA-3',
      agencyId: 'CEM-VOL-24',
      isEmergencyWorker: true,
      esfPosition: 'Shelter Manager',
      isVolunteer: true,
      isContractor: false,
      hourlyRate: 0,
      cbaUnitClassification: 'Volunteer'
    },
    emergencyContact: {
      contactName: 'Mary Smith',
      address: 'Everett, WA',
      phonePrimary: '(425) 555-0222',
      phoneAlternate: '',
      email: 'mary.smith@hotmail.com'
    }
  }
];

// ==========================================
// 4. MAIN COMPONENT
// ==========================================

const ContactManager: React.FC = () => {
  const { dropdowns } = useDropdowns();
  // Safe cached ingestion with auto-migration
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const cached = dataBus.getCache<Contact[]>('contacts_list');
    if (cached && Array.isArray(cached)) {
      return cached.map(migrateLegacyContact);
    }
    return INITIAL_CONTACTS;
  });

  useEffect(() => {
    dataBus.setCache('contacts_list', contacts);
  }, [contacts]);

  useEffect(() => {
    const unsubscribe = dataBus.subscribe((packet) => {
      if (
        packet.type === 'SYSTEM' &&
        packet.payload?.entity === 'contacts_list' &&
        packet.payload?.action === 'update'
      ) {
        const updated = dataBus.getCache<Contact[]>('contacts_list');
        if (updated && Array.isArray(updated)) {
          setContacts((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(updated)) {
              return prev;
            }
            return updated.map(migrateLegacyContact);
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const [search, setSearch] = useState('');

  // Drawer / Slider Panel State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentContact, setCurrentContact] = useState<Contact>(createEmptyContact());
  const [activeTab, setActiveTab] = useState<'info' | 'professional' | 'alerting' | 'emergency'>('info');
  const [isEditing, setIsEditing] = useState(false);

  // Helper nested state updates to maintain strict structural hygiene
  const updateField = (
    section: 'contactInfo' | 'alerting' | 'professionalProfile' | 'emergencyContact' | null,
    field: string,
    value: any
  ) => {
    if (!section) {
      setCurrentContact(prev => {
        const updated = { ...prev, [field]: value };
        // Sync redundant core tags to prevent structural mismatches
        if (field === 'name') updated.contactInfo.name = value;
        if (field === 'role') updated.contactInfo.role = value;
        if (field === 'esf') updated.contactInfo.esf = value;
        return updated;
      });
    } else {
      setCurrentContact(prev => {
        const updatedSection = { ...prev[section], [field]: value };
        const updated = { ...prev, [section]: updatedSection };
        // Keep root values in step with section edits
        if (section === 'contactInfo') {
          if (field === 'name') updated.name = value;
          if (field === 'role') updated.role = value;
          if (field === 'esf') updated.esf = value;
        }
        return updated;
      });
    }
  };

  // Submit Form - Add/Save Responder
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContact.name) return;

    // Standardized validation and final payload preparation
    const savedContact: Contact = {
      ...currentContact,
      name: currentContact.name.trim(),
      role: currentContact.role.trim(),
      esf: currentContact.esf
    };

    if (isEditing) {
      // Modify active registry item
      setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
      dataBus.broadcast({
        type: 'SYSTEM',
        origin: 'CONTACT MANAGER',
        payload: { message: `Updated responder profile: ${savedContact.name} (${savedContact.esf})` },
        severity: 'low'
      });
    } else {
      // Register a brand new master contact record
      const newContact: Contact = {
        ...savedContact,
        id: `CON-${Date.now()}`
      };
      setContacts([newContact, ...contacts]);
      dataBus.broadcast({
        type: 'SYSTEM',
        origin: 'CONTACT MANAGER',
        payload: { message: `Registered new responder: ${newContact.name} (${newContact.esf})` },
        severity: 'low'
      });
    }

    setDrawerOpen(false);
  };

  // Remove Contact
  const handleDeleteContact = (id: string, contactName: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'CONTACT MANAGER',
      payload: { message: `Responder directory record removed: ${contactName}` },
      severity: 'medium'
    });
  };

  // Export to JSON
  const handleExportContacts = () => {
    const dataStr = JSON.stringify(contacts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `cascadia_contacts_${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'CONTACT MANAGER',
      payload: { message: `Emergency Contact Directory exported successfully (${contacts.length} entries)` },
      severity: 'low'
    });
  };

  // Import from JSON File
  const handleImportContacts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            // Apply migration and normalization to each imported record
            const migrated = parsed.map(migrateLegacyContact);
            setContacts(prev => [...migrated, ...prev]);
            dataBus.broadcast({
              type: 'SYSTEM',
              origin: 'CONTACT MANAGER',
              payload: { message: `Imported and migrated ${parsed.length} emergency contacts into active register.` },
              severity: 'high'
            });
          } else {
            alert('Invalid file format. Contacts should be formatted as a JSON array.');
          }
        } catch (err) {
          alert('Failed to parse file. Ensure it is a valid JSON file.');
        }
      };
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role.toLowerCase().includes(search.toLowerCase()) ||
    c.esf.toLowerCase().includes(search.toLowerCase()) ||
    (c.professionalProfile?.callSign && c.professionalProfile.callSign.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Module Title Header Banner */}
      <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase text-zinc-100 tracking-wider">Responder Directories</h1>
          <p className="text-sm text-zinc-500 font-medium">Register and classify off-hours contact rosters by ESF functions.</p>
        </div>

        {/* Directory Controls Panel */}
        <div className="flex items-center gap-3">
          <label className="eoc-button cursor-pointer">
            <Upload size={16} />
            Import (.json)
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportContacts}
            />
          </label>
          <button onClick={handleExportContacts} className="eoc-button">
            <Download size={16} />
            Export Directory
          </button>
          <CanvaButton
            variant="primary"
            onClick={() => {
              setIsEditing(false);
              setCurrentContact(createEmptyContact());
              setActiveTab('info');
              setDrawerOpen(true);
            }}
          >
            <Plus size={16} />
            Add Responder
          </CanvaButton>
        </div>
      </div>

      {/* Main expanded directory table */}
      <CanvaGlassPanel className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3 gap-4">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="SEARCH BY NAME, ESF, ROLE, OR CALL SIGN..."
              className="bg-transparent text-sm font-extrabold focus:outline-none placeholder-zinc-600 text-zinc-200 w-80 uppercase"
            />
          </div>
          <span className="text-[10px] font-mono font-bold bg-zinc-900 px-2.5 py-1 rounded text-zinc-400 shrink-0">
            {filteredContacts.length} ACTIVE LEDGER ENTRIES
          </span>
        </div>

        <div className="overflow-x-auto custom-scroll">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase font-extrabold text-zinc-500 tracking-widest">
                <th className="pb-3 pl-4">Responder / Role</th>
                <th className="pb-3">ESF Roster & Groups</th>
                <th className="pb-3">Outbound Alerting Contacts</th>
                <th className="pb-3">Professional & Billing</th>
                <th className="pb-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-sm">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-600 font-bold tracking-wide">
                    NO MATCHING DIRECTORY RECORDS FOUND
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-zinc-950/40">
                    {/* Column 1: Identity & Call Sign */}
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-zinc-100">{contact.name}</span>
                        {contact.professionalProfile?.callSign && (
                          <span className="text-[9px] font-mono font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase">
                            {contact.professionalProfile.callSign}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-zinc-500 uppercase mt-0.5">
                        {contact.role || 'Unspecified Role'}
                      </div>
                    </td>

                    {/* Column 2: ESF Designation and Channel Subscriptions */}
                    <td className="py-4">
                      <div className="font-extrabold text-zinc-300 text-xs">{contact.esf}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {contact.alerting?.groupA && (
                          <span className="text-[9px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                            GROUP A
                          </span>
                        )}
                        {contact.alerting?.groupB && (
                          <span className="text-[9px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                            GROUP B
                          </span>
                        )}
                        {contact.alerting?.groupC && (
                          <span className="text-[9px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                            GROUP C
                          </span>
                        )}
                        {!contact.alerting?.groupA && !contact.alerting?.groupB && !contact.alerting?.groupC && (
                          <span className="text-[9px] font-bold text-zinc-600 italic">
                            UNASSIGNED
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 3: Contact Channels */}
                    <td className="py-4">
                      <div className="font-mono text-zinc-300 text-xs">
                        {contact.contactInfo?.phonePersonalCell || 'NO PHONE'}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-medium lowercase mt-0.5">
                        {contact.contactInfo?.emailWork || 'no email'}
                      </div>
                    </td>

                    {/* Column 4: Cost Code & Billing Classification */}
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {contact.professionalProfile?.isVolunteer ? (
                          <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                            VOLUNTEER
                          </span>
                        ) : contact.professionalProfile?.isContractor ? (
                          <span className="text-[9px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded uppercase">
                            CONTRACTOR
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-zinc-900 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded uppercase">
                            STAFF
                          </span>
                        )}
                        <span className="font-mono font-extrabold text-zinc-300 text-xs">
                          ${(contact.professionalProfile?.hourlyRate || 0).toFixed(2)}/hr
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-bold mt-0.5 uppercase tracking-wide">
                        {contact.professionalProfile?.cbaUnitClassification || 'No CBA Code'}
                      </div>
                    </td>

                    {/* Column 5: Actions */}
                    <td className="py-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setCurrentContact(contact);
                            setActiveTab('info');
                            setDrawerOpen(true);
                          }}
                          className="p-1.5 hover:bg-amber-500/10 hover:text-amber-400 text-zinc-500 rounded-lg transition-all active:scale-95 cursor-pointer"
                          title="Edit Profile"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id, contact.name)}
                          className="p-1.5 hover:bg-red-500/10 hover:text-red-500 text-zinc-500 rounded-lg transition-all active:scale-95 cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CanvaGlassPanel>

      {/* ==========================================
          5. SLIDING MASTER CONTACT EDITOR DRAWER
          ========================================== */}
      <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${drawerOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}>
        {/* Backdrop overlay */}
        <div
          className={`absolute inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setDrawerOpen(false)}
        />

        {/* Slider Pane Container */}
        <div className={`absolute inset-y-0 right-0 max-w-full flex pl-10 transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <form
            onSubmit={handleSaveContact}
            className="w-screen max-w-2xl bg-[#0a0a0d]/95 border-l border-zinc-800/80 backdrop-blur-2xl flex flex-col shadow-2xl relative"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-900 bg-zinc-950/40">
              <div className="flex items-center gap-2.5">
                <User size={18} className="text-amber-500" />
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-zinc-100 tracking-wider">
                    {isEditing ? 'Edit Responder Profile' : 'Register Master Contact'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-medium">
                    {isEditing ? `Modifying operational profile for ${currentContact.name}` : 'Populate core parameters, call signs, and cost codes'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg border border-zinc-900 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800 transition-all cursor-pointer"
                title="Close Drawer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabbed Navigation Bar */}
            <div className="flex border-b border-zinc-900 bg-zinc-950/20 px-6 py-2 gap-2 shrink-0 overflow-x-auto custom-scroll">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 border shrink-0 cursor-pointer ${
                  activeTab === 'info'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-extrabold'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                <User size={14} />
                Core Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('professional')}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 border shrink-0 cursor-pointer ${
                  activeTab === 'professional'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-extrabold'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                <Briefcase size={14} />
                Professional
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('alerting')}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 border shrink-0 cursor-pointer ${
                  activeTab === 'alerting'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-extrabold'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                <Bell size={14} />
                Alerting
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('emergency')}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 border shrink-0 cursor-pointer ${
                  activeTab === 'emergency'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-extrabold'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                <PhoneCall size={14} />
                Emergency Contact
              </button>
            </div>

            {/* Scrollable Form Body Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
              
              {/* TAB 1: CORE CONTACT INFORMATION */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CanvaFormRow label="Full Name">
                      <CanvaInput
                        type="text"
                        required
                        value={currentContact.name}
                        onChange={e => updateField(null, 'name', e.target.value)}
                        placeholder="e.g. John Doe"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow 
                      label="Roster Status" 
                      rightElement={<CanvaDropdownCustomizer dropdownKey="roster_status_options" label="Roster Status" />}
                    >
                      <CanvaSelect
                        value={currentContact.status}
                        onChange={e => updateField(null, 'status', e.target.value)}
                      >
                        {dropdowns.roster_status_options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </CanvaSelect>
                    </CanvaFormRow>

                    <CanvaFormRow label="Operational Role">
                      <CanvaInput
                        type="text"
                        value={currentContact.role}
                        onChange={e => updateField(null, 'role', e.target.value)}
                        placeholder="e.g. Logistics Supervisor"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow 
                      label="ESF Designation" 
                      rightElement={<CanvaDropdownCustomizer dropdownKey="esf_designations" label="ESF Designation" />}
                    >
                      <CanvaSelect
                        value={currentContact.esf}
                        onChange={e => updateField(null, 'esf', e.target.value)}
                      >
                        {dropdowns.esf_designations.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </CanvaSelect>
                    </CanvaFormRow>
                  </div>

                  <div className="border-t border-zinc-900 my-4" />

                  {/* Address Grid */}
                  <div className="space-y-4">
                    <CanvaFormRow label="Work Facility Address">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                          <MapPin size={14} />
                        </div>
                        <CanvaInput
                          type="text"
                          value={currentContact.contactInfo.workAddress}
                          onChange={e => updateField('contactInfo', 'workAddress', e.target.value)}
                          className="pl-8"
                          placeholder="e.g. Cascadia HQ, Seattle WA"
                        />
                      </div>
                    </CanvaFormRow>

                    {/* Geofencing Toggle */}
                    <div className="flex items-center gap-2 px-1">
                      <input
                        type="checkbox"
                        id="useGeofencing"
                        checked={currentContact.contactInfo.useWorkAddressForGeofencing}
                        onChange={e => updateField('contactInfo', 'useWorkAddressForGeofencing', e.target.checked)}
                        className="accent-amber-500 h-4 w-4 cursor-pointer"
                      />
                      <label htmlFor="useGeofencing" className="text-xs text-zinc-300 font-bold select-none cursor-pointer">
                        Use Work Address for GIS Geofencing Area Alerts
                      </label>
                    </div>

                    <CanvaFormRow label="Home Address">
                      <CanvaInput
                        type="text"
                        value={currentContact.contactInfo.homeAddress}
                        onChange={e => updateField('contactInfo', 'homeAddress', e.target.value)}
                        placeholder="e.g. 123 Pine St, Bellevue WA"
                      />
                    </CanvaFormRow>
                  </div>

                  <div className="border-t border-zinc-900 my-4" />

                  {/* Phone & Email Channels */}
                  <h4 className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-wider mb-2">Comms Channels (Phone / Email)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CanvaFormRow label="Work Landline Phone">
                      <CanvaInput
                        type="tel"
                        value={currentContact.contactInfo.phoneWork}
                        onChange={e => updateField('contactInfo', 'phoneWork', e.target.value)}
                        placeholder="(206) 555-0101"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow label="Work Cell Phone">
                      <CanvaInput
                        type="tel"
                        value={currentContact.contactInfo.phoneWorkCell}
                        onChange={e => updateField('contactInfo', 'phoneWorkCell', e.target.value)}
                        placeholder="(206) 555-0102"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow label="Home Landline Phone">
                      <CanvaInput
                        type="tel"
                        value={currentContact.contactInfo.phoneHome}
                        onChange={e => updateField('contactInfo', 'phoneHome', e.target.value)}
                        placeholder="(206) 555-0103"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow label="Personal Cell Phone">
                      <CanvaInput
                        type="tel"
                        value={currentContact.contactInfo.phonePersonalCell}
                        onChange={e => updateField('contactInfo', 'phonePersonalCell', e.target.value)}
                        placeholder="(206) 555-0104"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow label="Work Email Address">
                      <CanvaInput
                        type="email"
                        value={currentContact.contactInfo.emailWork}
                        onChange={e => updateField('contactInfo', 'emailWork', e.target.value)}
                        placeholder="john.doe@cascadia-em.com"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow label="Personal Email Address">
                      <CanvaInput
                        type="email"
                        value={currentContact.contactInfo.emailPersonal}
                        onChange={e => updateField('contactInfo', 'emailPersonal', e.target.value)}
                        placeholder="john.doe.personal@gmail.com"
                      />
                    </CanvaFormRow>
                  </div>
                </div>
              )}

              {/* TAB 2: PROFESSIONAL PROFILE */}
              {activeTab === 'professional' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CanvaFormRow label="Title / Rank">
                      <CanvaInput
                        type="text"
                        value={currentContact.professionalProfile.titleRank}
                        onChange={e => updateField('professionalProfile', 'titleRank', e.target.value)}
                        placeholder="e.g. Captain, Lead Dispatcher"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow label="Call Sign">
                      <CanvaInput
                        type="text"
                        value={currentContact.professionalProfile.callSign}
                        onChange={e => updateField('professionalProfile', 'callSign', e.target.value.toUpperCase())}
                        placeholder="e.g. CASCADIA-9"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow label="Agency ID Number">
                      <CanvaInput
                        type="text"
                        value={currentContact.professionalProfile.agencyId}
                        onChange={e => updateField('professionalProfile', 'agencyId', e.target.value)}
                        placeholder="e.g. CEM-142"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow label="ESF Command Position">
                      <CanvaInput
                        type="text"
                        value={currentContact.professionalProfile.esfPosition}
                        onChange={e => updateField('professionalProfile', 'esfPosition', e.target.value)}
                        placeholder="e.g. Resource Coordinator"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow label="Certifications (Comma separated)">
                      <CanvaInput
                        type="text"
                        value={currentContact.professionalProfile.certifications}
                        onChange={e => updateField('professionalProfile', 'certifications', e.target.value)}
                        placeholder="FEMA ICS-300, GIS CEM, CPR"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow label="Professional Associations">
                      <CanvaInput
                        type="text"
                        value={currentContact.professionalProfile.associations}
                        onChange={e => updateField('professionalProfile', 'associations', e.target.value)}
                        placeholder="IAEM, NEMA, Red Cross"
                      />
                    </CanvaFormRow>

                    <CanvaFormRow label="Hourly Operational Rate ($)">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                          <DollarSign size={14} />
                        </div>
                        <CanvaInput
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={currentContact.professionalProfile.isVolunteer}
                          value={currentContact.professionalProfile.isVolunteer ? 0 : (currentContact.professionalProfile.hourlyRate || '')}
                          onChange={e => updateField('professionalProfile', 'hourlyRate', parseFloat(e.target.value) || 0)}
                          className="pl-8 disabled:text-zinc-600 disabled:bg-zinc-950/40"
                          placeholder="e.g. 85.00"
                        />
                      </div>
                    </CanvaFormRow>

                    <CanvaFormRow label="CBA / Billing Classification">
                      <CanvaInput
                        type="text"
                        value={currentContact.professionalProfile.cbaUnitClassification}
                        onChange={e => updateField('professionalProfile', 'cbaUnitClassification', e.target.value)}
                        placeholder="e.g. Contract Unit-B, Staff Local-12"
                      />
                    </CanvaFormRow>
                  </div>

                  <div className="border-t border-zinc-900 my-4" />

                  {/* Status Flags checkboxes */}
                  <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-lg space-y-3">
                    <h4 className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-wider">Classification Overrides</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isEmergencyWorker"
                          checked={currentContact.professionalProfile.isEmergencyWorker}
                          onChange={e => updateField('professionalProfile', 'isEmergencyWorker', e.target.checked)}
                          className="accent-amber-500 h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor="isEmergencyWorker" className="text-xs text-zinc-300 font-bold select-none cursor-pointer">
                          Emergency Worker
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isVolunteer"
                          checked={currentContact.professionalProfile.isVolunteer}
                          onChange={e => {
                            const isChecked = e.target.checked;
                            setCurrentContact(prev => ({
                              ...prev,
                              professionalProfile: {
                                ...prev.professionalProfile,
                                isVolunteer: isChecked,
                                hourlyRate: isChecked ? 0 : prev.professionalProfile.hourlyRate,
                                isContractor: isChecked ? false : prev.professionalProfile.isContractor
                              }
                            }));
                          }}
                          className="accent-amber-500 h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor="isVolunteer" className="text-xs text-zinc-300 font-bold select-none cursor-pointer">
                          Volunteer Status
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isContractor"
                          checked={currentContact.professionalProfile.isContractor}
                          onChange={e => {
                            const isChecked = e.target.checked;
                            setCurrentContact(prev => ({
                              ...prev,
                              professionalProfile: {
                                ...prev.professionalProfile,
                                isContractor: isChecked,
                                isVolunteer: isChecked ? false : prev.professionalProfile.isVolunteer
                              }
                            }));
                          }}
                          className="accent-amber-500 h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor="isContractor" className="text-xs text-zinc-300 font-bold select-none cursor-pointer">
                          Contractor
                        </label>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ALERTING SETTINGS */}
              {activeTab === 'alerting' && (
                <div className="space-y-4">
                  {/* Master Opt In Toggle */}
                  <div className="flex items-center justify-between bg-zinc-950/40 p-4 border border-zinc-900 rounded-lg">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">Outbound Alerts Opt-In Roster</h4>
                      <p className="text-[10px] text-zinc-500">Allow out-of-band communication, SMS pages and alerts</p>
                    </div>
                    <input
                      type="checkbox"
                      id="optInStatus"
                      checked={currentContact.alerting.optInStatus}
                      onChange={e => updateField('alerting', 'optInStatus', e.target.checked)}
                      className="accent-amber-500 h-5 w-5 cursor-pointer"
                    />
                  </div>

                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-200 ${currentContact.alerting.optInStatus ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    
                    {/* Messaging Group Assignments */}
                    <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-lg space-y-2.5">
                      <h4 className="text-[11px] font-extrabold uppercase text-amber-500 tracking-wider">Messaging Groups</h4>
                      
                      <div className="space-y-2 pt-1.5">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id="groupA"
                            checked={currentContact.alerting.groupA}
                            onChange={e => updateField('alerting', 'groupA', e.target.checked)}
                            className="accent-amber-500 h-4 w-4 cursor-pointer"
                          />
                          <label htmlFor="groupA" className="text-xs text-zinc-300 font-bold cursor-pointer select-none">
                            Group A (Incident Command)
                          </label>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id="groupB"
                            checked={currentContact.alerting.groupB}
                            onChange={e => updateField('alerting', 'groupB', e.target.checked)}
                            className="accent-amber-500 h-4 w-4 cursor-pointer"
                          />
                          <label htmlFor="groupB" className="text-xs text-zinc-300 font-bold cursor-pointer select-none">
                            Group B (Support & Operations)
                          </label>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id="groupC"
                            checked={currentContact.alerting.groupC}
                            onChange={e => updateField('alerting', 'groupC', e.target.checked)}
                            className="accent-amber-500 h-4 w-4 cursor-pointer"
                          />
                          <label htmlFor="groupC" className="text-xs text-zinc-300 font-bold cursor-pointer select-none">
                            Group C (External Agencies / PIO)
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Alert Subscriptions */}
                    <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-lg space-y-2.5">
                      <h4 className="text-[11px] font-extrabold uppercase text-amber-500 tracking-wider">Alert Type Subscriptions</h4>
                      
                      <div className="space-y-2 pt-1.5">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id="alertEmergency"
                            checked={currentContact.alerting.alertEmergency}
                            onChange={e => updateField('alerting', 'alertEmergency', e.target.checked)}
                            className="accent-amber-500 h-4 w-4 cursor-pointer"
                          />
                          <label htmlFor="alertEmergency" className="text-xs text-zinc-300 font-bold cursor-pointer select-none">
                            Emergency Broadcasts (911/Critical)
                          </label>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id="alertAdmin"
                            checked={currentContact.alerting.alertAdmin}
                            onChange={e => updateField('alerting', 'alertAdmin', e.target.checked)}
                            className="accent-amber-500 h-4 w-4 cursor-pointer"
                          />
                          <label htmlFor="alertAdmin" className="text-xs text-zinc-300 font-bold cursor-pointer select-none">
                            Administrative Bulletins
                          </label>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id="alertErtEsf"
                            checked={currentContact.alerting.alertErtEsf}
                            onChange={e => updateField('alerting', 'alertErtEsf', e.target.checked)}
                            className="accent-amber-500 h-4 w-4 cursor-pointer"
                          />
                          <label htmlFor="alertErtEsf" className="text-xs text-zinc-300 font-bold cursor-pointer select-none">
                            ERT / ESF Team Activations
                          </label>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id="alertTest"
                            checked={currentContact.alerting.alertTest}
                            onChange={e => updateField('alerting', 'alertTest', e.target.checked)}
                            className="accent-amber-500 h-4 w-4 cursor-pointer"
                          />
                          <label htmlFor="alertTest" className="text-xs text-zinc-300 font-bold cursor-pointer select-none">
                            Drills, Tests, Net Checks
                          </label>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 4: EMERGENCY NOK CONTACTS */}
              {activeTab === 'emergency' && (
                <div className="space-y-4">
                  <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-lg">
                    <h4 className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-wider mb-3">Secondary Emergency Next-of-Kin</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CanvaFormRow label="Contact Full Name" className="md:col-span-2">
                        <CanvaInput
                          type="text"
                          value={currentContact.emergencyContact.contactName}
                          onChange={e => updateField('emergencyContact', 'contactName', e.target.value)}
                          placeholder="e.g. Jane Doe"
                        />
                      </CanvaFormRow>

                      <CanvaFormRow label="Relation & Location Address" className="md:col-span-2">
                        <CanvaInput
                          type="text"
                          value={currentContact.emergencyContact.address}
                          onChange={e => updateField('emergencyContact', 'address', e.target.value)}
                          placeholder="e.g. Spouse - 123 Maple St, Seattle WA"
                        />
                      </CanvaFormRow>

                      <CanvaFormRow label="Primary Emergency Phone">
                        <CanvaInput
                          type="tel"
                          value={currentContact.emergencyContact.phonePrimary}
                          onChange={e => updateField('emergencyContact', 'phonePrimary', e.target.value)}
                          placeholder="(206) 555-1212"
                        />
                      </CanvaFormRow>

                      <CanvaFormRow label="Alternate Emergency Phone">
                        <CanvaInput
                          type="tel"
                          value={currentContact.emergencyContact.phoneAlternate}
                          onChange={e => updateField('emergencyContact', 'phoneAlternate', e.target.value)}
                          placeholder="(206) 555-1313"
                        />
                      </CanvaFormRow>

                      <CanvaFormRow label="Emergency Contact Email Address" className="md:col-span-2">
                        <CanvaInput
                          type="email"
                          value={currentContact.emergencyContact.email}
                          onChange={e => updateField('emergencyContact', 'email', e.target.value)}
                          placeholder="jane.doe@gmail.com"
                        />
                      </CanvaFormRow>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-zinc-900 bg-zinc-950/40 flex items-center justify-end gap-3 shrink-0">
              <CanvaButton type="button" onClick={() => setDrawerOpen(false)}>
                Cancel
              </CanvaButton>
              <CanvaButton type="submit" variant="primary">
                <Check size={16} />
                {isEditing ? 'Save Profile' : 'Register Contact'}
              </CanvaButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactManager;
