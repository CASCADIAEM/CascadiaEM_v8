import React, { useState, useEffect, Suspense } from 'react';
import { EOC_MODULE_REGISTRY, type ModuleDefinition } from './registry/ModuleRegistry';
import { dataBus } from './services/DataBus';
import { useAdminEngine } from './services/AdminEngineService';
import { 
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
  ClipboardCheck,
  Building2,
  MessageSquare,
  Users,
  Kanban,
  CheckSquare,
  Sliders,
  Anchor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CanvaGlassPanel, 
  CanvaButton 
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
        name: 'MISSION MANAGER',
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
          },
          {
            id: 'tactical-teams-node',
            name: 'TEAMS MANAGER',
            type: 'module',
            moduleId: 'tactical-teams',
            icon: Users,
            description: 'NIMS unit assembly & staging'
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
        id: 'canoe-landing-node',
        name: 'FIELD ALERT & SAFETY PORTAL',
        type: 'module',
        moduleId: 'canoe-landing',
        icon: Anchor,
        description: 'Auxiliary field safety and communication portal'
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
            id: 'tactical-matrix-node',
            name: 'COMMAND MATRIX',
            type: 'module',
            moduleId: 'tactical-matrix',
            icon: Kanban,
            description: 'Real-time assignment logs'
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

import CanoeLandingContainer from './modules/CanoeLanding/CanoeLandingContainer';

// ---------------------------------------------------------
// APP COMPONENT
// ---------------------------------------------------------
const App: React.FC = () => {
  const { isAdminMode, setAdminMode } = useAdminEngine();
  // Onboarding & Device States
  const [onboarded, setOnboarded] = useState(false);
  const [deviceProfile, setDeviceProfile] = useState<'PHONE' | 'TABLET' | 'DESKTOP' | 'EOC'>('DESKTOP');
  const [isCanoePortalOnly, setIsCanoePortalOnly] = useState(false);
  
  // Active/Configured Modules
  const [activeModuleIds, setActiveModuleIds] = useState<string[]>([
    'mission-builder', 'active-incident', 'dashboard', 'contact-manager', 'logistics-facilities', 'messaging-center', 'tactical-teams', 'tactical-matrix', 'ics-resources', 'app-settings', 'canoe-landing'
  ]);
  const [activeModule, setActiveModule] = useState<ModuleDefinition | null>(null);
  const [systemTime, setSystemTime] = useState<string>('');

  useEffect(() => {
    // 1. Direct safety portal bypass check
    const params = new URLSearchParams(window.location.search);
    const isCanoeQuery = params.get('module') === 'canoe-landing';
    const isCanoeRoleQuery = params.get('role') === 'participant' || params.get('role') === 'responder';
    const isEocOverride = params.get('eoc') === 'true' || params.get('ic') === 'true';
    const savedProfileRaw = localStorage.getItem('cem_canoe_user_profile');
    
    let isSavedCanoePortal = false;
    if (savedProfileRaw && !isEocOverride) {
      try {
        const parsed = JSON.parse(savedProfileRaw);
        // Only Participant (tier_1) and Responder (tier_2) bypass the main EOC app.
        // Command/IC (tier_3) stays in the main Command Cockpit/EOC system.
        if (parsed.tier === 'tier_1' || parsed.tier === 'tier_2') {
          isSavedCanoePortal = true;
        }
      } catch {}
    }

    if ((isCanoeQuery || isCanoeRoleQuery || isSavedCanoePortal) && !isEocOverride) {
      setIsCanoePortalOnly(true);
    }

    // 2. System time clock loop
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
      const params = new URLSearchParams(window.location.search);
      const isIC = params.get('ic') === 'true';
      const isCanoe = params.get('module') === 'canoe-landing';

      if (isIC || isCanoe) {
        const canoe = activeRegistry.find(m => m.id === 'canoe-landing');
        if (canoe) {
          setActiveModule(canoe);
          return;
        }
      }

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

  if (isCanoePortalOnly) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-zinc-400 font-mono font-black uppercase text-sm tracking-wider">Initializing Safety Portal...</div>}>
        <CanoeLandingContainer />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden text-[#f4f4f5] font-sans selection:bg-amber-500 selection:text-black">
      
      {/* Onboarding Configuration Overlay */}
      <AnimatePresence>
        {!onboarded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#09090b]/98 z-50 overflow-y-auto flex justify-center p-4 sm:p-8"
          >
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-8 space-y-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden my-auto">
              
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
