import React, { useState, useEffect } from 'react';
import { dataBus } from '../services/DataBus';
import { useDropdowns } from '../services/DropdownService';
import { MessageSquare, Send, Smartphone, Mail, CheckCircle2, ShieldAlert, Lock, Phone, Clock, Users, Key, Signal, Battery, X, Mic, MicOff, Grid, Volume2, Pencil } from 'lucide-react';
import { CanvaGlassPanel, CanvaButton, CanvaInput, CanvaSelect, CanvaFormRow, CanvaTextarea, CanvaDropdownCustomizer } from '../components/DesignSandbox';

import { sendTelemetryLog } from '../services/Telemetry';

interface AlertTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'SMS' | 'EMAIL';
}

const TEMPLATES: AlertTemplate[] = [
  {
    id: 'T-1',
    name: 'Logistics Warm Standby Notice',
    subject: 'LOGISTICS OPERATIONAL ALERT: WARM STAND-BY STAGE',
    body: 'ALERT: Bethel Church facility is placed on WARM STAND-BY. Verify access keys and physical safety checks are ready. Wait for formal activation instructions.',
    type: 'SMS'
  },
  {
    id: 'T-2',
    name: 'Active Emergency Shelter Order',
    subject: 'CRITICAL DISASTER NOTICE: ACTIVE SHELTER PROTOCOLS',
    body: 'CRITICAL DIRECTIVE: Open and staff all municipal shelter facilities. Deploy cots, activate auxiliary backup generators, and prepare to register arriving community members.',
    type: 'SMS'
  },
  {
    id: 'T-3',
    name: 'Training Exercise Briefing',
    subject: 'TRAINING & EXERCISE PROTOCOL: BRIEFING SCHEDULED',
    body: 'This is a test broadcast for training evaluation purposes. Exercise briefing will commence at 10:00 hours at the command outpost. Report attendance metrics.',
    type: 'EMAIL'
  }
];

const EOC_SECURITY_PIN = 'EOC-2026';

const steps = [
  { num: 1, label: 'Audience', desc: 'Select recipients' },
  { num: 2, label: 'What', desc: 'Compose message' },
  { num: 3, label: 'How', desc: 'Select channels' },
  { num: 4, label: 'Preview', desc: 'Verify layouts' },
  { num: 5, label: 'Confirm', desc: 'Hold to dispatch' }
];

