import React, { useState, useEffect, Suspense } from 'react';
import { EOC_MODULE_REGISTRY, type ModuleDefinition } from './registry/ModuleRegistry';
import { dataBus } from './services/DataBus';
import { useAdminEngine } from './services/AdminEngineService';
import { 
  Radio, 
  Settings, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Tv, 
  Power,
  Menu,
  X,
  Folder,
  FolderOpen,
  FileText,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Shield,
  Activity,
  UserCheck,
  FileSpreadsheet,
  GraduationCap,
  ClipboardCheck,
  Building2,
  MessageSquare,
  Users,
  Kanban,
  Calendar,
  CheckSquare,
  Plus,
  AlertTriangle,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CanvaGlassPanel, 
  CanvaButton, 
  CanvaInput, 
  CanvaSelect, 
  CanvaFormRow, 
  CanvaTextarea, 
  CanvaUnitBadge 
} from './components/DesignSandbox';

// ---------------------------------------------------------
// TYPES & INTERFACES FOR SEQUENTIAL NAVIGATION
// ---------------------------------------------------------
interface MenuNode {
  id: string;
  name: string;
  type: 'module' | 'folder' | 'step';
  icon?: React.ComponentType<any>;
  moduleId?: string; // Links to registered active modules
  description?: string;
  children?: MenuNode[];
}

// ---------------------------------------------------------
// STATIC SEQUENTIAL TREE NAVIGATION STRUCTURE
// ---------------------------------------------------------
const SIDEBAR_TREE_NODES: MenuNode[] = [
  {
    id: 'step-1',
    name: 'STEP 1: BASE PLAN (Setup)',
    type: 'step',
    children: [
      {
        id: 'mission-setup-folder',
        name: 'MISSION SETUP',
        type: 'folder',
        children: [
          {
            id: 'mission-builder-node',
            name: 'MISSION SETUP',
            type: 'module',
            moduleId: 'mission-builder',
            icon: ClipboardCheck,
            description: 'Pre-configure tasks & objectives'
          },
          {
            id: 'ics-resources-node',
            name: 'RESOURCE MANAGER',
            type: 'module',
            moduleId: 'ics-resources',
            icon: Shield,
            description: 'NIMS resource tracking & metrics'
          },
          {
            id: 'contact-manager-node',
            name: 'CONTACT MANAGER',
            type: 'module',
            moduleId: 'contact-manager',
            icon: BookOpen,
            description: 'Emergency roster & CSV directory'
          }
        ]
      }
    ]
  },
  {
    id: 'step-2',
    name: 'STEP 2: FUNCTIONS (Watch & Ops)',
    type: 'step',
    children: [
      {
        id: 'iap-folder',
        name: 'INCIDENT ACTION PLAN (IAP)',
        type: 'folder',
        children: [
          {
            id: 'ics-204-preview',
            name: 'ICS-204 ASSIGNMENTS',
            type: 'module',
            icon: FileText,
            description: 'Operational Assignment Matrix'
          },
          {
            id: 'ics-205-preview',
            name: 'ICS-205 COMMS GRID',
            type: 'module',
            icon: FileSpreadsheet,
            description: 'Radio Frequency Allocation'
          },
          {
            id: 'ics-215-preview',
            name: 'ICS-215 PLANNING',
            type: 'module',
            icon: Activity,
            description: 'Operational Planning Worksheet'
          }
        ]
      },
      {
        id: 'watch-center-folder',
        name: 'WATCH CENTER',
        type: 'folder',
        children: [
          {
            id: 'messaging-center-node',
            name: 'MESSAGE CENTER',
            type: 'module',
            moduleId: 'messaging-center',
            icon: MessageSquare,
            description: 'Ad-hoc SMS & emergency pager'
          },
          {
            id: 'active-incident-node',
            name: 'ACTIVE TRACKER',
            type: 'module',
            moduleId: 'active-incident',
            icon: Shield,
            description: 'Track active EOC missions'
          }
        ]
      },
      {
        id: 'operations-folder',
        name: 'OPERATIONS',
        type: 'folder',
        children: [
          {
            id: 'dashboard-node',
            name: 'EOC DASHBOARD',
            type: 'module',
            moduleId: 'dashboard',
            icon: Activity,
            description: 'Operational summary & statistics'
          },
          {
            id: 'tactical-teams-node',
            name: 'TACTICAL UNITS',
            type: 'module',
            moduleId: 'tactical-teams',
            icon: Users,
            description: 'NIMS unit assembly & staging'
          },
          {
            id: 'tactical-matrix-node',
            name: 'COMMAND MATRIX',
            type: 'module',
            moduleId: 'tactical-matrix',
            icon: Kanban,
            description: 'Real-time assignment logs'
          }
        ]
      },
      {
        id: 'event-management-folder',
        name: 'EVENT MANAGEMENT',
        type: 'folder',
        children: [
          {
            id: 'pre-event-preview',
            name: 'PRE-EVENT COORDINATION',
            type: 'module',
            icon: Calendar,
            description: 'Staging & multi-agency logistics'
          },
          {
            id: 'eap-preview',
            name: '(EAP) EVENT ACTION PLAN',
            type: 'module',
            icon: FileText,
            description: 'Special event security & plans'
          },
          {
            id: 'volunteer-mgmt-preview',
            name: 'VOLUNTEER MANAGEMENT',
            type: 'module',
            icon: UserCheck,
            description: 'Volunteer recruitment & tracking'
          }
        ]
      }
    ]
  },
  {
    id: 'step-3',
    name: 'STEP 3: LOGISTICS & ADMIN',
    type: 'step',
    children: [
      {
        id: 'logistics-facilities-node',
        name: 'LOGISTICS & FACILITIES',
        type: 'module',
        moduleId: 'logistics-facilities',
        icon: Building2,
        description: 'Manage shelters & support hubs'
      },
      {
        id: 'training-preview',
        name: 'TRAINING & LOG',
        type: 'module',
        icon: GraduationCap,
        description: 'Exercise scheduling & tracking'
      },
      {
        id: 'admin-preview',
        name: 'ADMINISTRATION & COSTS',
        type: 'module',
        icon: FileSpreadsheet,
        description: 'Incident expense logs'
      },
      {
        id: 'planning-preview',
        name: 'PLANNING & SAFETY',
        type: 'module',
        icon: Shield,
        description: 'Long-term mitigation plans'
      },
      {
        id: 'app-settings-node',
        name: 'APP SETTINGS',
        type: 'module',
        moduleId: 'app-settings',
        icon: Sliders,
        description: 'Customize pulldown menus and system configuration'
      },
      {
        id: 'about-preview',
        name: 'EOC SYSTEM NOTES',
        type: 'module',
        icon: FileText,
        description: 'Editable EOC system logs & active watch reminders'
      }
    ]
  }
];

