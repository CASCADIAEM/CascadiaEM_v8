import React, { useState, useEffect, useRef } from 'react';
import { dataBus } from '../services/DataBus';
import { Building2, Bell, Shield, Key, Eye, FileSpreadsheet, Plus, Trash2, MapPin, ExternalLink, Search, Clock, ShieldAlert, FileText, Layout, Upload } from 'lucide-react';
import { sendTelemetryLog } from '../services/Telemetry';
import { useDropdowns } from '../services/DropdownService';
import {
  CanvaGlassPanel,
  CanvaButton,
  CanvaInput,
  CanvaSelect,
  CanvaFormRow,
  CanvaDropdownCustomizer
} from '../components/DesignSandbox';

// ==========================================
// 🗺️ GOOGLE PLACES API CONFIGURATION
// Replace with your billing-enabled Google API Key to activate live global lookups!
// ==========================================
const GOOGLE_MAPS_API_KEY = ""; 

interface Facility {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  capacity: number;
  status: 'COLD' | 'STANDBY' | 'ACTIVE';
  primaryKeyholder: string;
  primaryPhone: string;
  secondaryKeyholder: string;
  secondaryPhone: string;
  verified911Address: string;
  city: string;
  county: string;
  hoursOfOperation: string;
  photoUrl: string;
  mouDocumentUrl?: string;
  floorPlanUrl?: string;
}

// Local mock landmark database for seamless offline lookup simulation
const PNW_LANDMARK_REGISTRY = [
  { name: "Enumclaw Community Center", address: "1350 Cole St", city: "Enumclaw", county: "King County" },
  { name: "King County Emergency Operations Center (EOC)", address: "3511 NE 2nd St", city: "Renton", county: "King County" },
  { name: "Edmonds Community College Wood Center", address: "20000 68th Ave W", city: "Edmonds", county: "Snohomish County" },
  { name: "Auburn City Hall & Emergency Council Chambers", address: "25 W Main St", city: "Auburn", county: "King County" },
  { name: "Bothell City Hall & Police Headquarters", address: "18415 101st Ave NE", city: "Bothell", county: "King County" },
  { name: "Snohomish County Courthouse & EOC", address: "3000 Rockefeller Ave", city: "Everett", county: "Snohomish County" },
  { name: "Edmonds Library & Municipal Community Hall", address: "650 Main St", city: "Edmonds", county: "Snohomish County" }
];

const getTypeDefaultPhoto = (type: string): string => {
  switch (type) {
    case 'Government / Municipal Hall':
      return 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=400&q=80'; // Gymnasium
    case 'Educational Space (MOU)':
      return 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80'; // School
    case 'Commercial Warehouse':
      return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80'; // Warehouse
    case 'Religious / Community Facility':
    default:
      return 'https://images.unsplash.com/photo-1438219584103-a1999e3d076c?auto=format&fit=crop&w=400&q=80'; // Church
  }
};

const getGoogleDirectionsUrl = (facility: Facility): string => {
  const query = `${facility.verified911Address}, ${facility.city}, WA`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
};

const INITIAL_FACILITIES: Facility[] = [
  {
    id: 'FAC-1',
    name: 'Bethel Community Church',
    type: 'Religious / Community Facility',
    capabilities: ['Bathroom Access', 'Rest & Rehab Area', 'Meals / Kitchen'],
    capacity: 75,
    status: 'COLD',
    primaryKeyholder: 'Pastor John Davis',
    primaryPhone: '(206) 786-5300',
    secondaryKeyholder: 'Lisa Jackson',
    secondaryPhone: '(206) 555-XXXX',
    verified911Address: '14812 104th Ave NE (Main Sanctuary East Entrance)',
    city: 'Edmonds',
    county: 'Snohomish County',
    hoursOfOperation: '08:00 - 18:00 Daily / 24hrs on EOC Activation',
    photoUrl: 'https://images.unsplash.com/photo-1438219584103-a1999e3d076c?auto=format&fit=crop&w=400&q=80',
    mouDocumentUrl: 'https://drive.google.com/file/d/1_bethel_church_signed_mou/view?usp=sharing',
    floorPlanUrl: 'https://drive.google.com/file/d/1_bethel_assembly_hall_floorplan/view?usp=sharing'
  },
  {
    id: 'FAC-2',
    name: 'Tribal Community Gymnasium',
    type: 'Government / Municipal Hall',
    capabilities: ['Cots / Overnight Shelter', 'Full Commercial Kitchen', 'ADA Restrooms', 'Backup Generator'],
    capacity: 250,
    status: 'COLD',
    primaryKeyholder: 'Chief Facility Manager Keith',
    primaryPhone: '(206) 786-5300',
    secondaryKeyholder: 'Tom Smith',
    secondaryPhone: '(206) 555-XXXX',
    verified911Address: '2234 Chief Leschi St (West Gymnasium Double-Doors Entrance)',
    city: 'Auburn',
    county: 'King County',
    hoursOfOperation: '06:00 - 22:00 Mon-Sat / 24hrs on EOC Activation',
    photoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=400&q=80',
    mouDocumentUrl: 'https://drive.google.com/file/d/1_tribal_gym_mou_muni/view?usp=sharing',
    floorPlanUrl: 'https://drive.google.com/file/d/1_tribal_rehab_center_shelter_plan/view?usp=sharing'
  },
  {
    id: 'FAC-3',
    name: 'North High School Gym',
    type: 'Educational Space (MOU)',
    capabilities: ['Emergency Shelter', 'Showers', 'Large Staging Parking'],
    capacity: 400,
    status: 'COLD',
    primaryKeyholder: 'Principal Robert Vance',
    primaryPhone: '(206) 786-5300',
    secondaryKeyholder: 'Liaison Amanda',
    secondaryPhone: '(206) 555-XXXX',
    verified911Address: '18220 100th Ave NE (Athletic Field South Gate Loading Bay)',
    city: 'Bothell',
    county: 'King County',
    hoursOfOperation: '07:00 - 21:00 School Days / 24hrs on EOC Activation',
    photoUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80',
    mouDocumentUrl: 'https://drive.google.com/file/d/1_nsd_district_high_school_mou/view?usp=sharing',
    floorPlanUrl: 'https://drive.google.com/file/d/1_north_high_gym_evac_exits/view?usp=sharing'
  }
];