const MessagingCenter: React.FC = () => {
  const { dropdowns } = useDropdowns();
  const activeTemplates = dropdowns.alert_templates || TEMPLATES;
  const agencyLogo = dataBus.getCache<string | null>('mission_builder_agency_logo') || null;
  const agencyName = dataBus.getCache<string>('mission_builder_agency_name') || 'Cascadia Emergency Management';

  const [recipientGroup, setRecipientGroup] = useState(() => dataBus.getCache<string>('msg_recipientGroup') || 'Primary Keyholders');
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => dataBus.getCache<string>('msg_selectedTemplateId') || 'ad-hoc');
  const [channels, setChannels] = useState<('SMS' | 'EMAIL' | 'VOICE')[]>(() => {
    return dataBus.getCache<('SMS' | 'EMAIL' | 'VOICE')[]>('msg_channels') || ['SMS'];
  });
  const [previewTab, setPreviewTab] = useState<'SMS' | 'EMAIL' | 'VOICE'>(() => {
    return dataBus.getCache<'SMS' | 'EMAIL' | 'VOICE'>('msg_previewTab') || 'SMS';
  });
  const [subject, setSubject] = useState(() => dataBus.getCache<string>('msg_subject') || '');
  const [body, setBody] = useState(() => dataBus.getCache<string>('msg_body') || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSimulatorDrawer, setShowSimulatorDrawer] = useState(false);

  // Stepper & Dual-Mode states
  const [alertingMode, setAlertingMode] = useState<'RAPID' | 'WIZARD'>(() => dataBus.getCache<'RAPID' | 'WIZARD'>('msg_alertingMode') || 'RAPID');
  const [wizardStep, setWizardStep] = useState<number>(() => dataBus.getCache<number>('msg_wizardStep') || 1);
  const [holdActive, setHoldActive] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [wizardCompleted, setWizardCompleted] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState({ sent: 0, delivered: 0, confirmed: 0, progress: 0 });

  // Wizard specific security credentials block
  const [wizardAuthRole, setWizardAuthRole] = useState('Incident Commander');
  const [wizardAuthPassword, setWizardAuthPassword] = useState('');
  const [wizardPinVerified, setWizardPinVerified] = useState(false);
  const [wizardAuthError, setWizardAuthError] = useState('');

  // Local state for optional UHF analog radio Net bypass
  const [includeRadio, setIncludeRadio] = useState(false);

  // Dispatch execution and scheduling states
  const [dispatchMode, setDispatchMode] = useState<'IMMEDIATE' | 'SCHEDULED'>(() => {
    return dataBus.getCache<'IMMEDIATE' | 'SCHEDULED'>('msg_dispatchMode') || 'IMMEDIATE';
  });
  const [scheduledTime, setScheduledTime] = useState(() => {
    return dataBus.getCache<string>('msg_scheduledTime') || '';
  });
  const [scheduledRecurrence, setScheduledRecurrence] = useState<string>(() => {
    return dataBus.getCache<string>('msg_scheduledRecurrence') || 'ONCE';
  });

  interface ScheduledAlert {
    id: string;
    name: string;
    recipient: string;
    schedule: string;
    body: string;
    channels: ('SMS' | 'EMAIL' | 'VOICE')[];
    active: boolean;
    subject?: string;
  }

  const [scheduledAlerts, setScheduledAlerts] = useState<ScheduledAlert[]>(() => {
    const cached = dataBus.getCache<ScheduledAlert[]>('msg_scheduledAlerts');
    if (cached) return cached;

    return [
      {
        id: 'SCH-1',
        name: 'Lahar & Tsunami Siren Test (Recurring)',
        recipient: 'CERT Team Alpha',
        schedule: 'First Monday of month, 12:00 PM (Noon)',
        body: 'ALERT: Dynamic Lahar & Tsunami Siren Test Broadcast. Siren audio test and sensor telemetry confirmation active. No response required.',
        channels: ['SMS', 'VOICE'],
        active: true
      },
      {
        id: 'SCH-2',
        name: 'Weekly Operational Standby Accountability',
        recipient: 'All Operational Staff',
        schedule: 'Weekly Friday, 5:00 PM',
        body: 'WEEKLY COMPLIANCE CHECK: All CERT roster staff and municipal shelter managers confirm active keyholder standby rotation logs for upcoming weekend duty.',
        channels: ['SMS', 'EMAIL'],
        subject: 'CASCADIA MATRIX: WEEKLY SHIFT ROTATION CONFIRMATION REQUIRED',
        active: true
      },
      {
        id: 'SCH-3',
        name: 'Monthly Tactical Net Check-In',
        recipient: 'Primary Keyholders',
        schedule: 'Every Wednesday, 7:00 PM',
        body: 'This is the monthly ICS command frequency and alert check-in. Confirm outbound dialer radio capabilities.',
        channels: ['VOICE'],
        active: false
      }
    ];
  });

  // Scheduling Queue Edit States
  const [editingAlert, setEditingAlert] = useState<ScheduledAlert | null>(null);
  const [editName, setEditName] = useState('');
  const [editRecipient, setEditRecipient] = useState('');
  const [editSchedule, setEditSchedule] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editChannels, setEditChannels] = useState<('SMS' | 'EMAIL' | 'VOICE')[]>([]);
  const [editSubject, setEditSubject] = useState('');

  useEffect(() => {
    if (editingAlert) {
      setEditName(editingAlert.name);
      setEditRecipient(editingAlert.recipient);
      setEditSchedule(editingAlert.schedule);
      setEditBody(editingAlert.body);
      setEditChannels(editingAlert.channels);
      setEditSubject(editingAlert.subject || '');
    }
  }, [editingAlert]);

  // Tier-2 Security Authorization States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authRole, setAuthRole] = useState('Incident Commander');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Target count derived state
  const targetCount = recipientGroup === 'Event Guests' 
    ? 1500 
    : recipientGroup === 'CERT Team Alpha' 
      ? 18 
      : recipientGroup === 'All Operational Staff' 
        ? 42 
        : recipientGroup === 'Tribal Council Leadership'
          ? 8
          : recipientGroup === 'Senior Command Outpost'
            ? 6
            : 12; // Primary Keyholders

  // Determine if message is ad-hoc (manually composed, template modified, or extra channels checked)
  const isAdHoc = (() => {
    if (selectedTemplateId === 'ad-hoc') return true;
    const template = activeTemplates.find(t => t.id === selectedTemplateId);
    if (!template) return true;
    
    // Check if user changed the body
    if (template.body !== body) return true;
    
    // Check if channels array deviates from the template's single-channel specification
    if (channels.length !== 1 || channels[0] !== template.type) return true;
    
    // Check if email template subject was modified
    if (channels.includes('EMAIL') && template.subject !== subject) return true;
    
    return false;
  })();

  // Telemetry & billing cost derived state
  const estimatedCost = (() => {
    let cost = 0;
    if (channels.includes('SMS')) {
      const segments = Math.max(1, Math.ceil(body.length / 160));
      cost += 0.0075 * targetCount * segments;
    }
    if (channels.includes('EMAIL')) {
      cost += 0.0001 * targetCount;
    }
    if (channels.includes('VOICE')) {
      cost += 0.0130 * targetCount;
    }
    return cost;
  })();

  useEffect(() => {
    dataBus.setCache('msg_recipientGroup', recipientGroup);
    dataBus.setCache('msg_selectedTemplateId', selectedTemplateId);
    dataBus.setCache('msg_channels', channels);
    dataBus.setCache('msg_previewTab', previewTab);
    dataBus.setCache('msg_subject', subject);
    dataBus.setCache('msg_body', body);
    dataBus.setCache('msg_dispatchMode', dispatchMode);
    dataBus.setCache('msg_scheduledTime', scheduledTime);
    dataBus.setCache('msg_scheduledRecurrence', scheduledRecurrence);
    dataBus.setCache('msg_scheduledAlerts', scheduledAlerts);
    dataBus.setCache('msg_alertingMode', alertingMode);
    dataBus.setCache('msg_wizardStep', wizardStep);
  }, [recipientGroup, selectedTemplateId, channels, previewTab, subject, body, dispatchMode, scheduledTime, scheduledRecurrence, scheduledAlerts, alertingMode, wizardStep]);

  useEffect(() => {
    if (selectedTemplateId === 'ad-hoc') {
      setSubject('');
      setBody('');
    } else {
      const template = activeTemplates.find(t => t.id === selectedTemplateId);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
        setChannels([template.type]);
        setPreviewTab(template.type);
      }
    }
  }, [selectedTemplateId]);

  // Press & Hold Logic for Wizard Step 5
  useEffect(() => {
    let intervalId: any = null;
    if (holdActive) {
      intervalId = setInterval(() => {
        setHoldProgress(prev => {
          if (prev >= 100) {
            clearInterval(intervalId);
            setHoldActive(false);
            triggerWizardDispatch();
            return 100;
          }
          return prev + 3.33; // Charges fully in ~3 seconds (3.33% * 100ms = 30 intervals)
        });
      }, 100);
    } else {
      setHoldProgress(0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [holdActive]);

  // Reset wizard pin verification state if body or template changes back to safe template
  useEffect(() => {
    if (!isAdHoc) {
      setWizardPinVerified(false);
      setWizardAuthPassword('');
      setWizardAuthError('');
    }
  }, [isAdHoc]);

  // Delivery status simulated webhook updater
  useEffect(() => {
    let simInterval: any = null;
    if (wizardCompleted) {
      setDeliveryStatus({ sent: 0, delivered: 0, confirmed: 0, progress: 0 });
      const targetCount = recipientGroup === 'Event Guests' 
        ? 1500 
        : recipientGroup === 'CERT Team Alpha' 
          ? 18 
          : recipientGroup === 'All Operational Staff' 
            ? 42 
            : recipientGroup === 'Tribal Council Leadership'
              ? 8
              : recipientGroup === 'Senior Command Outpost'
                ? 6
                : 12; // Primary Keyholders

      simInterval = setInterval(() => {
        setDeliveryStatus(prev => {
          if (prev.progress >= 100) {
            clearInterval(simInterval);
            return prev;
          }
          const nextProgress = Math.min(prev.progress + 4, 100);
          const sentVal = Math.round((nextProgress / 100) * targetCount);
          const deliveredVal = Math.round((nextProgress / 100) * targetCount * 0.95);
          const confirmedVal = Math.round((nextProgress / 100) * targetCount * 0.78);
          return {
            sent: sentVal,
            delivered: deliveredVal,
            confirmed: confirmedVal,
            progress: nextProgress
          };
        });
      }, 250);
    }
    return () => {
      if (simInterval) clearInterval(simInterval);
    };
  }, [wizardCompleted, recipientGroup]);

  // Inline Tier-2 Security Override Pin Verifier
  const handleWizardVerifyPin = async () => {
    if (wizardAuthPassword === EOC_SECURITY_PIN) {
      setWizardPinVerified(true);
      setWizardAuthError('');
      
      dataBus.broadcast({
        type: 'COMMS',
        origin: 'COMMUNICATIONS MODULE',
        payload: { 
          message: `Tier-2 Security PIN verified inline for ad-hoc wizard composer. Approved by [${wizardAuthRole.toUpperCase()}]` 
        },
        severity: 'medium'
      });
    } else {
      setWizardAuthError('INVALID OVERRIDE PIN. Dispatch gate locked.');
      
      // Dispatch high-severity security threat breach log to telemetry!
      await sendTelemetryLog({
        title: `SECURITY BREACH ALERT: WIZARD BLOCK SEC OVERRIDE FAILURE`,
        severity: 'high',
        notes: `An unauthorized override attempt was blocked at the inline Wizard Tier-2 authentication gate. Operator attempted to bypass ad-hoc composer posing as [${wizardAuthRole}]. Credentials rejected.`,
        origin_tenant: 'CASCADIA_EM_COMMS',
        channels: [],
        classification: 'URGENT',
        alert_message: `BLOCKED AD-HOC WIZARD ACTION. Blocked content: "${body}"`,
        target_label: 'SECURITY WATCH DIRECTORY',
        ics_position: 'SECURITY_OFFICER'
      });
    }
  };

  // Execution dispatch triggered via step 5 hold-to-confirm
  const triggerWizardDispatch = async () => {
    const approvedRole = isAdHoc ? wizardAuthRole : undefined;
    
    if (dispatchMode === 'SCHEDULED') {
      const scheduleAlertText = scheduledRecurrence === 'ONCE' 
        ? `Once-Off Outbound on ${scheduledTime ? new Date(scheduledTime).toLocaleString() : 'N/A'}`
        : scheduledRecurrence === 'WEEKLY'
          ? 'Weekly (Scheduled Rotation)'
          : 'First Monday of Month, 12:00 PM (Noon)';

      const newAlert: ScheduledAlert = {
        id: `SCH-${Date.now()}`,
        name: selectedTemplateId !== 'ad-hoc' 
          ? `${activeTemplates.find(t => t.id === selectedTemplateId)?.name} (Scheduled)`
          : 'Custom Outbound Scheduled Broadcast',
        recipient: recipientGroup,
        schedule: scheduleAlertText,
        body: body,
        channels: [...channels],
        active: true,
        subject: channels.includes('EMAIL') ? subject : undefined
      };

      setScheduledAlerts(prev => [newAlert, ...prev]);

      dataBus.broadcast({
        type: 'COMMS',
        origin: 'COMMUNICATIONS MODULE',
        payload: { 
          message: `Mass broadcast SCHEDULED for [${recipientGroup.toUpperCase()}] via [${channels.join(' + ')}]: "${body.slice(0, 60)}..."${approvedRole ? ` (Authorized by ${approvedRole})` : ''}` 
        },
        severity: 'medium'
      });
    } else {
      dataBus.broadcast({
        type: 'COMMS',
        origin: 'COMMUNICATIONS MODULE',
        payload: { 
          message: `Mass broadcast dispatched to [${recipientGroup.toUpperCase()}] via [${channels.join(' + ')}]: "${body.slice(0, 60)}..."${approvedRole ? ` (Authorized by ${approvedRole})` : ''}` 
        },
        severity: 'high'
      });

      const positionValue = approvedRole 
        ? approvedRole.toUpperCase().replace(/\s+/g, '_') 
        : 'PUBLIC_INFO_OFFICER';

      // Telemetry trigger
      await sendTelemetryLog({
        title: channels.length > 1 ? `OMNI-CHANNEL ALERT DISPATCH: ${recipientGroup}` : `MASS ${channels[0]} DISPATCH: ${recipientGroup}`,
        severity: 'high',
        notes: `Mass alert broadcast to group [${recipientGroup}] via [${channels.join(', ')}]` + (approvedRole ? ` - Secondary Approval: ${approvedRole}` : ''),
        origin_tenant: 'CASCADIA_EM_COMMS',
        channels: channels.map(c => c.toLowerCase() as 'sms' | 'email' | 'voice'),
        classification: selectedTemplateId === 'T-2' ? 'LIFE-SAFETY' : selectedTemplateId === 'T-1' ? 'URGENT' : 'INFO',
        alert_message: body,
        target_label: recipientGroup,
        ics_position: positionValue
      });
    }

    setWizardCompleted(true);
  };

  // Mathematically calculate dynamic next trigger dates for standard and user-defined schedules
  const getNextTriggerDate = (id: string, customSchedule?: string): string => {
    const now = new Date();
    if (id === 'SCH-1' || customSchedule === 'First Monday of Month, 12:00 PM (Noon)') {
      // First Monday of current/next month
      let targetMonth = now.getMonth();
      let targetYear = now.getFullYear();
      
      const getFirstMonday = (year: number, month: number) => {
        const date = new Date(year, month, 1);
        while (date.getDay() !== 1) { // 1 is Monday
          date.setDate(date.getDate() + 1);
        }
        date.setHours(12, 0, 0, 0);
        return date;
      };

      let firstMonday = getFirstMonday(targetYear, targetMonth);
      if (now > firstMonday) {
        targetMonth += 1;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear += 1;
        }
        firstMonday = getFirstMonday(targetYear, targetMonth);
      }
      return firstMonday.toLocaleString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
    } else if (id === 'SCH-2' || customSchedule === 'Weekly (Scheduled Rotation)') {
      // Weekly Friday, 5:00 PM
      const target = new Date();
      target.setDate(now.getDate() + (5 - now.getDay() + 7) % 7); // 5 is Friday
      target.setHours(17, 0, 0, 0);
      if (now > target) {
        target.setDate(target.getDate() + 7);
      }
      return target.toLocaleString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
    } else if (id === 'SCH-3') {
      // Every Wednesday, 7:00 PM
      const target = new Date();
      target.setDate(now.getDate() + (3 - now.getDay() + 7) % 7); // 3 is Wednesday
      target.setHours(19, 0, 0, 0);
      if (now > target) {
        target.setDate(target.getDate() + 7);
      }
      return target.toLocaleString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
    }

    if (customSchedule) {
      if (customSchedule.startsWith('Once-Off Outbound on ')) {
        const dateStr = customSchedule.replace('Once-Off Outbound on ', '');
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.toLocaleString('en-US', { 
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
          });
        }
      }
    }

    return customSchedule || 'Once-Off Scheduled Outflow';
  };

  // Handle toggling multiple independent channels (preventing zero selections)
  const toggleChannel = (ch: 'SMS' | 'EMAIL' | 'VOICE') => {
    setChannels(prev => {
      let updated: ('SMS' | 'EMAIL' | 'VOICE')[];
      if (prev.includes(ch)) {
        if (prev.length === 1) return prev; // Keep at least one channel active
        updated = prev.filter(item => item !== ch);
      } else {
        updated = [...prev, ch];
      }

      // If the current preview tab is no longer active, sync preview tab to the first active format
      if (!updated.includes(previewTab)) {
        setPreviewTab(updated[0]);
      }
      return updated;
    });
  };


  const executeBroadcast = async (approvedRole?: string) => {
    if (dispatchMode === 'SCHEDULED') {
      const scheduleAlertText = scheduledRecurrence === 'ONCE' 
        ? `Once-Off Outbound on ${scheduledTime ? new Date(scheduledTime).toLocaleString() : 'N/A'}`
        : scheduledRecurrence === 'WEEKLY'
          ? 'Weekly (Scheduled Rotation)'
          : 'First Monday of Month, 12:00 PM (Noon)';

      const newAlert: ScheduledAlert = {
        id: `SCH-${Date.now()}`,
        name: selectedTemplateId !== 'ad-hoc' 
          ? `${activeTemplates.find(t => t.id === selectedTemplateId)?.name} (Scheduled)`
          : 'Custom Outbound Scheduled Broadcast',
        recipient: recipientGroup,
        schedule: scheduleAlertText,
        body: body,
        channels: [...channels],
        active: true,
        subject: channels.includes('EMAIL') ? subject : undefined
      };

      setScheduledAlerts(prev => [newAlert, ...prev]);

      dataBus.broadcast({
        type: 'COMMS',
        origin: 'COMMUNICATIONS MODULE',
        payload: { 
          message: `Mass broadcast SCHEDULED for [${recipientGroup.toUpperCase()}] via [${channels.join(' + ')}]: "${body.slice(0, 60)}..."${approvedRole ? ` (Authorized by ${approvedRole})` : ''}` 
        },
        severity: 'medium'
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setBody('');
        setSelectedTemplateId('ad-hoc');
        setChannels(['SMS']);
        setPreviewTab('SMS');
        setDispatchMode('IMMEDIATE');
        setScheduledTime('');
        setScheduledRecurrence('ONCE');
      }, 3000);
      return;
    }

    dataBus.broadcast({
      type: 'COMMS',
      origin: 'COMMUNICATIONS MODULE',
      payload: { 
        message: `Mass broadcast dispatched to [${recipientGroup.toUpperCase()}] via [${channels.join(' + ')}]: "${body.slice(0, 60)}..."${approvedRole ? ` (Authorized by ${approvedRole})` : ''}` 
      },
      severity: 'high'
    });

    const positionValue = approvedRole 
      ? approvedRole.toUpperCase().replace(/\s+/g, '_') 
      : 'PUBLIC_INFO_OFFICER';

    // Central Telemetry Integration (Dispatches actual SMS, email, or voice trigger via server.py)
    await sendTelemetryLog({
      title: channels.length > 1 ? `OMNI-CHANNEL ALERT DISPATCH: ${recipientGroup}` : `MASS ${channels[0]} DISPATCH: ${recipientGroup}`,
      severity: 'high',
      notes: `Mass alert broadcast to group [${recipientGroup}] via [${channels.join(', ')}]` + (approvedRole ? ` - Secondary Approval: ${approvedRole}` : ''),
      origin_tenant: 'CASCADIA_EM_COMMS',
      channels: channels.map(c => c.toLowerCase() as 'sms' | 'email' | 'voice'),
      classification: selectedTemplateId === 'T-2' ? 'LIFE-SAFETY' : selectedTemplateId === 'T-1' ? 'URGENT' : 'INFO',
      alert_message: body,
      target_label: recipientGroup,
      ics_position: positionValue
    });

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setBody('');
      setSelectedTemplateId('ad-hoc');
      setChannels(['SMS']);
      setPreviewTab('SMS');
    }, 3000);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body) return;

    if (isAdHoc) {
      setAuthPassword('');
      setAuthError('');
      setShowAuthModal(true);
    } else {
      await executeBroadcast();
    }
  };

  const handleAuthConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === EOC_SECURITY_PIN) {
      setShowAuthModal(false);
      await executeBroadcast(authRole);
    } else {
      setAuthError('INVALID CREDENTIALS. Unauthorized broadcast attempt logged to active ledger.');
      
      // Dispatch high-severity security threat breach log to the telemetry server!
      await sendTelemetryLog({
        title: `SECURITY BREACH ALERT: UNAUTHORIZED ADHOC BROADCAST ATTEMPT`,
        severity: 'high',
        notes: `An unauthorized attempt was blocked at the Tier-2 authentication gate. Operator attempted to dispatch custom ad-hoc messaging to [${recipientGroup}] via [${channels.join(' + ')}] posing as [${authRole}]. Credentials rejected.`,
        origin_tenant: 'CASCADIA_EM_COMMS',
        channels: [], // Do not send actual SMS/Email, just write to internal active log ledger
        classification: 'URGENT',
        alert_message: `BLOCKED AD-HOC COMMUNICATIONS ACTION. Blocked content: "${body}"`,
        target_label: 'SECURITY WATCH DIRECTORY',
        ics_position: 'SECURITY_OFFICER'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase text-zinc-100 tracking-wider">Tactical Communications Center</h1>
          <p className="text-sm text-zinc-500 font-medium">Compose, preview, and dispatch mass emergency alerts and notification channels.</p>
        </div>
        
        {/* Dual-Mode Toggle Switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 max-w-xs w-full self-start md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => { setAlertingMode('RAPID'); setWizardCompleted(false); }}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              alertingMode === 'RAPID'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Send size={12} />
            <span>⚡ Rapid</span>
          </button>
          <button
            type="button"
            onClick={() => { setAlertingMode('WIZARD'); setWizardStep(1); setWizardCompleted(false); }}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              alertingMode === 'WIZARD'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Users size={12} />
            <span>🧙 Wizard</span>
          </button>
        </div>
      </div>

      {alertingMode === 'RAPID' ? (
        <div className="grid grid-cols-1 gap-8 items-start">
          
          {/* Full-Width Message Composer */}
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-amber-500" />
                <h2 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide">Interactive Composer (Rapid Console)</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulatorDrawer(true)}
                className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/35 hover:border-amber-500/40 text-amber-500 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/5 animate-pulse"
                title="Open real-time device preview simulation"
              >
                <Smartphone size={14} />
                <span>Simulate Handset</span>
              </button>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-4">
              
              {/* Row: Target Recipient Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5 select-none">
                    <label className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-wider block">Recipient Group</label>
                    <CanvaDropdownCustomizer dropdownKey="alert_recipient_groups" label="Recipient Group" />
                  </div>
                  <select 
                    value={recipientGroup} 
                    onChange={e => setRecipientGroup(e.target.value)}
                    className="eoc-input bg-zinc-950 text-zinc-100 cursor-pointer"
                  >
                    {(dropdowns.alert_recipient_groups || []).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 select-none">
                    <label className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-wider block">Alert Template</label>
                    <CanvaDropdownCustomizer dropdownKey="alert_templates" label="Alert Template" />
                  </div>
                  <select 
                    value={selectedTemplateId} 
                    onChange={e => setSelectedTemplateId(e.target.value)}
                    className="eoc-input bg-zinc-950 text-zinc-100 cursor-pointer"
                  >
                    <option value="ad-hoc">-- COMPOSE AD-HOC (GENESIS) --</option>
                    {activeTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row: Broadcast Channel Toggle */}
              <div>
                <label className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-wider mb-2 block">Transmission Channel</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => toggleChannel('SMS')}
                    className={`flex-1 py-3 px-2 border rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase transition-all relative ${
                      channels.includes('SMS') 
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-md shadow-amber-500/5' 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <MessageSquare size={14} />
                    <span>SMS Text</span>
                    {channels.includes('SMS') && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-mono absolute -top-1.5 -right-1.5 border border-amber-500/30 animate-pulse">ON</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleChannel('EMAIL')}
                    className={`flex-1 py-3 px-2 border rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase transition-all relative ${
                      channels.includes('EMAIL') 
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-md shadow-amber-500/5' 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Mail size={14} />
                    <span>HTML Email</span>
                    {channels.includes('EMAIL') && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-mono absolute -top-1.5 -right-1.5 border border-amber-500/30 animate-pulse">ON</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleChannel('VOICE')}
                    className={`flex-1 py-3 px-2 border rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase transition-all relative ${
                      channels.includes('VOICE') 
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-md shadow-amber-500/5' 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Phone size={14} />
                    <span>Voice Call</span>
                    {channels.includes('VOICE') && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-mono absolute -top-1.5 -right-1.5 border border-amber-500/30 animate-pulse">ON</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Row: Dispatch Mode (Immediate vs Scheduled Queue) */}
              <div>
                <label className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-wider mb-2 block">Dispatch Mode</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDispatchMode('IMMEDIATE')}
                    className={`flex-1 py-2.5 px-2 border rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase transition-all ${
                      dispatchMode === 'IMMEDIATE'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-md shadow-amber-500/5'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    Immediate Dispatch
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchMode('SCHEDULED')}
                    className={`flex-1 py-2.5 px-2 border rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase transition-all ${
                      dispatchMode === 'SCHEDULED'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-md shadow-amber-500/5'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    Scheduled Queue
                  </button>
                </div>
              </div>

              {/* Conditional Scheduled Settings Fields */}
              {dispatchMode === 'SCHEDULED' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/40 border border-zinc-900/60 rounded-xl p-3 animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Trigger Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      className="eoc-input text-xs"
                      required={scheduledRecurrence === 'ONCE'}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Recurrence Pattern</label>
                    <select
                      value={scheduledRecurrence}
                      onChange={e => setScheduledRecurrence(e.target.value)}
                      className="eoc-input bg-zinc-950 text-zinc-100 text-xs cursor-pointer"
                    >
                      <option value="ONCE">Once-Off Execution</option>
                      <option value="WEEKLY">Weekly Standby Duty</option>
                      <option value="FIRST_MONDAY">Monthly Siren Test</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Subject (Only for Email) */}
              {channels.includes('EMAIL') && (
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-wider block">Email Subject</label>
                  <input 
                    type="text" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                    placeholder="ENTER OFFICIAL EMAIL TITLE HEADER..." 
                    className="eoc-input"
                    required
                  />
                </div>
              )}

              {/* Message Body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-wider block">Message Body</label>
                  <span className="text-[10px] font-mono font-bold text-zinc-500">
                    {body.length} CHARACTERS
                  </span>
                </div>
                <textarea 
                  value={body} 
                  onChange={e => setBody(e.target.value)} 
                  rows={5}
                  placeholder="Compose or modify tactical message..." 
                  className="eoc-input resize-none"
                  required
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="eoc-button-primary w-full py-4 rounded-xl flex items-center justify-center gap-2 font-black relative overflow-hidden"
                disabled={showSuccess}
              >
                {showSuccess ? (
                  <>
                    <CheckCircle2 size={18} className="animate-bounce" />
                    {dispatchMode === 'SCHEDULED' ? 'BROADCAST SCHEDULED SUCCESSFULLY' : 'BROADCAST SENT SUCCESSFULLY'}
                  </>
                ) : (
                  <>
                    {dispatchMode === 'SCHEDULED' ? <Smartphone size={16} /> : <Send size={16} />}
                    {dispatchMode === 'SCHEDULED' ? 'SCHEDULE OUTBOUND ALERT' : 'DISPATCH OPERATIONAL ALERT'}
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Slide-out Drawer for Handset Simulation */}
          <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${showSimulatorDrawer ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}>
            <div 
              className={`absolute inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-300 ${showSimulatorDrawer ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setShowSimulatorDrawer(false)}
            />
            <div className={`absolute inset-y-0 right-0 max-w-full flex pl-10 transition-transform duration-300 ease-in-out ${showSimulatorDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="w-screen max-w-md bg-[#0a0a0d]/95 border-l border-zinc-800/80 backdrop-blur-2xl flex flex-col shadow-2xl relative">
                <div className="flex items-center justify-between p-6 border-b border-zinc-900 bg-zinc-950/40">
                  <div className="flex items-center gap-2.5">
                    <Smartphone size={18} className="text-amber-500" />
                    <div>
                      <h3 className="text-sm font-extrabold uppercase text-zinc-100 tracking-wider">Handset Simulation</h3>
                      <p className="text-[10px] text-zinc-500 font-medium">Real-time device preview simulation</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSimulatorDrawer(false)}
                    className="p-1.5 rounded-lg border border-zinc-900 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800 transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scroll flex flex-col items-center justify-center p-6 bg-zinc-950/20">
                  <div className="w-[310px] h-[610px] bg-zinc-950 border-[10px] border-zinc-900 rounded-[44px] shadow-2xl relative flex flex-col overflow-hidden select-none border-t-[12px] border-b-[12px] ring-2 ring-zinc-800 shrink-0 my-auto">
                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-zinc-900 rounded-full z-20 flex items-center justify-center gap-1.5 px-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                      <div className="w-14 h-1 bg-zinc-800 rounded-full" />
                    </div>

                    <div className="h-8 pt-3 px-6 flex items-center justify-between text-[10px] font-sans font-bold text-zinc-500 z-10 bg-zinc-950">
                      <span>9:41 AM</span>
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <Signal size={10} className="text-zinc-500" />
                        <span className="font-sans font-bold text-[9px] mr-1">5G</span>
                        <Battery size={10} className="text-zinc-500" />
                        <span className="font-sans font-bold text-[9px]">100%</span>
                      </div>
                    </div>

                    <div className="flex bg-zinc-950 border-b border-zinc-900/60 p-1 gap-1 z-10">
                      {(['SMS', 'EMAIL', 'VOICE'] as const).map(tab => {
                        const isActive = previewTab === tab;
                        const isEnabled = channels.includes(tab);
                        
                        return (
                          <button
                            key={tab}
                            type="button"
                            disabled={!isEnabled}
                            onClick={() => setPreviewTab(tab)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-1 ${
                              isActive 
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                : isEnabled 
                                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent cursor-pointer' 
                                  : 'text-zinc-700 opacity-40 cursor-not-allowed border border-transparent'
                            }`}
                          >
                            {tab === 'SMS' && <MessageSquare size={10} />}
                            {tab === 'EMAIL' && <Mail size={10} />}
                            {tab === 'VOICE' && <Phone size={10} />}
                            <span>{tab === 'SMS' ? 'SMS' : tab === 'EMAIL' ? 'Email' : 'Voice'}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex-1 bg-[#0a0a0c] p-4 overflow-y-auto custom-scroll flex flex-col justify-start">
                      {previewTab === 'SMS' ? (
                        <div className="space-y-4 pt-4 flex-1 flex flex-col justify-end">
                          <div className="text-center">
                            <span className="text-[9px] font-mono bg-zinc-900 px-3 py-1 rounded text-zinc-500 font-bold">
                              TODAY 9:41 AM
                            </span>
                          </div>
                          
                          {body ? (
                            <div className="flex flex-col items-start max-w-[85%] self-start space-y-1">
                              <div className="text-[9px] font-sans font-extrabold text-zinc-500 uppercase tracking-widest pl-1">
                                {agencyName.toUpperCase()}
                              </div>
                              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none p-3 text-xs text-zinc-200 font-medium leading-relaxed shadow-sm font-sans">
                                {body}
                              </div>
                              <div className="text-[8px] font-mono font-bold text-zinc-600 pl-1">
                                9:41 AM · RECEIVED
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-center text-center p-6">
                              <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                                COMPOSER EMPTY<br />WAITING FOR INPUT...
                              </p>
                            </div>
                          )}
                        </div>
                      ) : previewTab === 'EMAIL' ? (
                        <div className="bg-[#111115] border border-zinc-900 rounded-xl overflow-hidden flex flex-col flex-1 shadow-inner text-left font-sans">
                          <div className="bg-zinc-950 p-3.5 border-b border-zinc-900 flex items-center gap-2 select-none">
                            <img 
                              src={agencyLogo || "/assets/logo/cem_logo.png"} 
                              alt={`${agencyName} Logo`} 
                              className="h-5 w-auto object-contain opacity-80" 
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="text-[10px] font-extrabold tracking-widest text-[#ffd000] uppercase font-sans">
                              {agencyName.toUpperCase()}
                            </span>
                          </div>

                          <div className="p-4 space-y-4 flex-1 flex flex-col justify-start text-[11px]">
                            <div className="border-b border-zinc-900 pb-2 space-y-1">
                              <div className="text-[9px] text-zinc-500 font-extrabold">SUBJECT:</div>
                              <div className="text-zinc-200 font-extrabold uppercase leading-snug font-sans">
                                {subject || 'NO SUBJECT HEADER REGISTERED'}
                              </div>
                            </div>

                            {body ? (
                              <div className="text-zinc-300 space-y-4 leading-relaxed font-sans">
                                <p className="font-extrabold text-[#ffd000]">OPERATIONAL DIRECTIVE:</p>
                                <p className="font-medium">{body}</p>
                                <div className="border-t border-zinc-900 pt-3 text-[9px] text-zinc-500 space-y-1 font-bold">
                                  <div>{agencyName.toUpperCase()}</div>
                                  <div>TELE: (206) 786-5300</div>
                                  <div>EMAIL: WATCHCENTER@CASCADIA-EM.COM</div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-center text-center p-6">
                                <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                                  EMAIL BODY EMPTY<br />WAITING FOR INPUT...
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-between pt-6 space-y-6 text-center">
                          <div className="space-y-6 flex flex-col items-center w-full">
                            <div className="relative flex items-center justify-center my-2">
                              <div className="absolute w-20 h-24 rounded-full border border-amber-500/20 bg-amber-500/5 animate-ping duration-1000" />
                              <div className="absolute w-28 h-32 rounded-full border border-amber-500/10 bg-amber-500/5 animate-pulse duration-1500" />
                              
                              <div className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] z-10">
                                <Phone size={20} className="animate-bounce" />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-xs font-black uppercase text-zinc-100 tracking-wider">{agencyName.toUpperCase()}</h4>
                              <p className="text-[8px] font-mono text-zinc-500 font-bold uppercase tracking-widest leading-none">OUTBOUND EMERGENCY ALERT DIALER</p>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1 flex items-center gap-1.5 self-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <Volume2 size={10} className="text-amber-500 shrink-0" />
                              <span className="text-[8px] font-mono font-bold text-amber-500 uppercase tracking-wide">
                                DIALING TARGET GROUP...
                              </span>
                            </div>

                            {body ? (
                              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-1 text-left">
                                <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                  <Mic size={10} className="text-zinc-500 shrink-0" />
                                  <span>TEXT-TO-SPEECH PLAYBACK:</span>
                                </span>
                                <p className="text-[10px] text-zinc-300 font-medium leading-relaxed font-sans italic border-l-2 border-amber-500/40 pl-2">
                                  "{body}"
                                </p>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-center p-4">
                                <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider leading-relaxed">
                                  COMPOSER EMPTY<br />WAITING FOR INPUT...
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="w-full grid grid-cols-3 gap-2 pt-3 border-t border-zinc-900/60 text-[8px] font-extrabold uppercase text-zinc-500 pb-2">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                                <MicOff size={12} />
                              </div>
                              <span>Mute</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                                <Grid size={12} />
                              </div>
                              <span>Keypad</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                                <Volume2 size={12} />
                              </div>
                              <span>Speaker</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="h-4 pb-2 flex items-center justify-center bg-zinc-950 z-10">
                      <div className="w-24 h-1 bg-zinc-800 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* GUIDED ALERT WIZARD VIEW BRANCH */
        <div className="space-y-6">
          {wizardCompleted ? (
            /* LIVE DELIVERY & AUDIT CONFIRMATION PANEL */
            <CanvaGlassPanel glow={true} className="p-8 space-y-6 max-w-2xl mx-auto text-center border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.05)] animate-fadeIn">
              <div className="flex flex-col items-center gap-3">
                <div className="relative flex items-center justify-center my-2">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="42" stroke="rgba(39,39,42,0.6)" strokeWidth="6" fill="transparent" />
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      stroke="#10b981"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 - (deliveryStatus.progress / 100) * (2 * Math.PI * 42)}
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-black font-mono text-zinc-100">{deliveryStatus.progress}%</span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none">TELEMETRY</span>
                  </div>
                </div>
                
                <h3 className="text-xl font-black uppercase text-zinc-100 tracking-wide mt-2">Active Telemetry Transmission</h3>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                  {deliveryStatus.progress === 100 ? '✅ BROADCAST COMPLETED' : '📡 DISPATCHING LIVE PACKETS'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-1 text-left">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block leading-none">TARGET VALUE</span>
                  <span className="text-lg font-black text-zinc-200 font-mono">{targetCount}</span>
                </div>
                <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-1 text-left">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block leading-none">TRANSMITTED</span>
                  <span className="text-lg font-black text-amber-500 font-mono">{deliveryStatus.sent}</span>
                </div>
                <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-1 text-left">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block leading-none">DELIVERED</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">{deliveryStatus.delivered}</span>
                </div>
                <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-1 text-left">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase block leading-none">CONFIRMED (TTS)</span>
                  <span className="text-lg font-black text-[#ffd000] font-mono">{deliveryStatus.confirmed}</span>
                </div>
              </div>

              {/* Fake webhooks scrolling log */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-left font-mono text-[10px] text-zinc-400 space-y-2 h-44 overflow-y-auto custom-scroll">
                <div>[09:41:00] <span className="text-amber-500">COMMS ENGINE INIT</span>: Routing mass broadcast parameters for {recipientGroup}...</div>
                {deliveryStatus.progress >= 10 && (
                  <div>[09:41:01] <span className="text-amber-400">GW_HANDSHAKE</span>: Standard Twilio webhook bindings configured. Character segment mapping loaded.</div>
                )}
                {deliveryStatus.progress >= 25 && (
                  <div>[09:41:02] <span className="text-emerald-500">TX_OUTBOUND</span>: Omnidirectional packet routing started via SMS/EMAIL gateways.</div>
                )}
                {deliveryStatus.progress >= 45 && (
                  <div>[09:41:03] <span className="text-zinc-500">VOICE_CALLS</span>: TTS outdial active. Triggered dialing sequence for targets.</div>
                )}
                {deliveryStatus.progress >= 65 && (
                  <div>[09:41:04] <span className="text-emerald-400">RCV_RECEIPT</span>: Delivered handsets increasing: {deliveryStatus.delivered} confirmed with provider.</div>
                )}
                {deliveryStatus.progress >= 85 && (
                  <div>[09:41:05] <span className="text-amber-400">CHECK_IN_CALLBACK</span>: Responders check-in loop initialized. Logging confirmed handshakes.</div>
                )}
                {deliveryStatus.progress === 100 && (
                  <>
                    <div className="text-emerald-400 font-bold">[09:41:06] SUCCESS: Dispatch packets fully sent. Ledger immutable trail compiled.</div>
                    <div className="text-zinc-500">[09:41:06] Telemetry broadcast to active ledger completed with zero carrier packet loss.</div>
                  </>
                )}
              </div>

              <div className="flex gap-4 pt-2">
                <CanvaButton
                  variant="secondary"
                  className="flex-1 py-3"
                  onClick={() => {
                    setBody('');
                    setSubject('');
                    setWizardStep(1);
                    setWizardCompleted(false);
                    setAlertingMode('RAPID');
                  }}
                >
                  Return to Rapid Console
                </CanvaButton>
                <CanvaButton
                  variant="primary"
                  className="flex-1 py-3"
                  onClick={() => {
                    setBody('');
                    setSubject('');
                    setWizardStep(1);
                    setWizardCompleted(false);
                  }}
                >
                  Compose Another Wizard Alert
                </CanvaButton>
              </div>
            </CanvaGlassPanel>
          ) : (
            /* ACTIVE STEPS */
            <div className="space-y-6">
              {/* Stepper Progress Bar */}
              <div className="flex justify-between items-center bg-zinc-950 p-4 border border-zinc-900 rounded-2xl">
                {steps.map((s, index) => {
                  const isActive = wizardStep === s.num;
                  const isDone = wizardStep > s.num;
                  
                  return (
                    <React.Fragment key={s.num}>
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full border-[2px] font-mono font-extrabold flex items-center justify-center text-xs transition-all ${
                          isActive
                            ? 'border-amber-500 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : isDone
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                              : 'border-zinc-800 bg-transparent text-zinc-600'
                        }`}>
                          {isDone ? '✓' : s.num}
                        </div>
                        <div className="hidden md:block text-left">
                          <div className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-zinc-100' : 'text-zinc-500'}`}>
                            {s.label}
                          </div>
                          <div className="text-[9px] text-zinc-600 font-bold tracking-tight">
                            {s.desc}
                          </div>
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`flex-1 h-[2px] mx-2 ${isDone ? 'bg-emerald-500/40' : 'bg-zinc-900'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Step Render Block */}
              <CanvaGlassPanel className="p-6 space-y-6">
                
                {wizardStep === 1 && (
                  /* STEP 1: WHO */
                  <div className="space-y-5">
                    <div className="border-b border-zinc-900 pb-3">
                      <h3 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide flex items-center gap-2">
                        <Users size={16} className="text-amber-500" />
                        <span>Step 1: Define Target Audience</span>
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium">Select who receives this alert. Active telemetry devices are estimated live.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { name: 'Primary Keyholders', handsets: 12, label: 'Primary Keyholders', desc: 'Critical Facility & Safe-house Keyholders' },
                        { name: 'CERT Team Alpha', handsets: 18, label: 'CERT Team Alpha', desc: 'Emergency Response Team On-Call' },
                        { name: 'All Operational Staff', handsets: 42, label: 'All Operational Staff', desc: 'EOC Roster & Area Field Staff' },
                        { name: 'Tribal Council Leadership', handsets: 8, label: 'Tribal Council Leadership', desc: 'Senior Government & Advisory Leadership' },
                        { name: 'Event Guests', handsets: 1500, label: 'Event Guests', desc: 'Registered Patrons & Public Visitors' },
                        { name: 'Senior Command Outpost', handsets: 6, label: 'Senior Command Outpost', desc: 'Strategic Incident Commanders' }
                      ].map((group) => {
                        const isSelected = recipientGroup === group.name;
                        return (
                          <div
                            key={group.name}
                            onClick={() => setRecipientGroup(group.name)}
                            className={`glass-card p-5 cursor-pointer border rounded-2xl transition-all hover:border-amber-500/40 ${
                              isSelected 
                                ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30' 
                                : 'bg-zinc-950/40 border-zinc-900 text-zinc-300'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h3 className="font-extrabold uppercase tracking-wide text-zinc-100 text-xs">{group.label}</h3>
                                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{group.desc}</p>
                              </div>
                              <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                                isSelected ? 'border-amber-500 bg-amber-500 text-black' : 'border-zinc-700 bg-transparent'
                              }`}>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-zinc-900/60 flex items-center justify-between">
                              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase">TELEMETRY GAUGE</span>
                              <span className="text-[9px] font-mono font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                {group.handsets} ACTIVE DEVICES
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  /* STEP 2: WHAT */
                  <div className="space-y-5">
                    <div className="border-b border-zinc-900 pb-3">
                      <h3 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide flex items-center gap-2">
                        <Pencil size={16} className="text-amber-500" />
                        <span>Step 2: Compose Broadcast Message</span>
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium">Choose a pre-approved template or compose custom ad-hoc emergency instructions.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CanvaFormRow label="Audience Target (Selected in Step 1)">
                        <div className="eoc-input bg-zinc-950/60 border border-zinc-900 font-bold text-zinc-400 py-3 px-4 rounded-xl text-xs flex items-center justify-between">
                          <span>{recipientGroup.toUpperCase()}</span>
                          <span className="text-[10px] text-zinc-600">Locked</span>
                        </div>
                      </CanvaFormRow>

                      <CanvaFormRow 
                        label="Operational Alert Template"
                        rightElement={<CanvaDropdownCustomizer dropdownKey="alert_templates" label="Alert Template" />}
                      >
                        <CanvaSelect
                          value={selectedTemplateId}
                          onChange={e => setSelectedTemplateId(e.target.value)}
                        >
                          <option value="ad-hoc">-- COMPOSE AD-HOC (GENESIS) --</option>
                          {activeTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </CanvaSelect>
                      </CanvaFormRow>
                    </div>

                    {channels.includes('EMAIL') && (
                      <CanvaFormRow label="Official Email Subject Header">
                        <CanvaInput
                          type="text"
                          value={subject}
                          onChange={e => setSubject(e.target.value)}
                          placeholder="ENTER OFFICIAL NIMS EMAIL TITLE..."
                          required
                        />
                      </CanvaFormRow>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-wider block">Message Instruction Body</label>
                        <span className="text-[10px] font-mono font-bold text-zinc-500">{body.length} CHARACTERS</span>
                      </div>
                      <CanvaTextarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={4}
                        placeholder="Type tactical instructions or adjust template text..."
                        required
                      />
                    </div>

                    {/* Inline Verification Gate for Custom Compositions */}
                    {isAdHoc && (
                      <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                            <ShieldAlert size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-zinc-100 tracking-wider">Command Authorization Required</h4>
                            <span className="text-[9px] font-mono font-bold text-red-500 uppercase tracking-widest">Tier-2 Security Access Gate</span>
                          </div>
                        </div>
                        
                        <p className="text-[11px] text-zinc-400 font-semibold leading-relaxed">
                          You have composed a custom ad-hoc broadcast alert. This action requires Tier-2 command approval and secondary PIN override to prevent rogue alerts.
                        </p>

                        {wizardPinVerified ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-2.5 text-emerald-400">
                            <CheckCircle2 size={16} className="text-emerald-400" />
                            <div className="text-xs font-bold uppercase tracking-wider">
                              Credentials Verified: Approved by {wizardAuthRole}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                             <CanvaFormRow 
                              label="Approving Operational Role" 
                              rightElement={<CanvaDropdownCustomizer dropdownKey="approving_roles" label="Approval Role" />}
                            >
                              <CanvaSelect
                                value={wizardAuthRole}
                                onChange={e => setWizardAuthRole(e.target.value)}
                                className="text-xs py-2"
                              >
                                {dropdowns.approving_roles.map(role => (
                                  <option key={role} value={role}>{role}</option>
                                ))}
                              </CanvaSelect>
                            </CanvaFormRow>

                            <CanvaFormRow label="Override PIN">
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                                    <Lock size={12} />
                                  </span>
                                  <input
                                    type="password"
                                    value={wizardAuthPassword}
                                    onChange={e => setWizardAuthPassword(e.target.value)}
                                    placeholder="PIN OVERRIDE..."
                                    className="eoc-input pl-10 text-xs py-2.5 bg-zinc-950"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={handleWizardVerifyPin}
                                  className="px-4 py-2 bg-red-655 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-transparent shadow"
                                >
                                  Verify
                                </button>
                              </div>
                            </CanvaFormRow>
                          </div>
                        )}

                        {wizardAuthError && (
                          <div className="text-[10px] font-sans font-black text-red-500 bg-red-950/25 border border-red-500/20 rounded-lg p-2.5 leading-relaxed flex items-center gap-1.5">
                            <ShieldAlert size={12} className="text-red-500 shrink-0" />
                            <span>{wizardAuthError}</span>
                          </div>
                        )}
                        
                        {!wizardPinVerified && (
                          <div className="text-[9px] font-mono font-bold text-zinc-500 leading-none text-center">
                            Operational Testing PIN Clue: <span className="text-amber-500 select-all font-black">EOC-2026</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {wizardStep === 3 && (
                  /* STEP 3: HOW */
                  <div className="space-y-5">
                    <div className="border-b border-zinc-900 pb-3">
                      <h3 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide flex items-center gap-2">
                        <Signal size={16} className="text-amber-500" />
                        <span>Step 3: Choose Transmission Channels</span>
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium">Configure delivery mechanisms. Review estimated characters and billing safety gauges below.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { id: 'SMS', label: 'SMS Text message', desc: 'Direct carrier text alert', icon: <MessageSquare size={16} />, cost: 0.0075, unit: 'handset', gauge: `${body.length <= 160 ? '1 Segment' : '2 Segments'} · ${160 - (body.length % 160)} chars left` },
                        { id: 'EMAIL', label: 'HTML Email Inbox', desc: 'NIMS compliant formatting', icon: <Mail size={16} />, cost: 0.0001, unit: 'inbox', gauge: 'NIMS Formatted Header' },
                        { id: 'VOICE', label: 'Voice Call Outdial', desc: 'Text-To-Speech phone dialing', icon: <Phone size={16} />, cost: 0.0130, unit: 'dial/min', gauge: 'Automated TTS Dial Loop' },
                        { id: 'RADIO', label: 'Two-Way Radio net', desc: 'Analog command VHF/UHF net', icon: <Signal size={16} />, cost: 0.0000, unit: 'frequency', gauge: 'Analog Tone Broadcast' }
                      ].map((ch) => {
                        const isSelected = ch.id === 'RADIO' ? includeRadio : channels.includes(ch.id as any);
                        return (
                          <div
                            key={ch.id}
                            onClick={() => {
                              if (ch.id === 'RADIO') {
                                setIncludeRadio(!includeRadio);
                              } else {
                                toggleChannel(ch.id as any);
                              }
                            }}
                            className={`glass-card p-5 cursor-pointer border rounded-2xl transition-all hover:border-amber-500/40 relative ${
                              isSelected 
                                ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30' 
                                : 'bg-zinc-950/40 border-zinc-900 text-zinc-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`h-10 w-10 border rounded-xl flex items-center justify-center transition-all ${
                                isSelected ? 'bg-amber-500/10 border-amber-500/35 text-amber-500' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                              }`}>
                                {ch.icon}
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-extrabold uppercase tracking-wide text-zinc-100 text-xs">{ch.label}</h4>
                                <p className="text-[10px] text-zinc-500 font-semibold">{ch.desc}</p>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-zinc-900/60 flex items-center justify-between">
                              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase">SAFETY GAUGE</span>
                              <span className="text-[9px] font-mono font-black text-amber-500">
                                {ch.gauge}
                              </span>
                            </div>

                            <div className="absolute top-4 right-5 text-right space-y-0.5">
                              <span className="text-[10px] font-mono font-bold text-zinc-400 block leading-none">${ch.cost.toFixed(4)}</span>
                              <span className="text-[8px] font-mono font-bold text-zinc-600 uppercase block tracking-widest">per {ch.unit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block leading-none mb-1">Estimated Responders Targeted</span>
                        <span className="text-md font-black text-zinc-200 font-mono">{targetCount} active devices</span>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block leading-none mb-1">Billing Telemetry Estimation</span>
                        <span className="text-md font-black text-amber-500 font-mono">${estimatedCost.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 4 && (
                  /* STEP 4: PREVIEW */
                  <div className="space-y-5">
                    <div className="border-b border-zinc-900 pb-3">
                      <h3 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide flex items-center gap-2">
                        <Smartphone size={16} className="text-amber-500" />
                        <span>Step 4: Device Preview Visualizer</span>
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium">Verify how operational alerts display across communication terminal channels.</p>
                    </div>

                    {/* Previews Selection Tabs within wizard */}
                    <div className="flex bg-zinc-950/80 p-1 rounded-xl border border-zinc-900/60 max-w-md">
                      {(['SMS', 'EMAIL', 'VOICE'] as const).map(tab => {
                        const isEnabled = tab === 'SMS' ? channels.includes('SMS') : tab === 'EMAIL' ? channels.includes('EMAIL') : channels.includes('VOICE');
                        const isActive = previewTab === tab;
                        return (
                          <button
                            key={tab}
                            type="button"
                            disabled={!isEnabled}
                            onClick={() => setPreviewTab(tab)}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              isActive
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg'
                                : isEnabled
                                  ? 'text-zinc-500 hover:text-zinc-300'
                                  : 'text-zinc-800 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            {tab === 'SMS' && <MessageSquare size={12} />}
                            {tab === 'EMAIL' && <Mail size={12} />}
                            {tab === 'VOICE' && <Phone size={12} />}
                            <span>{tab} Preview</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-center p-6 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl min-h-[450px]">
                      {previewTab === 'SMS' ? (
                        /* SMS phone mockup shell */
                        <div className="w-[290px] h-[450px] bg-zinc-950 border-[6px] border-zinc-900 rounded-[36px] shadow-2xl relative flex flex-col overflow-hidden select-none ring-1 ring-zinc-800 shrink-0">
                          <div className="h-6 pt-2 px-5 flex items-center justify-between text-[8px] font-sans font-bold text-zinc-500 z-10 bg-zinc-950">
                            <span>9:41 AM</span>
                            <div className="flex items-center gap-1">
                              <Signal size={8} />
                              <Battery size={8} />
                            </div>
                          </div>
                          
                          <div className="flex-1 bg-[#0a0a0c] p-3 overflow-y-auto custom-scroll flex flex-col justify-end">
                            <div className="text-center mb-3">
                              <span className="text-[8px] font-mono bg-zinc-900 px-2 py-0.5 rounded text-zinc-500 font-bold uppercase">TODAY 9:41 AM</span>
                            </div>
                            <div className="flex flex-col items-start max-w-[85%] self-start space-y-1">
                              <div className="text-[8px] font-sans font-extrabold text-zinc-500 uppercase tracking-widest pl-1">
                                {agencyName.toUpperCase()}
                              </div>
                              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none p-3 text-[11px] text-zinc-200 font-medium leading-relaxed shadow-sm font-sans text-left">
                                {body || 'NO MESSAGE DRAFTED...'}
                              </div>
                            </div>
                          </div>
                          <div className="h-3 bg-zinc-950 flex items-center justify-center">
                            <div className="w-16 h-[3px] bg-zinc-800 rounded-full" />
                          </div>
                        </div>
                      ) : previewTab === 'EMAIL' ? (
                        /* Email desktop/tablet mock */
                        <div className="w-full max-w-xl border border-zinc-900 rounded-xl overflow-hidden flex flex-col bg-zinc-950 shadow-2xl text-left font-sans text-xs">
                          <div className="bg-zinc-950 p-3.5 border-b border-zinc-900 flex items-center gap-2 select-none">
                            <img src={agencyLogo || "/assets/logo/cem_logo.png"} alt="Agency Logo" className="h-4 w-auto object-contain opacity-80" onError={e => (e.target as any).style.display = 'none'} />
                            <span className="text-[9px] font-extrabold tracking-widest text-[#ffd000] uppercase">{agencyName.toUpperCase()}</span>
                          </div>
                          
                          <div className="p-4 space-y-3 bg-[#0c0c10] flex-1">
                            <div className="border-b border-zinc-900 pb-2 space-y-0.5">
                              <div className="text-[9px] text-zinc-500 font-extrabold">SUBJECT:</div>
                              <div className="text-zinc-200 font-extrabold uppercase leading-snug">{subject || 'NO SUBJECT LINE PROVIDED'}</div>
                            </div>
                            <div className="text-zinc-300 space-y-4 leading-relaxed font-sans pt-2">
                              <p className="font-extrabold text-[#ffd000]">OPERATIONAL ALERT REPORT:</p>
                              <p className="font-medium whitespace-pre-wrap">{body || 'NO MESSAGE DRAFTED...'}</p>
                              <div className="border-t border-zinc-900 pt-3 text-[9px] text-zinc-500 space-y-0.5 font-bold">
                                <div>{agencyName.toUpperCase()}</div>
                                <div>WATCHCENTER@CASCADIA-EM.COM</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Voice outdial simulator mock */
                        <div className="w-[290px] h-[450px] bg-zinc-950 border-[6px] border-zinc-900 rounded-[36px] shadow-2xl relative flex flex-col overflow-hidden select-none ring-1 ring-zinc-800 shrink-0 p-4 items-center justify-between text-center">
                          <div className="space-y-6 flex flex-col items-center w-full mt-6">
                            <div className="relative flex items-center justify-center my-2">
                              <div className="absolute w-16 h-20 rounded-full border border-amber-500/20 bg-amber-500/5 animate-ping duration-1000" />
                              <div className="absolute w-24 h-28 rounded-full border border-amber-500/10 bg-amber-500/5 animate-pulse duration-1500" />
                              
                              <div className="w-12 h-12 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)] z-10">
                                <Phone size={18} className="animate-bounce" />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-[11px] font-black uppercase text-zinc-100 tracking-wider">{agencyName.toUpperCase()}</h4>
                              <p className="text-[7px] font-mono text-zinc-500 font-bold uppercase tracking-widest leading-none">OUTBOUND TTS BROADCAST</p>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-0.5 flex items-center gap-1.5 self-center">
                              <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                              <Volume2 size={8} className="text-amber-500 shrink-0" />
                              <span className="text-[7px] font-mono font-bold text-amber-500 uppercase tracking-wide">CONNECTING...</span>
                            </div>

                            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-1 text-left">
                              <span className="text-[7px] font-mono font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                <Mic size={8} />
                                <span>TEXT-TO-SPEECH READOUT:</span>
                              </span>
                              <p className="text-[9px] text-zinc-300 font-medium leading-relaxed font-sans italic border-l-2 border-amber-500/40 pl-2">
                                "{body || 'NO MESSAGE DRAFTED...'}"
                              </p>
                            </div>
                          </div>

                          <div className="w-full grid grid-cols-3 gap-1 pt-3 border-t border-zinc-900/60 text-[7px] font-extrabold uppercase text-zinc-500 mb-2">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                                <MicOff size={10} />
                              </div>
                              <span>Mute</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                                <Grid size={10} />
                              </div>
                              <span>Keypad</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                                <Volume2 size={10} />
                              </div>
                              <span>Speaker</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {wizardStep === 5 && (
                  /* STEP 5: FINAL CONFIRM WITH SAFETY CATCH */
                  <div className="space-y-6">
                    <div className="border-b border-zinc-900 pb-3">
                      <h3 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide flex items-center gap-2">
                        <Lock size={16} className="text-amber-500" />
                        <span>Step 5: Final Review & Secure Release</span>
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium">Verify dispatch ledger parameters. Safety catch requires deliberate hold action to dispatch.</p>
                    </div>

                    <div className="bg-black/60 border border-zinc-900 rounded-2xl p-6 space-y-4 max-w-xl mx-auto">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">ICS CONFIGURATION SHEET</span>
                        <span className="text-[9px] font-mono font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">PRE-DISPATCH READY</span>
                      </div>

                      <table className="w-full text-left border-collapse text-xs">
                        <tbody className="divide-y divide-zinc-900/60 font-sans">
                          <tr>
                            <td className="py-2.5 text-zinc-500 font-semibold uppercase tracking-wider">TARGET RESCUER GROUP</td>
                            <td className="py-2.5 text-zinc-100 font-bold uppercase text-right">{recipientGroup}</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 text-zinc-500 font-semibold uppercase tracking-wider">DELIVERY TARGETS</td>
                            <td className="py-2.5 text-zinc-100 font-mono font-bold text-right">{targetCount} active devices</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 text-zinc-500 font-semibold uppercase tracking-wider">ACTIVE CHANNELS</td>
                            <td className="py-2.5 text-amber-500 font-bold uppercase text-right">
                              {channels.join(' + ')} {includeRadio && '+ Analog Radio Net'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 text-zinc-500 font-semibold uppercase tracking-wider">DISPATCH MODALITY</td>
                            <td className="py-2.5 text-zinc-100 font-bold uppercase text-right">{dispatchMode === 'IMMEDIATE' ? 'IMMEDIATE TRANSMIT' : 'SCHEDULED RELEASE QUEUE'}</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 text-zinc-500 font-semibold uppercase tracking-wider">MESSAGE SEGMENTS</td>
                            <td className="py-2.5 text-zinc-100 font-mono font-bold text-right">
                              {body.length} Chars ({body.length <= 160 ? '1 Segment' : '2 Segments'})
                            </td>
                          </tr>
                          <tr className="border-t-[2px] border-zinc-900">
                            <td className="py-3 text-[#ffd000] font-black uppercase tracking-wider">TOTAL ESTIMATED METRICS</td>
                            <td className="py-3 text-amber-500 font-mono font-black text-right">${estimatedCost.toFixed(4)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col items-center justify-center p-8 border border-zinc-900 rounded-2xl bg-zinc-950/40 relative">
                      {/* Safety Press-and-Hold Circle Button */}
                      <div className="relative flex items-center justify-center h-40">
                        <svg className="w-32 h-32 transform -rotate-90 select-none">
                          <circle cx="64" cy="64" r="45" stroke="rgba(39,39,42,0.6)" strokeWidth="6" fill="transparent" />
                          <circle
                            cx="64"
                            cy="64"
                            r="45"
                            stroke={holdProgress >= 100 ? '#10b981' : '#f59e0b'}
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 45}
                            strokeDashoffset={2 * Math.PI * 45 - (holdProgress / 100) * (2 * Math.PI * 45)}
                            className="transition-all duration-75"
                          />
                        </svg>
                        
                        <button
                          type="button"
                          onMouseDown={() => setHoldActive(true)}
                          onMouseUp={() => setHoldActive(false)}
                          onMouseLeave={() => setHoldActive(false)}
                          onTouchStart={() => setHoldActive(true)}
                          onTouchEnd={() => setHoldActive(false)}
                          className={`absolute w-20 h-20 rounded-full flex flex-col items-center justify-center select-none cursor-pointer transition-all duration-200 border-2 active:scale-95 ${
                            holdActive
                              ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          }`}
                          style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none'
                          }}
                        >
                          <Lock size={20} className={holdActive ? 'animate-bounce text-amber-400' : ''} />
                          <span className="text-[8px] font-black font-sans tracking-widest uppercase leading-none mt-1 text-center px-1">
                            {holdActive ? 'HOLDING...' : 'HOLD TO DISPATCH'}
                          </span>
                        </button>
                      </div>

                      <div className="text-center max-w-xs mt-3">
                        <span className="text-[10px] font-sans font-extrabold text-zinc-500 uppercase tracking-widest block leading-none mb-1">Deliberate safety settle</span>
                        <span className="text-[10px] text-zinc-600 font-semibold leading-normal block">Press and hold for 3 seconds to trigger telemetry and dispatch packets.</span>
                      </div>
                    </div>
                  </div>
                )}

              </CanvaGlassPanel>

              {/* Stepper Navigation Actions */}
              <div className="flex justify-between items-center">
                <CanvaButton
                  variant="secondary"
                  onClick={() => setWizardStep(prev => Math.max(prev - 1, 1))}
                  disabled={wizardStep === 1}
                  className="py-3 px-6"
                >
                  Back Step
                </CanvaButton>

                {wizardStep < 5 ? (
                  <CanvaButton
                    variant="primary"
                    onClick={() => setWizardStep(prev => Math.min(prev + 1, 5))}
                    disabled={
                      (wizardStep === 1 && !recipientGroup) ||
                      (wizardStep === 2 && (isAdHoc ? !wizardPinVerified : !body.trim())) ||
                      (wizardStep === 3 && channels.length === 0)
                    }
                    className="py-3 px-6"
                  >
                    Next Step
                  </CanvaButton>
                ) : (
                  <div className="w-[100px]" /> /* alignment empty spacer */
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom: Scheduled Alerts & Recurring Tests Ledger Console */}
      <div className="glass-card p-6 mt-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-900 pb-4 gap-4">
          <div className="flex items-center gap-2.5">
            <Clock className="text-amber-500 shrink-0" size={18} />
            <div>
              <h2 className="text-md font-extrabold uppercase text-zinc-100 tracking-wide">Scheduled Alerts & Recurring Tests Console</h2>
              <p className="text-xs text-zinc-500 font-medium">Pre-scripted tests, network checks, and staged outbound broadcasts.</p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded text-zinc-400 font-bold uppercase tracking-wider">
            ACTIVE LEDGER QUEUE: {scheduledAlerts.length} ITEMS
          </span>
        </div>

        <div className="overflow-x-auto custom-scroll">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-zinc-900 text-[10px] font-extrabold uppercase text-zinc-500 tracking-widest pb-2">
                <th className="py-3 px-4">Active Alert Name</th>
                <th className="py-3 px-4">Target Recipient</th>
                <th className="py-3 px-4">Recurrence / Date</th>
                <th className="py-3 px-4">Next Expected Trigger</th>
                <th className="py-3 px-4 text-center">Channels</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions / Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-xs">
              {scheduledAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-600 font-bold uppercase tracking-wider">
                    No scheduled alerts or automated tests active in queue.
                  </td>
                </tr>
              ) : (
                scheduledAlerts.map(alert => {
                  return (
                    <tr key={alert.id} className="hover:bg-zinc-950/20 transition-colors">
                      <td className="py-4 px-4 font-bold text-zinc-100">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span>{alert.name}</span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 max-w-xs truncate" title={alert.body}>
                            {alert.body}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-zinc-400">
                        <span className="flex items-center gap-1.5"><Users size={12} className="text-zinc-500 shrink-0" /> {alert.recipient}</span>
                      </td>
                      <td className="py-4 px-4 text-zinc-400 font-mono">
                        {alert.schedule}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-amber-500">
                        {alert.active ? (
                          <span className="flex items-center gap-1.5"><Clock size={11} className="text-amber-500 animate-pulse shrink-0" /> {getNextTriggerDate(alert.id, alert.schedule)}</span>
                        ) : (
                          <span className="text-zinc-600">-- STANDBY (PAUSED) --</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {alert.channels.map(ch => (
                            <span 
                              key={ch} 
                              className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${
                          alert.active 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${alert.active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                          {alert.active ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Pause / Resume Switch */}
                          <button
                            type="button"
                            onClick={() => {
                              setScheduledAlerts(prev => prev.map(a => {
                                if (a.id === alert.id) {
                                  const nextActive = !a.active;
                                  dataBus.broadcast({
                                    type: 'COMMS',
                                    origin: 'COMMUNICATIONS MODULE',
                                    payload: { 
                                      message: `Scheduled broadcast [${a.name}] ${nextActive ? 'RESUMED (ACTIVE)' : 'PAUSED (STANDBY)'}` 
                                    },
                                    severity: 'medium'
                                  });
                                  return { ...a, active: nextActive };
                                }
                                return a;
                              }));
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border font-bold text-[10px] uppercase transition-all cursor-pointer ${
                              alert.active
                                ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            title={alert.active ? 'Pause Schedule' : 'Resume Schedule'}
                          >
                            {alert.active ? 'Pause' : 'Resume'}
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => setEditingAlert(alert)}
                            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer flex items-center gap-1"
                            title="Edit scheduled broadcast parameters"
                          >
                            <Pencil size={10} className="text-amber-500 shrink-0" />
                            <span>Edit</span>
                          </button>

                          {/* Direct Manual Trigger Bypass */}
                          <button
                            type="button"
                            onClick={async () => {
                              // Temporarily preserve state variables
                              const savedRecipient = recipientGroup;
                              const savedBody = body;
                              const savedChannels = [...channels];
                              const savedSubject = subject;
                              const savedSelectedTemplate = selectedTemplateId;
                              
                              // Set active state values for this alert to execute properly
                              setRecipientGroup(alert.recipient);
                              setBody(alert.body);
                              setChannels(alert.channels);
                              if (alert.subject) setSubject(alert.subject);
                              setSelectedTemplateId('ad-hoc'); // Force ad-hoc to prompt override or handle directly
                              
                              // Trigger manual bypass telemetry and active ledger sync
                              dataBus.broadcast({
                                type: 'COMMS',
                                origin: 'COMMUNICATIONS MODULE',
                                payload: { 
                                  message: `MANUAL BYPASS DISPATCH triggered for [${alert.name}]: Immediate broadcast pushed to [${alert.recipient.toUpperCase()}] via [${alert.channels.join(' + ')}]` 
                                },
                                severity: 'high'
                              });

                              await sendTelemetryLog({
                                title: `MANUAL SCHEDULE BYPASS: ${alert.name}`,
                                severity: 'high',
                                notes: `Manual bypass dispatch executed for active alert [${alert.name}] by operator request.`,
                                origin_tenant: 'CASCADIA_EM_COMMS',
                                channels: alert.channels.map(c => c.toLowerCase() as 'sms' | 'email' | 'voice'),
                                classification: 'LIFE-SAFETY',
                                alert_message: alert.body,
                                target_label: alert.recipient,
                                ics_position: 'OPERATIONS_SECTION_CHIEF'
                              });

                              // Restore original state fields
                              setRecipientGroup(savedRecipient);
                              setBody(savedBody);
                              setChannels(savedChannels);
                              setSubject(savedSubject);
                              setSelectedTemplateId(savedSelectedTemplate);

                              // Show custom success banner
                              setShowSuccess(true);
                              setTimeout(() => setShowSuccess(false), 3000);
                            }}
                            className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer"
                            title="Manually trigger and dispatch broadcast now"
                          >
                            Trigger Now
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setScheduledAlerts(prev => prev.filter(a => a.id !== alert.id));
                              dataBus.broadcast({
                                type: 'COMMS',
                                origin: 'COMMUNICATIONS MODULE',
                                payload: { 
                                  message: `Scheduled broadcast [${alert.name}] permanently REMOVED from ledger.` 
                                },
                                severity: 'medium'
                              });
                            }}
                            className="px-2.5 py-1.5 border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer"
                            title="Permanently remove schedule"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tier-2 Security Authorization Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-md w-full p-6 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.05)] space-y-6">
            
            <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
              <div className="h-10 w-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-md font-black uppercase text-zinc-100 tracking-wider">Command Authorization Required</h3>
                <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest">Tier-2 Security Access Gate</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 font-bold leading-relaxed">
              You are attempting to dispatch an ad-hoc (manually composed) broadcast alert. This action requires Tier-2 command approval and a secondary PIN override to prevent rogue alerts.
            </p>

            <form onSubmit={handleAuthConfirm} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-wider mb-1.5 block">Approving Operational Role</label>
                <select
                  value={authRole}
                  onChange={e => setAuthRole(e.target.value)}
                  className="eoc-input bg-zinc-950 text-zinc-100 cursor-pointer text-xs py-2.5"
                >
                  <option value="Incident Commander">Incident Commander</option>
                  <option value="EOC Director">EOC Director</option>
                  <option value="Operations Section Chief">Operations Section Chief</option>
                  <option value="Liaison Officer">Liaison Officer</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-wider mb-1.5 block">Secondary Tier Override PIN</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                    <Lock size={14} />
                  </span>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    placeholder="ENTER SECURE OVERRIDE PIN..."
                    className="eoc-input pl-10 text-xs py-2.5"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {authError && (
                <div className="text-[10px] font-sans font-black text-red-500 bg-red-950/20 border border-red-500/20 rounded-lg p-3 leading-relaxed flex items-center gap-1.5">
                  <ShieldAlert size={12} className="text-red-500 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Pilot Testing Clue */}
              <div className="bg-zinc-950/60 border border-zinc-900 rounded-lg p-2.5 text-[9px] font-mono font-bold text-zinc-500 leading-normal text-center flex items-center justify-center gap-1.5">
                <Key size={10} className="text-amber-500 shrink-0" />
                <span>Operational Testing PIN Clue: <span className="text-amber-500 select-all">EOC-2026</span></span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="flex-1 py-2.5 border border-zinc-800 rounded-xl text-xs font-extrabold uppercase text-zinc-400 hover:border-zinc-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/10 cursor-pointer"
                >
                  <Send size={12} />
                  Confirm Dispatch
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Edit Scheduled Alert Modal Overlay */}
      {editingAlert && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-lg w-full p-6 border-zinc-850 shadow-[0_0_50px_rgba(245,158,11,0.05)] space-y-6">
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="text-md font-black uppercase text-zinc-100 tracking-wider">Edit Scheduled Alert</h3>
                  <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest">Active Queue Configuration</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAlert(null)}
                className="p-1.5 rounded-lg border border-zinc-900 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800 transition-all cursor-pointer"
                title="Cancel Edit"
              >
                <X size={14} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!editName.trim() || !editBody.trim() || !editSchedule.trim()) return;
                
                const updatedAlerts = scheduledAlerts.map(a => {
                  if (a.id === editingAlert.id) {
                    return {
                      ...a,
                      name: editName,
                      recipient: editRecipient,
                      schedule: editSchedule,
                      body: editBody,
                      channels: editChannels,
                      subject: editChannels.includes('EMAIL') ? editSubject : undefined
                    };
                  }
                  return a;
                });
                
                setScheduledAlerts(updatedAlerts);
                
                dataBus.broadcast({
                  type: 'COMMS',
                  origin: 'COMMUNICATIONS MODULE',
                  payload: { 
                    message: `Scheduled broadcast alert parameters updated for [${editName}]` 
                  },
                  severity: 'medium'
                });

                setEditingAlert(null);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Alert Configuration Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="eoc-input bg-zinc-950 text-zinc-100 text-xs py-2.5"
                    placeholder="Siren Test, Network Check, etc."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 select-none">
                    <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">Target Recipient Group</label>
                    <CanvaDropdownCustomizer dropdownKey="alert_recipient_groups" label="Recipient Group" />
                  </div>
                  <select
                    value={editRecipient}
                    onChange={e => setEditRecipient(e.target.value)}
                    className="eoc-input bg-zinc-950 text-zinc-100 cursor-pointer text-xs py-2.5"
                  >
                    {(dropdowns.alert_recipient_groups || []).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Recurrence / Date Rule</label>
                  <input
                    type="text"
                    required
                    value={editSchedule}
                    onChange={e => setEditSchedule(e.target.value)}
                    className="eoc-input bg-zinc-950 text-zinc-100 text-xs py-2.5"
                    placeholder="e.g. Weekly Friday, 5:00 PM"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Transmission Channels</label>
                  <div className="flex gap-2 pt-1">
                    {(['SMS', 'EMAIL', 'VOICE'] as const).map(ch => {
                      const isActive = editChannels.includes(ch);
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              if (editChannels.length > 1) {
                                setEditChannels(editChannels.filter(c => c !== ch));
                              }
                            } else {
                              setEditChannels([...editChannels, ch]);
                            }
                          }}
                          className={`flex-1 py-2 border rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            isActive
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                              : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-800'
                          }`}
                        >
                          {ch}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {editChannels.includes('EMAIL') && (
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Email Subject Header</label>
                  <input
                    type="text"
                    required
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    className="eoc-input bg-zinc-950 text-zinc-100 text-xs py-2.5"
                    placeholder="Subject line for email transmission..."
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider mb-1.5 block">Broadcast Alert Message Body</label>
                <textarea
                  required
                  rows={4}
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  className="eoc-input bg-zinc-950 text-zinc-100 text-xs py-2.5 resize-none font-sans leading-relaxed custom-scroll"
                  placeholder="Enter the broadcast notification message..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAlert(null)}
                  className="flex-1 py-3 px-4 border border-zinc-900 hover:bg-zinc-900 text-zinc-400 font-extrabold uppercase rounded-xl text-[10px] tracking-widest transition-all active:scale-95 cursor-pointer"
                >
                  Cancel Edit
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-black font-extrabold uppercase rounded-xl text-[10px] tracking-widest shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  Save Queue Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MessagingCenter;
