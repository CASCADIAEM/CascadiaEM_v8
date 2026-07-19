import { 
  LayoutDashboard, 
  Building2, 
  BookUser, 
  MessageSquare,
  ClipboardCheck,
  ShieldAlert,
  Users,
  Kanban,
  CloudLightning,
  Anchor,
  type LucideIcon
} from 'lucide-react';
import React from 'react';

export interface ModuleDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  category: 'core' | 'tactical' | 'logistics' | 'comms';
}

export const EOC_MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id: 'tactical-teams',
    name: 'Teams Manager',
    icon: Users,
    description: 'NIMS-compliant unit assembly, staging pool, and active assignments.',
    component: React.lazy(() => import('../modules/TacticalTeams')),
    category: 'tactical'
  },
  {
    id: 'tactical-matrix',
    name: 'Command Matrix',
    icon: Kanban,
    description: 'Real-time tactical unit assignment and lifecycle logs.',
    component: React.lazy(() => import('../modules/TacticalMatrix')),
    category: 'tactical'
  },
  {
    id: 'ics-resources',
    name: 'Resource Manager',
    icon: ShieldAlert,
    description: 'NIMS-compliant resource tracking, capability metrics, and operational arrangements.',
    component: React.lazy(() => import('../modules/ResourcesManager')),
    category: 'logistics'
  },
  {
    id: 'mission-builder',
    name: 'Mission Setup',
    icon: ClipboardCheck,
    description: 'Pre-configure missions, NIMS roles, shelters, and objectives.',
    component: React.lazy(() => import('../modules/MissionBuilder')),
    category: 'core'
  },
  {
    id: 'active-incident',
    name: 'Active Tracker',
    icon: ShieldAlert,
    description: 'Track active EOC missions, check off SOP items, manage shelters, and log shift events.',
    component: React.lazy(() => import('../modules/ActiveIncident')),
    category: 'tactical'
  },
  {
    id: 'dashboard',
    name: 'EOC Dashboard',
    icon: LayoutDashboard,
    description: 'Operational summary, statistics, and live activity feed.',
    component: React.lazy(() => import('../modules/Dashboard')),
    category: 'core'
  },
  {
    id: 'contact-manager',
    name: 'Contact Manager',
    icon: BookUser,
    description: 'Emergency directory with CSV and JSON import/export.',
    component: React.lazy(() => import('../modules/ContactManager')),
    category: 'core'
  },
  {
    id: 'logistics-facilities',
    name: 'Facilities Manager',
    icon: Building2,
    description: 'Manage shelters and support hubs with keyholder activation states.',
    component: React.lazy(() => import('../modules/LogisticsFacilities')),
    category: 'logistics'
  },
  {
    id: 'messaging-center',
    name: 'Messaging Center',
    icon: MessageSquare,
    description: 'Ad-hoc SMS and group alerts with a live visual phone preview.',
    component: React.lazy(() => import('../modules/MessagingCenter')),
    category: 'comms'
  },
  {
    id: 'weather-hazards',
    name: 'Weather & Hazards',
    icon: CloudLightning,
    description: 'Manage severe weather forecasts, NWS alerts, Level 1-3 evacuation zones, PBS WARN broadcasts, and animated radar overlays.',
    component: React.lazy(() => import('../modules/WeatherHazards')),
    category: 'core'
  },
  {
    id: 'canoe-landing',
    name: 'Team Alerts',
    icon: Anchor,
    description: 'Auxiliary responder portals, real-time field safety alerts, active unit assignments, and multi-branch communication matrix.',
    component: React.lazy(() => import('../modules/CanoeLanding/CanoeLandingContainer')),
    category: 'tactical'
  }
];