const LogisticsFacilities: React.FC = () => {
  const { dropdowns } = useDropdowns();
  const [facilities, setFacilities] = useState<Facility[]>(() => {
    const cached = dataBus.getCache<Facility[]>('logistics_facilities');
    return cached || INITIAL_FACILITIES;
  });

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCounty, setFilterCounty] = useState('ALL COUNTIES');
  const [filterCity, setFilterCity] = useState('ALL CITIES');
  const [filterStatus, setFilterStatus] = useState('ALL STATUSES');

  // Details Modal States
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [editFacility, setEditFacility] = useState<Facility | null>(null);

  // New Facility Form States
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Religious / Community Facility');
  const [formCapabilities, setFormCapabilities] = useState('Bathroom Access, Rest & Rehab Area');
  const [formCapacity, setFormCapacity] = useState(100);
  const [formPrimaryKeyholder, setFormPrimaryKeyholder] = useState('');
  const [formPrimaryPhone, setFormPrimaryPhone] = useState('(206) 786-5300');
  const [formSecondaryKeyholder, setFormSecondaryKeyholder] = useState('');
  const [formSecondaryPhone, setFormSecondaryPhone] = useState('(206) 555-XXXX');
  const [formVerified911Address, setFormVerified911Address] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCounty, setFormCounty] = useState('King County');
  const [formHoursOfOperation, setFormHoursOfOperation] = useState('08:00 - 17:00 / 24hrs on EOC Activation');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formMouDocumentUrl, setFormMouDocumentUrl] = useState('');
  const [formFloorPlanUrl, setFormFloorPlanUrl] = useState('');

  // Autocomplete UI Overlay States
  const [formSuggestions, setFormSuggestions] = useState<typeof PNW_LANDMARK_REGISTRY>([]);
  const [showFormSuggestions, setShowFormSuggestions] = useState(false);
  const [editSuggestions, setEditSuggestions] = useState<typeof PNW_LANDMARK_REGISTRY>([]);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);

  // Google Maps Instance Refs
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const formInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    dataBus.setCache('logistics_facilities', facilities);
  }, [facilities]);

  // ==========================================
  // Dynamic Google Places Autocomplete Script Loading
  // ==========================================
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;

    if ((window as any).google?.maps?.places) {
      setGoogleMapsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGooglePlacesCallback`;
    script.async = true;
    script.defer = true;

    (window as any).initGooglePlacesCallback = () => {
      setGoogleMapsLoaded(true);
    };

    document.head.appendChild(script);

    return () => {
      delete (window as any).initGooglePlacesCallback;
    };
  }, []);

  // Initialize Google Autocomplete bindings on DOM node availability
  useEffect(() => {
    if (!googleMapsLoaded || !(window as any).google?.maps?.places) return;

    let formAutocomplete: any = null;
    let editAutocomplete: any = null;

    if (formInputRef.current) {
      formAutocomplete = new (window as any).google.maps.places.Autocomplete(formInputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'us' }
      });
      formAutocomplete.addListener('place_changed', () => {
        if (formAutocomplete) handleGooglePlaceSelect(formAutocomplete, false);
      });
    }

    if (editInputRef.current) {
      editAutocomplete = new (window as any).google.maps.places.Autocomplete(editInputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'us' }
      });
      editAutocomplete.addListener('place_changed', () => {
        if (editAutocomplete) handleGooglePlaceSelect(editAutocomplete, true);
      });
    }

    return () => {
      if ((window as any).google?.maps?.event) {
        if (formAutocomplete) (window as any).google.maps.event.clearInstanceListeners(formAutocomplete);
        if (editAutocomplete) (window as any).google.maps.event.clearInstanceListeners(editAutocomplete);
      }
    };
  }, [googleMapsLoaded, selectedFacility]);

  const handleGooglePlaceSelect = (autocomplete: any, isEditMode: boolean) => {
    const place = autocomplete.getPlace();
    if (!place.geometry || !place.address_components) return;

    const formatted = place.formatted_address || '';
    let extractedCity = '';
    let extractedCounty = '';

    for (const component of place.address_components) {
      if (component.types.includes('locality')) {
        extractedCity = component.long_name;
      }
      if (component.types.includes('administrative_area_level_2')) {
        extractedCounty = component.long_name; // e.g. "King County"
      }
    }

    if (isEditMode) {
      setEditFacility(prev => prev ? {
        ...prev,
        verified911Address: formatted,
        city: extractedCity || prev.city,
        county: extractedCounty || prev.county
      } : null);
    } else {
      setFormVerified911Address(formatted);
      if (extractedCity) setFormCity(extractedCity);
      if (extractedCounty) setFormCounty(extractedCounty);
    }
  };

  // ==========================================
  // Local Address Autocomplete Logic
  // ==========================================
  const handleAddressInputChange = (val: string, isEditMode: boolean) => {
    if (isEditMode) {
      setEditFacility(prev => prev ? { ...prev, verified911Address: val } : null);
      
      // Filter offline landmarks matching input query
      if (val.trim().length > 2 && !googleMapsLoaded) {
        const matches = PNW_LANDMARK_REGISTRY.filter(item => 
          item.name.toLowerCase().includes(val.toLowerCase()) ||
          item.address.toLowerCase().includes(val.toLowerCase())
        );
        setEditSuggestions(matches);
        setShowEditSuggestions(matches.length > 0);
      } else {
        setShowEditSuggestions(false);
      }
    } else {
      setFormVerified911Address(val);
      
      if (val.trim().length > 2 && !googleMapsLoaded) {
        const matches = PNW_LANDMARK_REGISTRY.filter(item => 
          item.name.toLowerCase().includes(val.toLowerCase()) ||
          item.address.toLowerCase().includes(val.toLowerCase())
        );
        setFormSuggestions(matches);
        setShowFormSuggestions(matches.length > 0);
      } else {
        setShowFormSuggestions(false);
      }
    }
  };

  const handleSelectAutocomplete = (item: typeof PNW_LANDMARK_REGISTRY[0], isEditMode: boolean) => {
    // Standard structured emergency responder entryway format
    const formatted = `${item.address} (${item.name})`;

    if (isEditMode) {
      setEditFacility(prev => prev ? {
        ...prev,
        verified911Address: formatted,
        city: item.city,
        county: item.county
      } : null);
      setShowEditSuggestions(false);
    } else {
      setFormVerified911Address(formatted);
      setFormCity(item.city);
      setFormCounty(item.county);
      setShowFormSuggestions(false);
    }
  };

  const handleOpenDetails = (facility: Facility) => {
    setSelectedFacility(facility);
    setEditFacility(JSON.parse(JSON.stringify(facility)));
  };

  const handleStatusChange = (id: string, newStatus: Facility['status']) => {
    setFacilities(prev => prev.map(f => {
      if (f.id === id) {
        dataBus.broadcast({
          type: 'LOGISTICS',
          origin: 'LOGISTICS MODULE',
          payload: { 
            message: `Facility Status Altered: ${f.name} moved from ${f.status} to ${newStatus}`,
            facilityStatus: newStatus,
            facilityId: id
          },
          severity: newStatus === 'ACTIVE' ? 'high' : 'medium'
        });
        return { ...f, status: newStatus };
      }
      return f;
    }));
  };

  const handleUpdateFacility = async (updatedFacility: Facility) => {
    setFacilities(prev => prev.map(f => f.id === updatedFacility.id ? updatedFacility : f));

    // Dispatch system operational log to ledger
    dataBus.broadcast({
      type: 'LOGISTICS',
      origin: 'LOGISTICS MODULE',
      payload: {
        message: `Facility [${updatedFacility.name}] Configuration Updated`,
        facilityId: updatedFacility.id,
        facility: updatedFacility
      },
      severity: 'medium'
    });

    // Dispatch out-of-band telemetry log to Python backend
    await sendTelemetryLog({
      title: `FACILITY UPDATE EVENT: ${updatedFacility.id}`,
      severity: 'medium',
      notes: `Operational variables updated: Name=${updatedFacility.name}, 911 Address=${updatedFacility.verified911Address}, Capacity=${updatedFacility.capacity}, Status=${updatedFacility.status}`,
      origin_tenant: 'COMMAND_CENTER'
    });

    // Close the popup/clear selection
    setSelectedFacility(null);
    setEditFacility(null);
  };

  const handleCreateFacility = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formName.trim()) {
      setValidationError('FACILITY REGISTRATION FAILURE: Facility Name is required.');
      return;
    }
    if (!formVerified911Address.trim()) {
      setValidationError('FACILITY REGISTRATION FAILURE: Verified 911 Entrance Address is required for responder safety.');
      return;
    }
    if (!formCity.trim()) {
      setValidationError('FACILITY REGISTRATION FAILURE: City field is required.');
      return;
    }

    const nextId = `FAC-${facilities.length + 1}`;
    const defaultPhoto = getTypeDefaultPhoto(formType);

    const newFacility: Facility = {
      id: nextId,
      name: formName.trim(),
      type: formType,
      capabilities: formCapabilities.split(',').map(c => sTrim(c)).filter(Boolean),
      capacity: Math.max(1, formCapacity),
      status: 'COLD',
      primaryKeyholder: formPrimaryKeyholder.trim() || 'TBD Staff',
      primaryPhone: formPrimaryPhone.trim() || '(206) 786-5300',
      secondaryKeyholder: formSecondaryKeyholder.trim() || 'TBD Staff',
      secondaryPhone: formSecondaryPhone.trim() || '(206) 555-XXXX',
      verified911Address: formVerified911Address.trim(),
      city: formCity.trim(),
      county: formCounty,
      hoursOfOperation: formHoursOfOperation.trim() || '24hrs on EOC Activation',
      photoUrl: formPhotoUrl.trim() || defaultPhoto,
      mouDocumentUrl: formMouDocumentUrl.trim() || undefined,
      floorPlanUrl: formFloorPlanUrl.trim() || undefined
    };

    setFacilities(prev => [...prev, newFacility]);

    // Dispatch operational log
    dataBus.broadcast({
      type: 'LOGISTICS',
      origin: 'LOGISTICS MODULE',
      payload: {
        message: `Registered New Facility Node: ${newFacility.name} [${newFacility.id}]`,
        facilityId: newFacility.id,
        facility: newFacility
      },
      severity: 'medium'
    });

    // Clear form
    setFormName('');
    setFormPrimaryKeyholder('');
    setFormVerified911Address('');
    setFormCity('');
    setFormPhotoUrl('');
    setFormMouDocumentUrl('');
    setFormFloorPlanUrl('');
  };

  const handleDeleteFacility = (id: string) => {
    const target = facilities.find(f => f.id === id);
    if (!target) return;

    if (!confirm(`Confirm Decommission of Facility node [${target.name}]? This action is immediate.`)) {
      return;
    }

    setFacilities(prev => prev.filter(f => f.id !== id));

    dataBus.broadcast({
      type: 'LOGISTICS',
      origin: 'LOGISTICS MODULE',
      payload: {
        message: `Decommissioned Facility Node: ${target.name} [${id}]`,
        facilityId: id
      },
      severity: 'high'
    });
  };

  const sTrim = (str: string) => str.replace(/^\s+|\s+$/g, '');

  const handleTypeChange = (type: string) => {
    setFormType(type);
    setFormPhotoUrl(getTypeDefaultPhoto(type));
  };

  // Local file upload Base64 pre-processor (Simulates Cloud storage file streams)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isEditMode) {
        setEditFacility(prev => prev ? { ...prev, photoUrl: base64String } : null);
      } else {
        setFormPhotoUrl(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerKeyholderAlert = async (facility: Facility, alertType: 'STANDBY' | 'ACTIVATE') => {
    const contactName = facility.primaryKeyholder;
    const contactPhone = facility.primaryPhone;
    const message = alertType === 'STANDBY' 
      ? `🚨 LOGISTICS ORDER: ${facility.name} placed on WARM STAND-BY. Verify keys and volunteer availability immediately.`
      : `🔥 EMERGENCY ACTION ACTIVATED: Open and secure doors at ${facility.name} for immediate shelter/rehab operations.`;

    dataBus.broadcast({
      type: 'COMMS',
      origin: 'LOGISTICS MODULE',
      payload: { 
        message: `Out-of-band pager sent to ${contactName} (${contactPhone}): "${message}"` 
      },
      severity: 'high'
    });

    // Central Telemetry Integration (Dispatches out-of-band Twilio alerts via server.py)
    await sendTelemetryLog({
      title: `LOGISTICS KEYHOLDER ALERT: ${facility.name}`,
      severity: alertType === 'ACTIVATE' ? 'high' : 'medium',
      notes: `Out-of-band pager broadcast sent to ${contactName} (${contactPhone})`,
      origin_tenant: 'CASCADIA_EM_LOGISTICS',
      channels: ['sms'],
      classification: alertType === 'ACTIVATE' ? 'LIFE-SAFETY' : 'URGENT',
      alert_message: message,
      target_label: contactName,
      ics_position: 'LOGISTICS_CHIEF'
    });

    alert(`Pager Notification sent to Primary Keyholder (${contactName}):\n\n"${message}"`);
  };

  // Dynamic Dropdown Lists from active dataset merged with Admin-configured values
  const countiesList = Array.from(new Set([
    ...(dropdowns.wa_counties || []),
    ...facilities.map(f => f.county)
  ])).filter(Boolean);

  const citiesList = Array.from(new Set([
    ...(dropdowns.wa_cities || []),
    ...facilities.map(f => f.city)
  ])).filter(Boolean);

  // Filter & Search Logic
  const filteredFacilities = facilities.filter(f => {
    const matchesSearch = 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.verified911Address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.primaryKeyholder.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCounty = filterCounty === 'ALL COUNTIES' || f.county === filterCounty;
    const matchesCity = filterCity === 'ALL CITIES' || f.city === filterCity;
    const matchesStatus = filterStatus === 'ALL STATUSES' || f.status === filterStatus;

    return matchesSearch && matchesCounty && matchesCity && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* HUD Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-black uppercase text-zinc-100 tracking-wider">Logistics & Support Facilities</h1>
        <p className="text-sm text-zinc-500 font-medium">Register municipal, religious, and mutual-aid assets with active keyholder logs.</p>
      </div>

      {/* ==========================================
          📝 REGISTER NEW FACILITY NODE FORM (FULL WIDTH)
          ========================================== */}
      <CanvaGlassPanel className="p-6 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
          <FileSpreadsheet size={18} className="text-amber-500" />
          <h2 className="text-lg font-black uppercase text-zinc-100 tracking-wider">Register New Facility Node</h2>
        </div>

        {validationError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-3 rounded-lg font-extrabold uppercase font-mono tracking-wider">
            {validationError}
          </div>
        )}

        <form onSubmit={handleCreateFacility} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CanvaFormRow label="Facility Name">
              <CanvaInput 
                placeholder="e.g. Bethel Community Church"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </CanvaFormRow>

            <CanvaFormRow 
              label="Facility Type"
              rightElement={<CanvaDropdownCustomizer dropdownKey="facility_types" label="Facility Type" />}
            >
              <CanvaSelect 
                value={formType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                {(dropdowns.facility_types || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </CanvaSelect>
            </CanvaFormRow>

            <CanvaFormRow label="Rated Capacity (People)">
              <CanvaInput 
                type="number"
                min="1"
                value={formCapacity}
                onChange={(e) => setFormCapacity(Math.max(1, Number(e.target.value)))}
              />
            </CanvaFormRow>

            <CanvaFormRow label="Capabilities (Comma Separated)">
              <CanvaInput 
                placeholder="Bathroom Access, Cots, Kitchen"
                value={formCapabilities}
                onChange={(e) => setFormCapabilities(e.target.value)}
              />
            </CanvaFormRow>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* GIS Autocomplete Search and Suggestion Inputs */}
            <div className="relative">
              <CanvaFormRow label="VERIFIED 911 ROUTE (Exact Entrance Location)">
                <CanvaInput 
                  ref={formInputRef}
                  placeholder={googleMapsLoaded ? "Type address or landmark..." : "Type e.g. Enumclaw or Renton EOC..."}
                  value={formVerified911Address}
                  onChange={(e) => handleAddressInputChange(e.target.value, false)}
                  onFocus={() => { if (!googleMapsLoaded && formVerified911Address.trim().length > 2) setShowFormSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowFormSuggestions(false), 200)}
                />
              </CanvaFormRow>
              
              {/* Autocomplete Local Overlay */}
              {!googleMapsLoaded && showFormSuggestions && formSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto custom-scroll divide-y divide-zinc-900">
                  {formSuggestions.map((item, idx) => (
                    <div 
                      key={idx}
                      onMouseDown={() => handleSelectAutocomplete(item, false)}
                      className="p-3 hover:bg-zinc-900/60 cursor-pointer text-left space-y-0.5 transition-colors"
                    >
                      <div className="text-xs font-black text-zinc-200 flex items-center justify-between">
                        <span>{item.name}</span>
                        <span className="text-[8px] font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-amber-500 uppercase">GIS Lookup</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {item.address}, {item.city}, {item.county}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <CanvaFormRow label="City">
              <CanvaInput 
                placeholder="e.g. Edmonds"
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
              />
            </CanvaFormRow>

            <CanvaFormRow 
              label="County"
              rightElement={<CanvaDropdownCustomizer dropdownKey="wa_counties" label="County" />}
            >
              <CanvaSelect 
                value={formCounty}
                onChange={(e) => setFormCounty(e.target.value)}
              >
                {(dropdowns.wa_counties || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </CanvaSelect>
            </CanvaFormRow>

            <CanvaFormRow label="Hours of Operation">
              <CanvaInput 
                placeholder="e.g. 08:00 - 18:00 / 24hrs on activation"
                value={formHoursOfOperation}
                onChange={(e) => setFormHoursOfOperation(e.target.value)}
              />
            </CanvaFormRow>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CanvaFormRow label="MOU Document Link (Google Drive)">
              <CanvaInput 
                placeholder="https://drive.google.com/..."
                value={formMouDocumentUrl}
                onChange={(e) => setFormMouDocumentUrl(e.target.value)}
              />
            </CanvaFormRow>

            <CanvaFormRow label="Floor Plan Link (Google Drive)">
              <CanvaInput 
                placeholder="https://drive.google.com/..."
                value={formFloorPlanUrl}
                onChange={(e) => setFormFloorPlanUrl(e.target.value)}
              />
            </CanvaFormRow>

            <CanvaFormRow label="Local Photo (Simulates Firebase Storage)">
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer bg-zinc-950 border border-zinc-900 hover:border-amber-500 rounded-lg flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors p-3 font-mono font-medium">
                  <Upload size={14} className="text-amber-500" /> Choose File
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handlePhotoUpload(e, false)} 
                    className="hidden" 
                  />
                </label>
                {formPhotoUrl && (
                  <div className="h-11 w-11 rounded-lg overflow-hidden border border-zinc-800 shrink-0 bg-zinc-900">
                    <img src={formPhotoUrl} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </CanvaFormRow>

            <CanvaFormRow label="Or Custom Photo URL">
              <CanvaInput 
                placeholder="e.g. Unsplash link..."
                value={formPhotoUrl}
                onChange={(e) => setFormPhotoUrl(e.target.value)}
              />
            </CanvaFormRow>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CanvaFormRow label="Primary Keyholder Name">
              <CanvaInput 
                placeholder="e.g. Pastor John Davis"
                value={formPrimaryKeyholder}
                onChange={(e) => setFormPrimaryKeyholder(e.target.value)}
              />
            </CanvaFormRow>

            <CanvaFormRow label="Primary Phone">
              <CanvaInput 
                value={formPrimaryPhone}
                onChange={(e) => setFormPrimaryPhone(e.target.value)}
              />
            </CanvaFormRow>

            <CanvaFormRow label="Secondary Keyholder Name">
              <CanvaInput 
                placeholder="e.g. Lisa Jackson"
                value={formSecondaryKeyholder}
                onChange={(e) => setFormSecondaryKeyholder(e.target.value)}
              />
            </CanvaFormRow>

            <CanvaFormRow label="Secondary Phone">
              <CanvaInput 
                value={formSecondaryPhone}
                onChange={(e) => setFormSecondaryPhone(e.target.value)}
              />
            </CanvaFormRow>
          </div>

          <div className="flex justify-end pt-2">
            <CanvaButton type="submit" variant="primary" className="flex items-center gap-1.5 px-6 h-11 w-full lg:w-auto">
              <Plus size={16} /> Register Facility Node
            </CanvaButton>
          </div>
        </form>
      </CanvaGlassPanel>

      {/* ==========================================
          🏢 ACTIVE FACILITIES REGISTRY LEDGER (WITH ADVANCED GIS SEARCH & FILTERING BAR)
          ========================================== */}
      <CanvaGlassPanel className="p-6 border border-zinc-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-amber-500" />
            <h2 className="text-lg font-black uppercase text-zinc-100 tracking-wider">Active Logistics Registry</h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-950 px-3 py-1.5 border border-zinc-900 rounded-full">
            {filteredFacilities.length} of {facilities.length} Facility Nodes Displayed
          </span>
        </div>

        {/* Advanced GIS Search and Filters Panel */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block flex items-center gap-1">
              <Search size={10} /> Search Directory
            </label>
            <CanvaInput 
              placeholder="Search Name, 911 address, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="p-2 py-2"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
                Filter County
              </label>
              <CanvaDropdownCustomizer dropdownKey="wa_counties" label="County" />
            </div>
            <CanvaSelect 
              value={filterCounty}
              onChange={(e) => setFilterCounty(e.target.value)}
              className="p-2 py-2 text-xs"
            >
              <option value="ALL COUNTIES">ALL COUNTIES</option>
              {countiesList.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </CanvaSelect>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
                Filter City
              </label>
              <CanvaDropdownCustomizer dropdownKey="wa_cities" label="City" />
            </div>
            <CanvaSelect 
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="p-2 py-2 text-xs"
            >
              <option value="ALL CITIES">ALL CITIES</option>
              {citiesList.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </CanvaSelect>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
              Filter Status
            </label>
            <CanvaSelect 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 py-2 text-xs"
            >
              <option value="ALL STATUSES">ALL STATUSES</option>
              <option value="ACTIVE">ACTIVE (HOT)</option>
              <option value="STANDBY">STAND-BY (WARM)</option>
              <option value="COLD">COLD (INACTIVE)</option>
            </CanvaSelect>
          </div>
        </div>

        <div className="overflow-x-auto custom-scroll">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase font-extrabold text-zinc-500 tracking-widest">
                <th className="pb-3 pl-4">Identifier / Type</th>
                <th className="pb-3">Facility Name & VERIFIED 911 Entry</th>
                <th className="pb-3">Jurisdiction (City/County)</th>
                <th className="pb-3">Keyholders & Hours</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-xs">
              {filteredFacilities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-600 font-bold tracking-wide">
                    NO LOGISTICS FACILITIES MATCH THE CHOSEN GIS FILTERS
                  </td>
                </tr>
              ) : (
                filteredFacilities.map((facility) => (
                  <tr key={facility.id} className="hover:bg-zinc-950/40 transition-colors">
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={facility.photoUrl || getTypeDefaultPhoto(facility.type)} 
                          alt={facility.name} 
                          className="h-10 w-10 object-cover rounded-lg border border-zinc-800 shrink-0 bg-zinc-900"
                        />
                        <div>
                          <span 
                            className="font-mono font-black text-zinc-100 text-sm hover:text-amber-400 cursor-pointer transition-colors"
                            onClick={() => handleOpenDetails(facility)}
                          >
                            {facility.id}
                          </span>
                          <div className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">
                            {facility.type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-bold text-zinc-300">
                      <div>{facility.name}</div>
                      
                      {/* Priority Red Highlighted 911 Address Entry */}
                      <div className="flex items-start gap-1 text-[10px] mt-1.5">
                        <ShieldAlert size={12} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-red-500 font-extrabold font-mono tracking-wider mr-1">911 ENTRANCE:</span>
                          <span className="text-zinc-400 font-medium">{facility.verified911Address}</span>
                          <a 
                            href={getGoogleDirectionsUrl(facility)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-amber-500 hover:text-amber-400 font-mono font-bold ml-2 hover:underline inline-flex items-center gap-0.5"
                          >
                            Route <ExternalLink size={8} />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-black text-zinc-300">
                      <div className="font-extrabold">{facility.city.toUpperCase()}</div>
                      <div className="text-[10px] text-zinc-500 font-medium font-mono mt-0.5">{facility.county.toUpperCase()}</div>
                    </td>
                    <td className="py-4 text-zinc-300 space-y-1">
                      <div className="font-semibold flex items-center gap-1">
                        <Key size={10} className="text-amber-500 shrink-0" />
                        <span>{facility.primaryKeyholder} ({facility.primaryPhone})</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                        <Clock size={10} className="text-zinc-600 shrink-0" />
                        <span>{facility.hoursOfOperation}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <select
                        value={facility.status}
                        onChange={(e) => handleStatusChange(facility.id, e.target.value as Facility['status'])}
                        className={`font-mono font-black text-[10px] border uppercase tracking-wider px-2.5 py-1.5 rounded-full cursor-pointer focus:outline-none ${
                          facility.status === 'ACTIVE'
                            ? 'bg-green-500/15 border-green-500/30 text-green-500'
                            : facility.status === 'STANDBY'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <option value="COLD">COLD (INACTIVE)</option>
                        <option value="STANDBY">STAND-BY (WARM)</option>
                        <option value="ACTIVE">ACTIVE (HOT)</option>
                      </select>
                    </td>
                    <td className="py-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <CanvaButton
                          variant="secondary"
                          onClick={() => handleOpenDetails(facility)}
                          className="p-1 px-2.5 text-[10px] flex items-center gap-1"
                          title="View Full Details"
                        >
                          <Eye size={12} /> Details
                        </CanvaButton>
                        <CanvaButton
                          variant="danger"
                          onClick={() => handleDeleteFacility(facility.id)}
                          className="py-1 px-2.5 text-[10px]"
                          title="Decommission Facility"
                        >
                          <Trash2 size={12} />
                        </CanvaButton>
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
          🔍 DETAILED FACILITY POPUP MODAL (EDITABLE & INTEGRATING DOCUMENTS)
          ========================================== */}
      {selectedFacility && editFacility && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full">
            <CanvaGlassPanel className="p-6 border border-zinc-800 space-y-6 relative overflow-hidden" glow>
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
              
              {/* Premium Facility Hero Photo Banner */}
              <div className="relative h-44 w-full rounded-xl overflow-hidden border border-zinc-800 shrink-0">
                <img 
                  src={editFacility.photoUrl || getTypeDefaultPhoto(editFacility.type)} 
                  alt={editFacility.name} 
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-extrabold bg-amber-500 text-black px-2 py-0.5 rounded uppercase tracking-wider">{editFacility.id}</span>
                    <h3 className="text-xl font-black text-zinc-100 uppercase tracking-wide drop-shadow-md">{editFacility.name || 'UNNAMED NODE'}</h3>
                  </div>
                </div>
              </div>

              {/* Physical Navigation Panel */}
              <div className="bg-zinc-950/40 p-4 border border-zinc-900/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-wider block flex items-center gap-1">
                    <ShieldAlert size={12} /> VERIFIED 911 RESPONDER ENTRY ROUTE
                  </span>
                  <div className="flex items-center gap-2 text-xs text-zinc-300 font-bold">
                    <MapPin size={14} className="text-amber-500 shrink-0" />
                    <span>{editFacility.verified911Address || 'TBD Address'}, {editFacility.city.toUpperCase()}, WA</span>
                  </div>
                </div>
                {editFacility.verified911Address && (
                  <CanvaButton 
                    type="button"
                    variant="secondary"
                    onClick={() => window.open(getGoogleDirectionsUrl(editFacility), '_blank')}
                    className="flex items-center gap-1.5 py-2 px-3 text-[11px] font-mono self-start md:self-auto shrink-0"
                  >
                    <ExternalLink size={12} /> Dispatch Routes
                  </CanvaButton>
                )}
              </div>

              {/* Hybrid Google Drive Integrated Documents Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-950/50 p-4 border border-zinc-900 rounded-xl flex flex-col justify-between h-28">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block flex items-center gap-1">
                      <FileText size={12} className="text-amber-500" /> Memorandum of Understanding (MOU)
                    </span>
                    <p className="text-[10px] text-zinc-400">Official mutual-aid property agreement contract.</p>
                  </div>
                  {editFacility.mouDocumentUrl ? (
                    <CanvaButton 
                      type="button"
                      variant="secondary"
                      onClick={() => window.open(editFacility.mouDocumentUrl, '_blank')}
                      className="w-full justify-center text-[10px] py-1.5 font-mono flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Open Signed MOU
                    </CanvaButton>
                  ) : (
                    <span className="text-[9px] font-mono font-bold text-zinc-700 uppercase tracking-widest block text-center py-1.5 border border-dashed border-zinc-900 rounded-lg">No MOU Linked</span>
                  )}
                </div>

                <div className="bg-zinc-950/50 p-4 border border-zinc-900 rounded-xl flex flex-col justify-between h-28">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block flex items-center gap-1">
                      <Layout size={12} className="text-amber-500" /> Physical Floor & Exit Plans
                    </span>
                    <p className="text-[10px] text-zinc-400">Emergency exits, kitchens, and facility layout maps.</p>
                  </div>
                  {editFacility.floorPlanUrl ? (
                    <CanvaButton 
                      type="button"
                      variant="secondary"
                      onClick={() => window.open(editFacility.floorPlanUrl, '_blank')}
                      className="w-full justify-center text-[10px] py-1.5 font-mono flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Open Floor Plan
                    </CanvaButton>
                  ) : (
                    <span className="text-[9px] font-mono font-bold text-zinc-700 uppercase tracking-widest block text-center py-1.5 border border-dashed border-zinc-900 rounded-lg">No Floor Plan Linked</span>
                  )}
                </div>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 max-h-[30vh] overflow-y-auto custom-scroll pr-1">
                {/* Name & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CanvaFormRow label="Facility Name">
                    <CanvaInput 
                      value={editFacility.name}
                      onChange={(e) => setEditFacility(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </CanvaFormRow>

                  <CanvaFormRow 
                    label="Facility Type"
                    rightElement={<CanvaDropdownCustomizer dropdownKey="facility_types" label="Facility Type" />}
                  >
                    <CanvaSelect 
                      value={editFacility.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setEditFacility(prev => prev ? { ...prev, type: newType, photoUrl: getTypeDefaultPhoto(newType) } : null);
                      }}
                    >
                      {(dropdowns.facility_types || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </CanvaSelect>
                  </CanvaFormRow>
                </div>

                {/* Status Selector */}
                <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Operational Status</span>
                    <span className="text-xs text-zinc-400">Alter registry deployment state in real-time</span>
                  </div>
                  <select
                    value={editFacility.status}
                    onChange={(e) => {
                      const updatedStatus = e.target.value as Facility['status'];
                      setEditFacility(prev => prev ? { ...prev, status: updatedStatus } : null);
                    }}
                    className={`font-mono font-black text-xs border uppercase tracking-wider px-3.5 py-2 rounded-full cursor-pointer focus:outline-none ${
                      editFacility.status === 'ACTIVE'
                        ? 'bg-green-500/15 border-green-500/30 text-green-500'
                        : editFacility.status === 'STANDBY'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <option value="COLD">COLD (INACTIVE)</option>
                    <option value="STANDBY">STAND-BY (WARM)</option>
                    <option value="ACTIVE">ACTIVE (HOT)</option>
                  </select>
                </div>

                {/* GIS & Routing Coordinates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <CanvaFormRow label="VERIFIED 911 EMERGENCY ADDRESS">
                      <CanvaInput 
                        ref={editInputRef}
                        placeholder={googleMapsLoaded ? "Type address or landmark..." : "Type e.g. Enumclaw or Renton EOC..."}
                        value={editFacility.verified911Address}
                        onChange={(e) => handleAddressInputChange(e.target.value, true)}
                        onFocus={() => { if (!googleMapsLoaded && editFacility.verified911Address.trim().length > 2) setShowEditSuggestions(true); }}
                        onBlur={() => setTimeout(() => setShowEditSuggestions(false), 200)}
                      />
                    </CanvaFormRow>

                    {/* Autocomplete Edit Overlay */}
                    {!googleMapsLoaded && showEditSuggestions && editSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto custom-scroll divide-y divide-zinc-900">
                        {editSuggestions.map((item, idx) => (
                          <div 
                            key={idx}
                            onMouseDown={() => handleSelectAutocomplete(item, true)}
                            className="p-3 hover:bg-zinc-900/60 cursor-pointer text-left space-y-0.5 transition-colors"
                          >
                            <div className="text-xs font-black text-zinc-200 flex items-center justify-between">
                              <span>{item.name}</span>
                              <span className="text-[8px] font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-amber-500 uppercase">GIS Lookup</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {item.address}, {item.city}, {item.county}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <CanvaFormRow label="Hours of Operation">
                    <CanvaInput 
                      value={editFacility.hoursOfOperation}
                      onChange={(e) => setEditFacility(prev => prev ? { ...prev, hoursOfOperation: e.target.value } : null)}
                    />
                  </CanvaFormRow>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CanvaFormRow label="City">
                    <CanvaInput 
                      value={editFacility.city}
                      onChange={(e) => setEditFacility(prev => prev ? { ...prev, city: e.target.value } : null)}
                    />
                  </CanvaFormRow>

                  <CanvaFormRow 
                    label="County"
                    rightElement={<CanvaDropdownCustomizer dropdownKey="wa_counties" label="County" />}
                  >
                    <CanvaSelect 
                      value={editFacility.county}
                      onChange={(e) => setEditFacility(prev => prev ? { ...prev, county: e.target.value } : null)}
                    >
                      {(dropdowns.wa_counties || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </CanvaSelect>
                  </CanvaFormRow>

                  <CanvaFormRow label="Rated Capacity (People)">
                    <CanvaInput 
                      type="number"
                      min="1"
                      value={editFacility.capacity}
                      onChange={(e) => setEditFacility(prev => prev ? { ...prev, capacity: Math.max(1, Number(e.target.value)) } : null)}
                    />
                  </CanvaFormRow>
                </div>

                {/* Uploads and custom link configurations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CanvaFormRow label="MOU Google Drive Shareable Link">
                    <CanvaInput 
                      placeholder="https://drive.google.com/..."
                      value={editFacility.mouDocumentUrl || ''}
                      onChange={(e) => setEditFacility(prev => prev ? { ...prev, mouDocumentUrl: e.target.value } : null)}
                    />
                  </CanvaFormRow>

                  <CanvaFormRow label="Floor Plan Google Drive Shareable Link">
                    <CanvaInput 
                      placeholder="https://drive.google.com/..."
                      value={editFacility.floorPlanUrl || ''}
                      onChange={(e) => setEditFacility(prev => prev ? { ...prev, floorPlanUrl: e.target.value } : null)}
                    />
                  </CanvaFormRow>
                </div>

                {/* Photo & Capabilities */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CanvaFormRow label="Capabilities (Comma Separated)">
                    <CanvaInput 
                      value={editFacility.capabilities.join(', ')}
                      onChange={(e) => {
                        const caps = e.target.value.split(',').map(c => sTrim(c)).filter(Boolean);
                        setEditFacility(prev => prev ? { ...prev, capabilities: caps } : null);
                      }}
                    />
                  </CanvaFormRow>

                  <CanvaFormRow label="Upload Local Photo (Simulates Firebase Storage)">
                    <label className="cursor-pointer bg-zinc-950 border border-zinc-900 hover:border-amber-500 rounded-lg flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors p-3 font-mono font-medium">
                      <Upload size={14} className="text-amber-500" /> Choose Image File
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handlePhotoUpload(e, true)} 
                        className="hidden" 
                      />
                    </label>
                  </CanvaFormRow>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <CanvaFormRow label="Or Edit Custom Photo URL Directly">
                      <CanvaInput 
                        value={editFacility.photoUrl}
                        onChange={(e) => setEditFacility(prev => prev ? { ...prev, photoUrl: e.target.value } : null)}
                      />
                    </CanvaFormRow>
                  </div>
                </div>

                {/* Keyholder Chain Card */}
                <div className="bg-zinc-950/80 border border-zinc-900 p-4 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                    <Key size={14} className="text-amber-500" />
                    <span className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Logistics Keyholder Chain</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <CanvaFormRow label="Primary Keyholder Name">
                        <CanvaInput 
                          value={editFacility.primaryKeyholder}
                          onChange={(e) => setEditFacility(prev => prev ? { ...prev, primaryKeyholder: e.target.value } : null)}
                        />
                      </CanvaFormRow>
                      <CanvaFormRow label="Primary Phone">
                        <CanvaInput 
                          value={editFacility.primaryPhone}
                          onChange={(e) => setEditFacility(prev => prev ? { ...prev, primaryPhone: e.target.value } : null)}
                        />
                      </CanvaFormRow>
                    </div>

                    <div className="space-y-3">
                      <CanvaFormRow label="Secondary Keyholder Name">
                        <CanvaInput 
                          value={editFacility.secondaryKeyholder}
                          onChange={(e) => setEditFacility(prev => prev ? { ...prev, secondaryKeyholder: e.target.value } : null)}
                        />
                      </CanvaFormRow>
                      <CanvaFormRow label="Secondary Phone">
                        <CanvaInput 
                          value={editFacility.secondaryPhone}
                          onChange={(e) => setEditFacility(prev => prev ? { ...prev, secondaryPhone: e.target.value } : null)}
                        />
                      </CanvaFormRow>
                    </div>
                  </div>
                </div>

                {/* Operational Paging sub-panel */}
                <div className="bg-zinc-950/80 border border-zinc-900 p-4 rounded-xl space-y-3">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-1.5 flex justify-between items-center">
                    <span>Operational Activation Paging</span>
                  </div>
                  <div className="flex gap-3">
                    <CanvaButton 
                      type="button"
                      variant="secondary"
                      onClick={() => handleTriggerKeyholderAlert(editFacility, 'STANDBY')}
                      className="flex-1 justify-center"
                    >
                      <Bell size={14} /> Standby Pager
                    </CanvaButton>
                    <CanvaButton 
                      type="button"
                      variant="primary"
                      onClick={() => handleTriggerKeyholderAlert(editFacility, 'ACTIVATE')}
                      className="flex-1 justify-center"
                    >
                      <Shield size={14} /> Activate Node
                    </CanvaButton>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <CanvaButton
                  variant="danger"
                  onClick={() => {
                    handleDeleteFacility(editFacility.id);
                    setSelectedFacility(null);
                    setEditFacility(null);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Decommission Facility
                </CanvaButton>
                <div className="flex gap-2">
                  <CanvaButton
                    variant="secondary"
                    onClick={() => {
                      setSelectedFacility(null);
                      setEditFacility(null);
                    }}
                  >
                    Cancel
                  </CanvaButton>
                  <CanvaButton
                    variant="primary"
                    onClick={() => handleUpdateFacility(editFacility)}
                  >
                    Save Changes
                  </CanvaButton>
                </div>
              </div>
            </CanvaGlassPanel>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsFacilities;
