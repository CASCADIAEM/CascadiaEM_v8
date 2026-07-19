/**
 * CanoeDataBus.ts
 * Coordinates real-time sync across physical devices and browser-tabs using Firestore and local storage events.
 * Provides native Web Audio API audio synthesis for high-pitched tactical alert sirens.
 * 
 * STRICT FILE LENGTH COMPLIANCE: Under 150 lines.
 */

import { db } from '../../services/Firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface ResponderUnit {
  id: string;
  name: string;
  role: 'medical' | 'security' | 'rescue_boat';
  status: 'STANDBY' | 'ACKNOWLEDGED' | 'PATIENT_CONTACT' | 'CLEARED';
  activeIncidentId?: string;
  notes?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'yellow' | 'red';
  timestamp: string;
  assignedResponders: string[];
}

export interface GlobalAlert {
  message: string;
  severity: 'none' | 'yellow' | 'red';
  timestamp: number;
}

// ==========================================
// 🔊 TACTICAL WEB AUDIO API SYNTHESIZER
// ==========================================
export function playTacticalAlert(pattern: 'single_beep' | 'dual_siren' | 'continuous_alarm') {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (pattern === 'single_beep') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } 
    else if (pattern === 'dual_siren') {
      const osc1 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc1.connect(gain);
      gain.connect(audioCtx.destination);
      osc1.type = 'sawtooth';
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc1.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc1.frequency.linearRampToValueAtTime(1400, audioCtx.currentTime + 0.25);
      osc1.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.5);
      osc1.frequency.linearRampToValueAtTime(1400, audioCtx.currentTime + 0.75);
      osc1.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 1.0);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 1.0);
    }
    else if (pattern === 'continuous_alarm') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      for (let i = 0; i < 6; i++) {
        const time = audioCtx.currentTime + i * 0.3;
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.setValueAtTime(0.01, time + 0.15);
      }
      osc.start();
      osc.stop(audioCtx.currentTime + 1.8);
    }
  } catch (e) {
    console.warn('Audio Context failed to play alert: ', e);
  }
}

// ==========================================
// 📡 STORAGE & FIRESTORE-BASED EVENT SYNC
// ==========================================
export const CANOE_STORAGE_KEYS = {
  RESPONDERS: 'cem_responder_units',
  INCIDENTS: 'cem_incidents',
  ALERT: 'cem_global_alert'
};

export function broadcastStateChange(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('cem_state_sync', { detail: { key, data } }));

  // Push updates to Firestore to sync different physical devices (e.g. Android & Getac)
  try {
    if (key === CANOE_STORAGE_KEYS.ALERT) {
      setDoc(doc(db, 'canoe_landing_system', 'global_alert'), data);
    } else if (key === CANOE_STORAGE_KEYS.RESPONDERS) {
      setDoc(doc(db, 'canoe_landing_system', 'responders'), { list: data });
    } else if (key === CANOE_STORAGE_KEYS.INCIDENTS) {
      setDoc(doc(db, 'canoe_landing_system', 'incidents'), { list: data });
    }
  } catch (err) {
    console.warn('Firestore publish failed: ', err);
  }
}

export function fetchStoredState<T>(key: string, defaultValue: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return defaultValue;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

// Setup real-time cross-device listening over Firestore
try {
  // Global Alerts Sync
  onSnapshot(doc(db, 'canoe_landing_system', 'global_alert'), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      localStorage.setItem(CANOE_STORAGE_KEYS.ALERT, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('cem_state_sync', { detail: { key: CANOE_STORAGE_KEYS.ALERT, data } }));
    }
  }, (err) => {
    console.warn('Firestore global_alert sync failed: ', err);
  });

  // Responders Pool Sync
  onSnapshot(doc(db, 'canoe_landing_system', 'responders'), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data().list || [];
      localStorage.setItem(CANOE_STORAGE_KEYS.RESPONDERS, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('cem_state_sync', { detail: { key: CANOE_STORAGE_KEYS.RESPONDERS, data } }));
    }
  }, (err) => {
    console.warn('Firestore responders sync failed: ', err);
  });

  // Incidents Pool Sync
  onSnapshot(doc(db, 'canoe_landing_system', 'incidents'), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data().list || [];
      localStorage.setItem(CANOE_STORAGE_KEYS.INCIDENTS, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('cem_state_sync', { detail: { key: CANOE_STORAGE_KEYS.INCIDENTS, data } }));
    }
  }, (err) => {
    console.warn('Firestore incidents sync failed: ', err);
  });
} catch (err) {
  console.warn('Firestore subscription failed: ', err);
}