// ---------------------------------------------------------
// APP COMPONENT
// ---------------------------------------------------------
const App: React.FC = () => {
  const { isAdminMode, setAdminMode } = useAdminEngine();
  // Onboarding & Device States
  const [onboarded, setOnboarded] = useState(false);
  const [deviceProfile, setDeviceProfile] = useState<'PHONE' | 'TABLET' | 'DESKTOP' | 'EOC'>('DESKTOP');
  
  // Active/Configured Modules
  const [activeModuleIds, setActiveModuleIds] = useState<string[]>([
    'mission-builder', 'active-incident', 'dashboard', 'contact-manager', 'logistics-facilities', 'messaging-center', 'tactical-teams', 'tactical-matrix', 'ics-resources', 'app-settings'
  ]);
  const [activeModule, setActiveModule] = useState<ModuleDefinition | null>(null);
  const [systemTime, setSystemTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setSystemTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // UI Folder / Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminShelfOpen, setAdminShelfOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'step-1': true,
    'mission-setup-folder': false,
    'step-2': true,
    'iap-folder': false,
    'watch-center-folder': false,
    'operations-folder': false,
    'event-management-folder': false,
    'step-3': true
  });
  
  // Interactive sliding worksheets preview state
  const [previewSheetNode, setPreviewSheetNode] = useState<MenuNode | null>(null);

  // Synchronize dynamic active registry selections
  useEffect(() => {
    const activeRegistry = EOC_MODULE_REGISTRY.filter(m => activeModuleIds.includes(m.id));
    if (activeRegistry.length > 0) {
      if (!activeModule || !activeModuleIds.includes(activeModule.id)) {
        // Default to Dashboard or first active module
        const dash = activeRegistry.find(m => m.id === 'dashboard');
        setActiveModule(dash || activeRegistry[0]);
      }
    } else {
      setActiveModule(null);
    }
  }, [activeModuleIds]);

  const toggleModuleId = (id: string) => {
    if (activeModuleIds.includes(id)) {
      if (activeModuleIds.length > 1) {
        setActiveModuleIds(activeModuleIds.filter(m => m !== id));
        dataBus.broadcast({
          type: 'SYSTEM',
          origin: 'SENTINEL CORE',
          payload: { message: `Module de-activated: ${id.toUpperCase()}` },
          severity: 'medium'
        });
      }
    } else {
      setActiveModuleIds([...activeModuleIds, id]);
      dataBus.broadcast({
        type: 'SYSTEM',
        origin: 'SENTINEL CORE',
        payload: { message: `Module activated: ${id.toUpperCase()}` },
        severity: 'low'
      });
    }
  };

  const handleLaunch = () => {
    setOnboarded(true);
    dataBus.broadcast({
      type: 'SYSTEM',
      origin: 'WATCH CENTER CORE',
      payload: { message: `Cascadia EM Watch Center Suite launched under profile: [${deviceProfile}]` },
      severity: 'high'
    });
  };

  const getDeviceIcon = (profile: typeof deviceProfile) => {
    switch (profile) {
      case 'PHONE': return <Smartphone size={18} />;
      case 'TABLET': return <Tablet size={18} />;
      case 'DESKTOP': return <Monitor size={18} />;
      case 'EOC': return <Tv size={18} />;
    }
  };

  // Node Clicking Orchestration (Routing vs Preview Drawer)
  const handleNodeClick = (node: MenuNode) => {
    if (node.type === 'folder') {
      setExpandedNodes(prev => ({ ...prev, [node.id]: !prev[node.id] }));
    } else if (node.type === 'module') {
      if (node.moduleId) {
        const foundModule = EOC_MODULE_REGISTRY.find(m => m.id === node.moduleId);
        if (foundModule) {
          if (!activeModuleIds.includes(node.moduleId)) {
            setActiveModuleIds(prev => [...prev, node.moduleId!]);
            dataBus.broadcast({
              type: 'SYSTEM',
              origin: 'SENTINEL CORE',
              payload: { message: `Auto-activating sequential module: ${node.name}` },
              severity: 'low'
            });
          }
          setActiveModule(foundModule);
        }
      } else {
        // Open sliding preview drawer
        setPreviewSheetNode(node);
      }
    }
  };

  // ---------------------------------------------------------
  // TREE BRANCH CONNECTORS RENDERER (├─, └─)
  // ---------------------------------------------------------
  const renderConnectors = (depth: number, isLast: boolean, parentHasNextSibling: boolean[]) => {
    if (depth === 0) return null;
    return (
      <div className="flex items-stretch h-full self-stretch select-none pr-1.5">
        {parentHasNextSibling.slice(0, depth - 1).map((hasNext, i) => (
          <div key={i} className="w-3 shrink-0 flex justify-center relative h-full">
            {hasNext && <div className="absolute top-0 bottom-0 w-[1px] bg-zinc-700/40" />}
          </div>
        ))}
        <div className="w-3 shrink-0 flex justify-center relative h-full">
          <div className={`absolute top-0 w-[1px] bg-zinc-700/40 ${isLast ? 'h-4' : 'bottom-0'}`} />
          <div className="absolute top-4 left-1.5 w-1.5 h-[1px] bg-zinc-700/40" />
        </div>
      </div>
    );
  };

  // Helper to determine if a menu node is active/visible
  const isNodeVisible = (node: MenuNode): boolean => {
    if (node.type === 'module') {
      if (node.moduleId) {
        return activeModuleIds.includes(node.moduleId);
      }
      return true; // Previews are always visible
    }
    if (node.type === 'folder' || node.type === 'step') {
      return node.children ? node.children.some(isNodeVisible) : false;
    }
    return true;
  };

  // ---------------------------------------------------------
  // RECURSIVE NODE RENDERER
  // ---------------------------------------------------------
  const renderNode = (
    node: MenuNode, 
    depth = 0, 
    index = 0, 
    siblingsLength = 1, 
    parentHasNextSibling: boolean[] = []
  ): React.ReactNode => {
    if (node.type === 'step') {
      const visibleChildren = node.children?.filter(isNodeVisible) || [];
      return (
        <div key={node.id} className="mt-4 mb-1.5 first:mt-0">
          <div className="px-2.5 py-2.5 bg-zinc-900/35 border border-zinc-900/80 rounded-lg flex items-center justify-between shadow-sm select-none">
            <span className="text-[11.5px] font-black text-amber-500 tracking-wider font-mono">
              {node.name}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="mt-1 space-y-0.5">
            {visibleChildren.map((child, idx) => 
              renderNode(child, 1, idx, visibleChildren.length, [])
            )}
          </div>
        </div>
      );
    }

    if (node.type === 'folder') {
      const isExpanded = !!expandedNodes[node.id];
      const FolderIcon = isExpanded ? FolderOpen : Folder;
      const visibleChildren = node.children?.filter(isNodeVisible) || [];
      const hasChildren = visibleChildren.length > 0;

      return (
        <div key={node.id} className="flex flex-col">
          <button
            onClick={() => handleNodeClick(node)}
            className="group flex items-center h-9 hover:bg-zinc-900/30 rounded px-1 text-left transition-colors select-none cursor-pointer"
          >
            {renderConnectors(depth, index === siblingsLength - 1, parentHasNextSibling)}
            
            <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200">
              {isExpanded ? (
                <ChevronDown size={13} className="text-zinc-500 group-hover:text-zinc-300 transition-transform duration-100" />
              ) : (
                <ChevronRight size={13} className="text-zinc-500 group-hover:text-zinc-300 transition-transform duration-100" />
              )}
              <FolderIcon size={15} className="text-amber-500/60 group-hover:text-amber-500 transition-colors" />
              <span className="text-[13px] font-black tracking-wider uppercase truncate">
                {node.name}
              </span>
            </div>
          </button>

          {isExpanded && hasChildren && (
            <div className="flex flex-col">
              {visibleChildren.map((child, idx) => 
                renderNode(
                  child, 
                  depth + 1, 
                  idx, 
                  visibleChildren.length, 
                  [...parentHasNextSibling, index < siblingsLength - 1]
                )
              )}
            </div>
          )}
        </div>
      );
    }

    if (node.type === 'module') {
      const isRealModule = !!node.moduleId;
      const isCurrent = isRealModule && activeModule?.id === node.moduleId;
      const LeafIcon = node.icon || FileText;

      return (
        <button
          key={node.id}
          onClick={() => handleNodeClick(node)}
          className={`group flex items-center h-8.5 rounded px-1 text-left transition-all duration-100 select-none cursor-pointer ${
            isCurrent 
              ? 'bg-amber-500/10 text-[#ffd000] border-r-[2px] border-amber-500/80 shadow-[inset_1px_0_0_rgba(245,158,11,0.05)]' 
              : 'text-zinc-400 hover:bg-zinc-900/20 hover:text-zinc-200'
          }`}
        >
          {renderConnectors(depth, index === siblingsLength - 1, parentHasNextSibling)}

          <div className="flex items-center gap-1.5 pl-2 truncate w-full">
            <LeafIcon 
              size={14} 
              className={isCurrent ? 'text-amber-500' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'} 
            />
            <span className="text-[12px] font-bold tracking-wide uppercase truncate">
              {node.name}
            </span>
            {!isRealModule && (
              <span className="ml-auto mr-1 text-[7.5px] font-mono font-black bg-zinc-900 text-zinc-500 border border-zinc-800/80 px-1 py-0.5 rounded tracking-widest uppercase scale-90">
                PREVIEW
              </span>
            )}
          </div>
        </button>
      );
    }

    return null;
  };

  const activeRegistry = EOC_MODULE_REGISTRY.filter(m => activeModuleIds.includes(m.id));

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden text-[#f4f4f5] font-sans selection:bg-amber-500 selection:text-black">
      
      {/* Onboarding Configuration Overlay */}
      <AnimatePresence>
        {!onboarded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#09090b]/98 z-50 overflow-y-auto flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-8 space-y-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
              
              {/* Header */}
              <div className="space-y-2 text-center border-b border-zinc-900 pb-5">
                <div className="flex justify-center mb-4">
                  <img 
                    src="/assets/logo/cem_logo.png" 
                    alt="Cascadia EM Logo" 
                    className="h-28 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <h1 className="text-3xl font-black uppercase text-zinc-100 tracking-wider font-sans">CASCADIA EM WATCH CENTER SUITE</h1>
                <p className="text-xs font-sans font-bold text-amber-500 tracking-widest uppercase">EVENT & INCIDENT MANAGEMENT TOOLS</p>
              </div>

              {/* Step 1: Device Viewport */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest flex items-center gap-1.5">
                  <span>STEP 1: SELECT DEVICE OPERATIONAL PROFILE</span>
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(['PHONE', 'TABLET', 'DESKTOP', 'EOC'] as const).map((profile) => (
                    <button
                      key={profile}
                      onClick={() => setDeviceProfile(profile)}
                      className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 cursor-pointer ${
                        deviceProfile === profile 
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' 
                          : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-800'
                      }`}
                    >
                      {getDeviceIcon(profile)}
                      <span className="text-[10px] font-extrabold tracking-widest uppercase">{profile}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Standalone Modules */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest flex items-center gap-1.5">
                  <span>STEP 2: CONFIGURE DECOUPLED MODULE ACTIVATIONS</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {EOC_MODULE_REGISTRY.map((module) => {
                    const isActive = activeModuleIds.includes(module.id);
                    return (
                      <div 
                        key={module.id}
                        onClick={() => toggleModuleId(module.id)}
                        className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-zinc-900/40 select-none ${
                          isActive 
                            ? 'bg-zinc-900/60 border-zinc-800 text-zinc-100' 
                            : 'bg-transparent border-zinc-950 text-zinc-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <module.icon size={18} className={isActive ? 'text-amber-500' : 'text-zinc-600'} />
                          <div className="text-left">
                            <div className="text-xs font-extrabold uppercase tracking-wide">{module.name}</div>
                            <div className="text-[9px] font-bold text-zinc-500 uppercase mt-0.5 leading-tight">{module.category} module</div>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isActive}
                          onChange={() => {}} // handled by click
                          className="accent-amber-500 h-4 w-4 rounded"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleLaunch} 
                className="eoc-button-primary w-full py-4 text-sm tracking-widest font-black rounded-2xl flex items-center justify-center gap-2 mt-4"
              >
                <Power size={16} />
                INITIALIZE OPERATIONAL CORE
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main EOC Platform Shell */}
      {onboarded && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Top Header / System Control Panel Drawer */}
          <div className="bg-[#0c0c0e] border-b border-zinc-900 z-30 font-sans print:hidden">
            <div className="px-6 py-3 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-mono font-black text-[#ffd000] tracking-widest uppercase">
                    CASCADIA EM WATCH CENTER SUITE
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                  <span>DEPLOYMENT: {deviceProfile}</span>
                  <span className="text-zinc-800">|</span>
                  <span>MODULES: {activeModuleIds.length} ACTIVE</span>
                  <span className="text-zinc-800">|</span>
                  <span className="text-amber-500 font-black">LOCAL SYSTEM TIME: {systemTime || 'CALIBRATING...'}</span>
                  <span className="text-zinc-800">|</span>
                  <span className="text-zinc-400 font-extrabold">VERSION: v8.1.0-REV-{activeModuleIds.length}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setAdminShelfOpen(!adminShelfOpen)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[10px] font-mono font-black uppercase text-zinc-300 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Settings size={12} className="text-amber-500 animate-spin-slow" />
                  {adminShelfOpen ? 'Hide System Config' : 'Configure OS Toggles'}
                </button>
                <button 
                  onClick={() => setOnboarded(false)}
                  className="px-2.5 py-1.5 hover:bg-red-500/10 hover:text-red-500 text-zinc-500 rounded-lg text-[10px] font-mono font-black uppercase transition-all active:scale-95 cursor-pointer"
                >
                  Shut Down
                </button>
              </div>
            </div>

            {/* Config Panels Shelf */}
            <AnimatePresence>
              {adminShelfOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-zinc-900 bg-[#09090b] px-6 py-4 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Viewport scaling profiles */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Configure Active Layout Screen Model</div>
                      <div className="flex gap-2">
                        {(['PHONE', 'TABLET', 'DESKTOP', 'EOC'] as const).map(profile => (
                          <button
                            key={profile}
                            onClick={() => setDeviceProfile(profile)}
                            className={`flex-1 py-2 border rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                              deviceProfile === profile 
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' 
                                : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-800'
                            }`}
                          >
                            {getDeviceIcon(profile)}
                            {profile}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Standalone activations checklist */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Dynamic Module Activations (Toggles Sidebar)</div>
                      <div className="flex flex-wrap gap-2">
                        {EOC_MODULE_REGISTRY.map(m => {
                          const active = activeModuleIds.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => toggleModuleId(m.id)}
                              className={`px-3 py-1.5 border rounded-lg text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 transition-all ${
                                active 
                                  ? 'bg-zinc-900 border-zinc-700 text-zinc-100' 
                                  : 'bg-transparent border-zinc-950 text-zinc-600'
                              }`}
                            >
                              <m.icon size={11} className={active ? 'text-amber-500' : 'text-zinc-600'} />
                              {m.name.split(' ')[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Dynamic UI Admin Control Row */}
                  <div className="mt-4 pt-4 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-left space-y-0.5">
                      <div className="text-[10px] font-extrabold uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Dynamic Low-Code Engine</span>
                      </div>
                      <div className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-wide">
                        Enables real-time overlays to edit form labels, pull-down selectors, and append dynamic actions.
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setAdminMode(!isAdminMode);
                        dataBus.broadcast({
                          type: 'SYSTEM',
                          origin: 'ADMIN CORE',
                          payload: { message: `Low-Code Admin Mode set to: [${(!isAdminMode).toString().toUpperCase()}]` },
                          severity: 'high'
                        });
                      }}
                      className={`px-4 py-2 border rounded-xl text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                        isAdminMode
                          ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <span>⚙️ {isAdminMode ? 'DISABLE ADMIN EDITOR' : 'ENABLE ADMIN EDITOR'}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main Frame Viewport Base Workspace */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* COLLAPSIBLE FILE TREE SIDEBAR */}
            <motion.aside 
              initial={false}
              animate={{ width: sidebarOpen ? 330 : 70 }}
              className="bg-[#08080a] border-r border-zinc-900 h-full flex flex-col z-20 print:hidden relative"
            >
              {/* Brand Logo Header */}
              <div className="p-4 flex items-center justify-between border-b border-zinc-900/60">
                {sidebarOpen ? (
                  <div className="flex items-center gap-2 select-none">
                    <img 
                      src="/assets/logo/cem_logo.png" 
                      alt="Logo" 
                      className="h-10 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="font-sans font-black text-sm tracking-widest text-[#ffd000]">
                      CASCADIA EM
                    </span>
                  </div>
                ) : (
                  <div className="mx-auto select-none">
                    <img 
                      src="/assets/logo/cem_logo.png" 
                      alt="Logo" 
                      className="h-8 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {sidebarOpen && (
                  <button 
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-750 rounded-lg text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Collapsed Sidebar Active Icon Toolbar */}
              {!sidebarOpen ? (
                <div className="flex-1 flex flex-col items-center py-4 px-2 space-y-3 overflow-y-auto custom-scroll">
                  <button 
                    onClick={() => setSidebarOpen(true)}
                    className="w-10 h-10 flex items-center justify-center bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-750 rounded-xl text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer mb-2"
                    title="Expand Navigation Menu"
                  >
                    <Menu size={16} />
                  </button>

                  <div className="w-8 h-[1px] bg-zinc-900" />

                  {activeRegistry.map((module) => {
                    const isCurrent = activeModule?.id === module.id;
                    return (
                      <button
                        key={module.id}
                        onClick={() => setActiveModule(module)}
                        className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl transition-all active:scale-90 relative group cursor-pointer ${
                          isCurrent 
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.08)]' 
                            : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                        }`}
                      >
                        <module.icon size={18} />
                        
                        {/* High-fidelity tooltips */}
                        <div className="absolute left-14 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider text-zinc-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border-l-[2px] border-l-amber-500">
                          {module.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Fully Expanded Scrollable Folder Tree */
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scroll">
                  {SIDEBAR_TREE_NODES.filter(isNodeVisible).map((node) => renderNode(node))}
                </nav>
              )}

              {/* Bottom Quick-Launch settings dock */}
              <div className="p-3 border-t border-zinc-900 bg-[#060608] flex items-center justify-between select-none">
                {sidebarOpen ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] font-mono font-black text-zinc-500 tracking-wider">SECURE LINK · ON-AIR</span>
                    </div>
                    <button 
                      onClick={() => setAdminShelfOpen(!adminShelfOpen)}
                      className="p-1.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded text-zinc-500 hover:text-amber-500 transition-all cursor-pointer"
                      title="Quick System Config"
                    >
                      <Settings size={12} className="animate-spin-slow" />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setAdminShelfOpen(!adminShelfOpen)}
                    className="mx-auto h-8 w-8 flex items-center justify-center bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-amber-500 transition-all cursor-pointer"
                    title="Quick System Config"
                  >
                    <Settings size={14} className="animate-spin-slow" />
                  </button>
                )}
              </div>
            </motion.aside>

            {/* Active Render Window Workspace Context */}
            <main className="flex-1 overflow-y-auto bg-[#050505] p-6 custom-scroll">
              <Suspense 
                fallback={
                  <div className="h-full flex items-center justify-center text-center p-12">
                    <div className="space-y-4">
                      <div className="w-10 h-10 border-2 border-t-amber-500 border-zinc-900 rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-mono font-black uppercase tracking-wider text-zinc-600">
                        Compiling Dynamic Workspace Module...
                      </p>
                    </div>
                  </div>
                }
              >
                {activeModule ? (
                  <activeModule.component />
                ) : (
                  <div className="h-full flex items-center justify-center p-8">
                    <div className="text-center space-y-3 max-w-sm">
                      <Settings size={36} className="text-zinc-700 animate-pulse mx-auto" />
                      <h2 className="text-sm font-black uppercase text-zinc-500 tracking-wider">ALL MODULES DEACTIVATED</h2>
                      <p className="text-xs text-zinc-600 font-bold leading-normal">
                        Select "Configure OS Toggles" at the top right header to activate stand-alone modules.
                      </p>
                    </div>
                  </div>
                )}
              </Suspense>
            </main>

          </div>
        </div>
      )}

      {/* INTERACTIVE WORKSHEET PREVIEW SLIDING DRAWER */}
      <AnimatePresence>
        {previewSheetNode && (
          <CanvaPreviewDrawer 
            node={previewSheetNode} 
            onClose={() => setPreviewSheetNode(null)} 
          />
        )}
      </AnimatePresence>

    </div>
  );
};

// ---------------------------------------------------------
// CANVA PREVIEW DRAWER SUB-COMPONENT
// ---------------------------------------------------------
interface CanvaPreviewDrawerProps {
  node: MenuNode;
  onClose: () => void;
}

const CanvaPreviewDrawer: React.FC<CanvaPreviewDrawerProps> = ({ node, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#020203]/90 backdrop-blur-sm cursor-pointer"
      />

      {/* Drawer Container */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 210 }}
        className="relative w-full sm:w-[500px] md:w-[650px] lg:w-[800px] h-full bg-[#09090b] border-l border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col z-10"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-[#060608]">
          <div className="flex items-center gap-3 select-none">
            <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.05)]">
              {node.icon ? <node.icon size={20} className="text-amber-500" /> : <FileText size={20} className="text-amber-500" />}
            </div>
            <div className="text-left">
              <div className="text-[9px] font-mono font-black text-amber-500 tracking-widest uppercase">
                NIMS Operational Template Preview
              </div>
              <div className="text-sm font-black text-zinc-100 uppercase tracking-wider mt-0.5 flex items-center gap-2">
                <span>{node.name}</span>
                <span className="text-[8px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.5 rounded uppercase tracking-widest">v1.0 DRAFT</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow"
          >
            <X size={15} />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scroll space-y-6">
          <DrawerRenderer nodeId={node.id} />
        </div>

        {/* Drawer Footer Status */}
        <div className="px-6 py-4 border-t border-zinc-900 bg-[#060608] flex items-center justify-between text-[9px] font-mono font-black uppercase text-zinc-500 tracking-wider">
          <span>CLIENT: CASCADIA EMERGENCY MANAGEMENT</span>
          <span>SYSTEM DOCK STATUS: STAGING MODELLER</span>
        </div>
      </motion.div>
    </div>
  );
};

// ---------------------------------------------------------
// COMPONENT SWITCHER FOR INDIVIDUAL DRAWER PREVIEWS
// ---------------------------------------------------------
const DrawerRenderer: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  switch (nodeId) {
    case 'ics-204-preview':
      return <ICS204Preview />;
    case 'ics-205-preview':
      return <ICS205Preview />;
    case 'ics-215-preview':
      return <ICS215Preview />;
    case 'volunteer-mgmt-preview':
      return <VolunteerManagementPreview />;
    case 'pre-event-preview':
      return <PreEventCoordinationPreview />;
    case 'eap-preview':
      return <EAPPreview />;
    case 'training-preview':
      return <TrainingPreview />;
    case 'admin-preview':
      return <AdminPreview />;
    case 'planning-preview':
      return <PlanningPreview />;
    case 'about-preview':
      return <AboutPreview />;
    default:
      return (
        <div className="p-8 text-center space-y-4">
          <FileText size={48} className="text-zinc-700 mx-auto animate-pulse" />
          <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider">WORKSHEET TEMPLATE CLOSED</h3>
          <p className="text-xs text-zinc-500 font-bold max-w-xs mx-auto leading-normal uppercase">
            Check step guidelines for detail config rules.
          </p>
        </div>
      );
  }
};

// =================================-------------------------
// 1. ICS-204: INCIDENT ASSIGNMENT LIST WORK_SHEET
// =================================-------------------------
const ICS204Preview: React.FC = () => {
  const [tasks, setTasks] = useState([
    { id: 1, resource: 'STRIKE TEAM ALPHA', leader: 'CAPT. M. FEARNEHOUGH', count: 5, status: 'DISPATCHED' },
    { id: 2, resource: 'LOGISTICS SUPPORT-2', leader: 'E. SULLIVAN', count: 3, status: 'STANDBY' },
    { id: 3, resource: 'RESCUE RIG-7', leader: 'T. JENSEN', count: 4, status: 'ACTIVE' }
  ]);
  const [newResource, setNewResource] = useState('');
  const [newLeader, setNewLeader] = useState('');

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResource.trim()) return;
    setTasks([
      ...tasks, 
      {
        id: Date.now(),
        resource: newResource.toUpperCase(),
        leader: newLeader.toUpperCase() || 'STG OPERATOR',
        count: Math.floor(Math.random() * 4) + 2,
        status: 'STANDBY'
      }
    ]);
    setNewResource('');
    setNewLeader('');
  };

  const handleToggleStatus = (id: number) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'STANDBY' ? 'ACTIVE' : t.status === 'ACTIVE' ? 'DISPATCHED' : 'STANDBY';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  return (
    <div className="space-y-6">
      <CanvaGlassPanel className="p-5 space-y-4 border-zinc-800/80">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <CanvaFormRow label="1. Incident Name">
            <CanvaInput value="CASCADIA SUBDUCTION ZONE SEISMIC" readOnly className="bg-zinc-900 border-zinc-800" />
          </CanvaFormRow>
          <CanvaFormRow label="2. Operational Period">
            <CanvaInput value="07/06/2026 08:00 - 07/11/2026 08:00" readOnly className="bg-zinc-900 border-zinc-800" />
          </CanvaFormRow>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <CanvaFormRow label="3. Branch/Division">
            <CanvaInput value="BRANCH II - DIVISION DELTA" readOnly className="bg-zinc-900 border-zinc-800" />
          </CanvaFormRow>
          <CanvaFormRow label="4. Division/Group Supervisor">
            <CanvaInput value="MICHAEL FEARNEHOUGH" readOnly className="bg-zinc-900 border-zinc-800" />
          </CanvaFormRow>
        </div>
      </CanvaGlassPanel>

      {/* Task List Form */}
      <CanvaGlassPanel className="p-5 space-y-4">
        <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">5. Resource Tactical Assignments</h4>
        
        <form onSubmit={handleAddAssignment} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <CanvaFormRow label="Resource Identifier">
            <CanvaInput 
              value={newResource} 
              onChange={e => setNewResource(e.target.value)} 
              placeholder="e.g. Strike Team Delta"
              className="uppercase placeholder-zinc-700" 
            />
          </CanvaFormRow>
          <CanvaFormRow label="Unit Leader Name">
            <CanvaInput 
              value={newLeader} 
              onChange={e => setNewLeader(e.target.value)} 
              placeholder="e.g. Capt. Sullivan"
              className="uppercase placeholder-zinc-700" 
            />
          </CanvaFormRow>
          <CanvaButton type="submit" variant="primary" className="h-[46px] w-full text-xs font-black">
            <Plus size={14} /> Add Resource
          </CanvaButton>
        </form>

        <div className="border border-zinc-900/60 rounded-xl overflow-hidden mt-4">
          <table className="w-full text-[11px] text-left border-collapse bg-black/40">
            <thead>
              <tr className="bg-zinc-900/60 border-b border-zinc-800/80 text-zinc-500 font-extrabold uppercase font-mono">
                <th className="p-3">Resource Block</th>
                <th className="p-3">Unit Leader</th>
                <th className="p-3">Personnel</th>
                <th className="p-3 text-right">Operational Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr 
                  key={t.id} 
                  onClick={() => handleToggleStatus(t.id)}
                  className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors cursor-pointer"
                >
                  <td className="p-3 font-extrabold text-zinc-300 uppercase">{t.resource}</td>
                  <td className="p-3 font-semibold text-zinc-400 uppercase">{t.leader}</td>
                  <td className="p-3 font-bold text-zinc-400 font-mono">{t.count} Specialists</td>
                  <td className="p-3 text-right">
                    <CanvaUnitBadge name={t.resource} status={t.status} size="small" className="ml-auto pointer-events-none" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CanvaGlassPanel>

      <CanvaGlassPanel className="p-5 space-y-2">
        <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">6. Special Instructions & Safety Parameters</h4>
        <CanvaTextarea 
          readOnly 
          value="Ensure all personnel maintain active UHF tactical channel 2 coms. Out-of-band pager is armed. Complete hourly status reports to Cascadia Watch Center. Verify gas monitor lines inside Sector A." 
          className="bg-zinc-900/40 text-xs border-zinc-800 font-mono italic"
        />
      </CanvaGlassPanel>
    </div>
  );
};

// =================================-------------------------
// 2. ICS-205: RADIO COMMUNICATIONS PLAN COMMS GRID
// =================================-------------------------
const ICS205Preview: React.FC = () => {
  const [activeRow, setActiveRow] = useState<number | null>(null);

  const channels = [
    { ch: 1, name: 'CS-CMD-1', type: 'REPEATER', rx: '155.340 MHz', tx: '158.400 MHz', tone: '100.0 Hz', func: 'EOC COMMAND GATEWAY' },
    { ch: 2, name: 'CS-TAC-2', type: 'DIRECT', rx: '156.125 MHz', tx: '156.125 MHz', tone: 'CSQ', func: 'TACTICAL FIELD OPS' },
    { ch: 3, name: 'CS-LOG-3', type: 'REPEATER', rx: '151.625 MHz', tx: '154.570 MHz', tone: '123.0 Hz', func: 'SHELTER LOGISTICS' },
    { ch: 4, name: 'CS-AIR-OPS', type: 'DIRECT', rx: '122.850 MHz', tx: '122.850 MHz', tone: 'AM AIR', func: 'SAR AIR-TO-GROUND' },
    { ch: 5, name: 'CS-DATA-5', type: 'REPEATER', rx: '462.562 MHz', tx: '467.562 MHz', tone: '141.3 Hz', func: 'TELEMETRY & APRS' }
  ];

  return (
    <div className="space-y-6">
      <CanvaGlassPanel className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider flex items-center gap-1.5">
            <Radio size={14} className="text-amber-500 animate-pulse" />
            <span>Incident Radio Communications Grid</span>
          </h4>
          <span className="text-[8px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[#ffd000] uppercase tracking-widest">PT FREQUENCIES LOCKED</span>
        </div>

        <div className="border border-zinc-900 rounded-xl overflow-hidden bg-black/30">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-500 font-extrabold uppercase font-mono">
                <th className="p-3.5">CH #</th>
                <th className="p-3.5">Channel Tag</th>
                <th className="p-3.5">RX Freq</th>
                <th className="p-3.5">TX Freq</th>
                <th className="p-3.5">PL/Tone</th>
                <th className="p-3.5">Operational Allocation</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => {
                const isSelected = activeRow === c.ch;
                return (
                  <tr 
                    key={c.ch}
                    onClick={() => setActiveRow(isSelected ? null : c.ch)}
                    className={`border-b border-zinc-900/60 transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-500/5 text-[#ffd000]' 
                        : 'hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <td className="p-3.5 font-black font-mono">{String(c.ch).padStart(2, '0')}</td>
                    <td className="p-3.5 font-extrabold uppercase">{c.name}</td>
                    <td className="p-3.5 font-bold font-mono">{c.rx}</td>
                    <td className="p-3.5 font-bold font-mono">{c.tx}</td>
                    <td className="p-3.5 font-bold text-zinc-500 font-mono">{c.tone}</td>
                    <td className="p-3.5 font-extrabold uppercase text-[10px] tracking-wide">{c.func}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CanvaGlassPanel>

      <AnimatePresence>
        {activeRow !== null && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <CanvaGlassPanel className="p-5 border-amber-500/20 bg-amber-500/[0.02] flex items-start gap-4">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="space-y-1.5">
                <h5 className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest font-mono">COMMS LINK PROTOCOL</h5>
                <p className="text-xs text-zinc-400 font-bold leading-normal">
                  Channel <span className="text-[#ffd000] font-black">CH-{String(activeRow).padStart(2, '0')}</span> is reserved specifically for <span className="text-zinc-200 uppercase font-extrabold">{channels.find(c => c.ch === activeRow)?.func}</span>. Real-time logging requires direct physical radio check-in before field dispatch can commence.
                </p>
              </div>
            </CanvaGlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =================================-------------------------
// 3. ICS-215: OPERATIONAL PLANNING WORKSHEET
// =================================-------------------------
const ICS215Preview: React.FC = () => {
  const [demands, setDemands] = useState([
    { id: 1, division: 'DIVISION A (WATERFRONT)', type: 'RESCUE SQUAD', needed: 4, available: 3 },
    { id: 2, division: 'DIVISION B (COMMERCIAL)', type: 'HEAVY EQUIPMENT', needed: 2, available: 2 },
    { id: 3, division: 'DIVISION C (RESIDENTIAL)', type: 'MEDICAL STAGING', needed: 3, available: 4 },
    { id: 4, division: 'STAGING COVE', type: 'SANDBAG / FLOOD RES', needed: 6, available: 3 }
  ]);

  const handleAdjustValue = (id: number, field: 'needed' | 'available', increment: boolean) => {
    setDemands(demands.map(d => {
      if (d.id === id) {
        const val = d[field];
        const nextVal = increment ? val + 1 : Math.max(0, val - 1);
        return { ...d, [field]: nextVal };
      }
      return d;
    }));
  };

  return (
    <div className="space-y-6">
      <CanvaGlassPanel className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">Operational Planning Matrix (NIMS Resources Demand/Supply)</h4>
          <span className="text-[8px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[#ffd000] uppercase tracking-widest">LIVE PLAN CAPABILITY</span>
        </div>

        <div className="border border-zinc-900 rounded-xl overflow-hidden bg-black/40">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-500 font-extrabold uppercase font-mono">
                <th className="p-3.5">Division / Group</th>
                <th className="p-3.5">Resource Kind/Type</th>
                <th className="p-3.5 text-center">Required (Needed)</th>
                <th className="p-3.5 text-center">Available (On-Hand)</th>
                <th className="p-3.5 text-right">Variance (Balance)</th>
              </tr>
            </thead>
            <tbody>
              {demands.map((d) => {
                const variance = d.available - d.needed;
                let statusBadge = (
                  <span className="text-[9px] font-mono font-black bg-zinc-900 text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded">0 OK</span>
                );
                if (variance < 0) {
                  statusBadge = (
                    <span className="text-[9px] font-mono font-black bg-red-950/20 text-red-500 border border-red-800/30 px-2 py-0.5 rounded uppercase tracking-wide">
                      {variance} SHORTAGE
                    </span>
                  );
                } else if (variance > 0) {
                  statusBadge = (
                    <span className="text-[9px] font-mono font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wide">
                      +{variance} SURPLUS
                    </span>
                  );
                }

                return (
                  <tr key={d.id} className="border-b border-zinc-900 hover:bg-zinc-900/35 transition-colors">
                    <td className="p-3.5 font-extrabold text-zinc-300 uppercase">{d.division}</td>
                    <td className="p-3.5 font-bold text-zinc-400 uppercase">{d.type}</td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleAdjustValue(d.id, 'needed', false)}
                          className="h-5 w-5 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 cursor-pointer font-bold select-none text-xs"
                        >
                          -
                        </button>
                        <span className="font-black font-mono w-5 text-center">{d.needed}</span>
                        <button 
                          onClick={() => handleAdjustValue(d.id, 'needed', true)}
                          className="h-5 w-5 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 cursor-pointer font-bold select-none text-xs"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleAdjustValue(d.id, 'available', false)}
                          className="h-5 w-5 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 cursor-pointer font-bold select-none text-xs"
                        >
                          -
                        </button>
                        <span className="font-black font-mono w-5 text-center">{d.available}</span>
                        <button 
                          onClick={() => handleAdjustValue(d.id, 'available', true)}
                          className="h-5 w-5 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 cursor-pointer font-bold select-none text-xs"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5 text-right">{statusBadge}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CanvaGlassPanel>
    </div>
  );
};

// =================================-------------------------
// 4. VOLUNTEER MANAGEMENT PREVIEW
// =================================-------------------------
const VolunteerManagementPreview: React.FC = () => {
  const [volunteers, setVolunteers] = useState([
    { id: 1, name: 'SARAH CONNOR', role: 'Medical Assistant', contact: '(206) 786-5300', status: 'CHECKED IN', hours: 14 },
    { id: 2, name: 'JOHN DOE', role: 'Sandbag Logistics', contact: 'john.doe@gmail.com', status: 'STANDBY', hours: 4 },
    { id: 3, name: 'ROBERT VANCE', role: 'Logistics Clerk', contact: 'rvance@refrigerator.com', status: 'CHECKED IN', hours: 8 }
  ]);

  const handleToggleState = (id: number) => {
    setVolunteers(volunteers.map(v => {
      if (v.id === id) {
        const nextStatus = v.status === 'CHECKED IN' ? 'STANDBY' : 'CHECKED IN';
        return { ...v, status: nextStatus };
      }
      return v;
    }));
  };

  const handleLogHour = (id: number) => {
    setVolunteers(volunteers.map(v => {
      if (v.id === id) {
        return { ...v, hours: v.hours + 1 };
      }
      return v;
    }));
  };

  const checkedInCount = volunteers.filter(v => v.status === 'CHECKED IN').length;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        <CanvaGlassPanel className="p-4 text-center">
          <div className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">TOTAL ROSTER</div>
          <div className="text-2xl font-black text-zinc-100 font-mono mt-1">{volunteers.length}</div>
        </CanvaGlassPanel>
        <CanvaGlassPanel className="p-4 text-center">
          <div className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">ACTIVE ON-DUTY</div>
          <div className="text-2xl font-black text-green-400 font-mono mt-1">{checkedInCount}</div>
        </CanvaGlassPanel>
        <CanvaGlassPanel className="p-4 text-center">
          <div className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">VOLUNTEER HOURS</div>
          <div className="text-2xl font-black text-[#ffd000] font-mono mt-1">
            {volunteers.reduce((sum, v) => sum + v.hours, 0)} Hrs
          </div>
        </CanvaGlassPanel>
      </div>

      {/* Volunteer List */}
      <CanvaGlassPanel className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">Emergency Roster Registry</h4>
          <span className="text-[8px] font-mono text-zinc-500 uppercase">Interactive Check-In Tracker</span>
        </div>

        <div className="space-y-3">
          {volunteers.map((v) => (
            <div 
              key={v.id}
              className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between gap-4"
            >
              <div className="text-left space-y-1">
                <div className="text-xs font-black text-zinc-200 uppercase tracking-wide">{v.name}</div>
                <div className="text-[10px] font-extrabold text-[#ffd000] uppercase tracking-wider font-mono">{v.role}</div>
                <div className="text-[9px] text-zinc-500 font-mono">{v.contact}</div>
              </div>

              <div className="flex items-center gap-3">
                {/* Hours Tracker badge */}
                <button 
                  onClick={() => handleLogHour(v.id)}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[9px] font-mono font-bold uppercase text-zinc-400 active:scale-95 transition-all cursor-pointer select-none"
                  title="Add hour"
                >
                  {v.hours} Hours +
                </button>

                {/* Status Toggle Button */}
                <button
                  onClick={() => handleToggleState(v.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider border transition-all active:scale-95 cursor-pointer select-none ${
                    v.status === 'CHECKED IN' 
                      ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  {v.status}
                </button>
              </div>
            </div>
          ))}
        </div>
      </CanvaGlassPanel>
    </div>
  );
};

// =================================-------------------------
// 5. PRE-EVENT COORDINATION PREVIEW
// =================================-------------------------
const PreEventCoordinationPreview: React.FC = () => {
  return (
    <div className="space-y-6">
      <CanvaGlassPanel className="p-5 space-y-4">
        <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">Multi-Agency Staging Coordination</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2">
            <h5 className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-wider">FEMA Region X Liaison</h5>
            <div className="text-xs text-zinc-400 font-bold uppercase">Staging Location: Sector Alpha (Seaport)</div>
            <div className="text-xs text-zinc-500 font-bold uppercase mt-1">Status: Checked-In · 24 Specialists</div>
          </div>
          <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2">
            <h5 className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-wider">County Red Cross Logistics</h5>
            <div className="text-xs text-zinc-400 font-bold uppercase">Staging Location: Shelter Point Beta</div>
            <div className="text-xs text-zinc-500 font-bold uppercase mt-1">Status: En Route · 8 Sheltering Staff</div>
          </div>
        </div>

        <CanvaGlassPanel className="p-4 border-zinc-900 bg-[#060608]">
          <h5 className="text-[10px] font-mono font-black text-zinc-300 uppercase tracking-widest">Active Preparedness Checklist</h5>
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-bold uppercase">
              <CheckSquare size={13} className="text-amber-500" />
              <span>Confirm communications repeater linking protocols</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-bold uppercase">
              <CheckSquare size={13} className="text-amber-500" />
              <span>Validate critical supply cache levels</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-zinc-500 font-bold uppercase">
              <div className="h-3 w-3 border border-zinc-800 rounded bg-zinc-950" />
              <span className="text-zinc-600 font-normal">Audit mobile incident command unit logistics</span>
            </div>
          </div>
        </CanvaGlassPanel>
      </CanvaGlassPanel>
    </div>
  );
};

// =================================-------------------------
// 6. EVENT ACTION PLAN (EAP) PREVIEW
// =================================-------------------------
const EAPPreview: React.FC = () => {
  return (
    <div className="space-y-6">
      <CanvaGlassPanel className="p-5 space-y-4">
        <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">Special Event Security & Operational Logistics</h4>

        <div className="space-y-3.5 text-xs text-zinc-400 font-medium">
          <CanvaFormRow label="Event Plan Name">
            <CanvaInput value="ANNUAL SEAPORT FLOOD PREPAREDNESS MARATHON" readOnly className="bg-zinc-900 border-zinc-800 font-bold" />
          </CanvaFormRow>
          <div className="grid grid-cols-2 gap-4">
            <CanvaFormRow label="Incident Commander">
              <CanvaInput value="CHIEF J. SULLIVAN" readOnly className="bg-zinc-900 border-zinc-800" />
            </CanvaFormRow>
            <CanvaFormRow label="Medical Station Lead">
              <CanvaInput value="SARAH CONNOR" readOnly className="bg-zinc-900 border-zinc-800" />
            </CanvaFormRow>
          </div>
        </div>

        <CanvaGlassPanel className="p-4 border-zinc-900 bg-zinc-950/40 space-y-2">
          <h5 className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-wider">Designated Medical Stations</h5>
          <div className="text-xs font-mono space-y-1.5 text-zinc-500">
            <div>• <span className="text-zinc-300 font-extrabold uppercase">STATION ALPHA:</span> PIER 12 SHELTER HUBS [ACTIVE]</div>
            <div>• <span className="text-zinc-300 font-extrabold uppercase">STATION BETA:</span> WATERFRONT PLAZA COMMAND COMPLEX [STANDBY]</div>
          </div>
        </CanvaGlassPanel>
      </CanvaGlassPanel>
    </div>
  );
};

// =================================-------------------------
// 7. TRAINING & LOGS PREVIEW
// =================================-------------------------
const TrainingPreview: React.FC = () => {
  return (
    <div className="space-y-6">
      <CanvaGlassPanel className="p-5 space-y-4">
        <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">Operational Exercise Logs & Drills</h4>

        <div className="space-y-3">
          <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between">
            <div className="text-left space-y-1">
              <div className="text-xs font-black text-zinc-200 uppercase">Operation Groundswell Seismic Drill</div>
              <div className="text-[9px] font-mono font-bold text-amber-500 uppercase">Scheduled: 07/15/2026 · Full-Scale Drill</div>
            </div>
            <span className="text-[9px] font-mono font-black text-zinc-500 uppercase bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">STAGED</span>
          </div>

          <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between">
            <div className="text-left space-y-1">
              <div className="text-xs font-black text-zinc-200 uppercase">Tabletop Radio Grid Simulation</div>
              <div className="text-[9px] font-mono font-bold text-green-400 uppercase">Completed: 05/10/2026 · Simulation</div>
            </div>
            <span className="text-[9px] font-mono font-black text-green-400 uppercase bg-green-950/10 border border-green-800/20 px-2 py-1 rounded font-black">COMPLETED</span>
          </div>
        </div>
      </CanvaGlassPanel>
    </div>
  );
};

// =================================-------------------------
// 8. ADMIN & COSTS PREVIEW (Interactive Expense Tracker)
// =================================-------------------------
const AdminPreview: React.FC = () => {
  const [rate, setRate] = useState<number>(150);
  const [hours, setHours] = useState<number>(12);
  const [category, setCategory] = useState<'PERSONNEL' | 'EQUIPMENT' | 'FACILITY'>('PERSONNEL');
  const [calcTotal, setCalcTotal] = useState<number>(1800);

  useEffect(() => {
    setCalcTotal(rate * hours);
  }, [rate, hours]);

  return (
    <div className="space-y-6">
      {/* Budget Summary Row */}
      <div className="grid grid-cols-2 gap-4">
        <CanvaGlassPanel className="p-4 text-center">
          <div className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">LOGGED INCIDENT EXPENSES</div>
          <div className="text-2xl font-black text-red-500 font-mono mt-1">$18,450.00</div>
        </CanvaGlassPanel>
        <CanvaGlassPanel className="p-4 text-center">
          <div className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest">EMERGENCY ALLOC BUDGET</div>
          <div className="text-2xl font-black text-zinc-300 font-mono mt-1">$50,000.00</div>
        </CanvaGlassPanel>
      </div>

      {/* Calculator */}
      <CanvaGlassPanel className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">Deploy Cost Modeller</h4>
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Calculates Live Budgets</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold uppercase">
          <CanvaFormRow label="Resource Category">
            <CanvaSelect 
              value={category} 
              onChange={e => setCategory(e.target.value as any)}
              className="h-[46px]"
            >
              <option value="PERSONNEL">Personnel Specialist</option>
              <option value="EQUIPMENT">Heavy Equipment</option>
              <option value="FACILITY">Support Shelter Hub</option>
            </CanvaSelect>
          </CanvaFormRow>

          <CanvaFormRow label="Hourly Rate ($)">
            <CanvaInput 
              type="number" 
              value={rate} 
              onChange={e => setRate(Number(e.target.value))} 
              className="h-[46px]"
            />
          </CanvaFormRow>

          <CanvaFormRow label="Deployment Hours">
            <CanvaInput 
              type="number" 
              value={hours} 
              onChange={e => setHours(Number(e.target.value))} 
              className="h-[46px]"
            />
          </CanvaFormRow>
        </div>

        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between">
          <div className="text-left space-y-1">
            <span className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-widest">Calculated Cost Allocation</span>
            <div className="text-xs font-extrabold text-zinc-300 uppercase">{category} Deployment</div>
          </div>
          <div className="text-xl font-black text-amber-500 font-mono">
            ${calcTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </CanvaGlassPanel>
    </div>
  );
};

// =================================-------------------------
// 9. PLANNING & SAFETY PREVIEW (Interactive safety officer log)
// =================================-------------------------
const PlanningPreview: React.FC = () => {
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Check Backup Generators Fuel Cache', completed: true },
    { id: 2, text: 'Audit Mobile Satcom Terminal Rigs', completed: false },
    { id: 3, text: 'Confirm Potable Water Supply Reserves', completed: true },
    { id: 4, text: 'Establish Zone Emergency Evacuation Maps', completed: false },
    { id: 5, text: 'Audit Division PPE Staging Cabinets', completed: false }
  ]);

  const handleCheck = (id: number) => {
    setChecklist(checklist.map(item => {
      if (item.id === id) {
        return { ...item, completed: !item.completed };
      }
      return item;
    }));
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const pct = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="space-y-6">
      {/* Live progress circle/bar */}
      <CanvaGlassPanel className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <h5 className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest">SAFETY MITIGATION RATIO</h5>
            <div className="text-lg font-black text-zinc-100 uppercase tracking-wide mt-0.5">Safety Officer Dashboard</div>
          </div>
          <div className="text-right">
            <span className="text-xl font-mono font-black text-amber-500">{pct}%</span>
          </div>
        </div>

        {/* CSS progress track */}
        <div className="h-2 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
            style={{ width: `${pct}%` }}
          />
        </div>
      </CanvaGlassPanel>

      {/* Safety List */}
      <CanvaGlassPanel className="p-5 space-y-4">
        <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">Incident Safety Officer Log</h4>

        <div className="space-y-2.5">
          {checklist.map((item) => (
            <div 
              key={item.id}
              onClick={() => handleCheck(item.id)}
              className="p-3.5 bg-zinc-950 hover:bg-zinc-900/40 border border-zinc-900 rounded-xl flex items-center justify-between cursor-pointer transition-all select-none group"
            >
              <div className="flex items-center gap-3">
                <div className={`h-4.5 w-4.5 border rounded flex items-center justify-center transition-all ${
                  item.completed 
                    ? 'bg-amber-500 border-amber-500 text-black' 
                    : 'border-zinc-800 bg-black group-hover:border-zinc-600'
                }`}>
                  {item.completed && <CheckSquare size={12} strokeWidth={3} />}
                </div>
                <span className={`text-xs uppercase font-extrabold transition-all ${
                  item.completed ? 'text-zinc-500 line-through' : 'text-zinc-300 group-hover:text-zinc-100'
                }`}>
                  {item.text}
                </span>
              </div>

              <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded tracking-widest uppercase border ${
                item.completed 
                  ? 'bg-green-500/5 border-green-500/20 text-green-400' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-600'
              }`}>
                {item.completed ? 'COMPLETED' : 'PENDING'}
              </span>
            </div>
          ))}
        </div>
      </CanvaGlassPanel>
    </div>
  );
};

// =================================-------------------------
// 10. ABOUT SYSTEM & INFO PREVIEW (NIMS Compliance & Testing Context)
// =================================-------------------------
const AboutPreview: React.FC = () => {
  const [notes, setNotes] = useState<string>(() => {
    const saved = localStorage.getItem('eoc_watch_notes');
    if (saved) return saved;
    return `# CASCADIA EM WATCH CENTER SUITE - OPERATIONAL REMINDERS

- INCIDENT COMMANDER: michael.b.fearnehough
- WATCH IDENTITY: Cascadia EM Watch Center
- AUTHORIZED TEST PHONE: (206) 786-5300
- AUTHORIZED TEST EMAILS: watchcenter@cascadia-em.com, administrator@cascadia-em.com

---

## 📅 Canoe Landing Action Items:
1. Add local contacts directory files.
2. Group tactical teams.
3. Track active 911 dispatch lines.
4. Prepare ICS-214 active ledger logs for daily summary audit.
5. Retain 5-day client data purge standard.`;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    localStorage.setItem('eoc_watch_notes', notes);
  }, [notes]);

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all notes?')) {
      setNotes('');
    }
  };

  return (
    <div className="space-y-4 text-left animate-fade-in">
      <CanvaGlassPanel bannerText="EOC WATCH CENTER NOTES & REMINDERS" highlight="yellow" className="w-full">
        <div className="space-y-4">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
            Use this workspace notepad to draft active EOC logs, contact numbers, tactical tasks, and watch handovers. Your edits are saved instantly to secure local storage.
          </p>

          <div className="relative">
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 800);
              }}
              placeholder="Type your EOC notes and handovers here..."
              rows={18}
              className="w-full p-4 bg-zinc-950/80 text-zinc-100 border border-zinc-800/80 focus:border-amber-500 rounded-xl text-sm font-mono focus:outline-none placeholder-zinc-700 resize-y leading-relaxed custom-scroll"
            />
            {savedSuccess && (
              <div className="absolute bottom-4 right-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-lg tracking-widest animate-pulse">
                ✓ Auto-Saved
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-zinc-900/60">
            <span className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-widest">
              Characters: {notes.length} | Lines: {notes.split('\n').length}
            </span>
            <CanvaButton
              type="button"
              variant="secondary"
              onClick={handleClear}
              className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest"
            >
              Clear Notes
            </CanvaButton>
          </div>
        </div>
      </CanvaGlassPanel>
    </div>
  );
};

export default App;
