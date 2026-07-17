import { db } from './Firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export interface BusPacket {
  id: string;
  timestamp: string;
  type: 'DISPATCH' | 'SYSTEM' | 'COMMS' | 'LOGISTICS';
  origin: string;
  payload: any;
  severity: 'low' | 'medium' | 'high';
}

type BusSubscriber = (packet: BusPacket) => void;

class DataBus {
  private subscribers: Set<BusSubscriber> = new Set();
  private lastPackets: Map<BusPacket['type'], BusPacket> = new Map();
  private cache: Map<string, any> = new Map();
  private initializedListeners: boolean = false;

  constructor() {
    this.initFirestoreSync();
  }

  private initFirestoreSync(): void {
    if (this.initializedListeners) return;
    this.initializedListeners = true;

    console.log('📥 [FIRESTORE SYNC]: Initializing background listeners for Active Ledger...');

    // Real-time listener for contacts_list (personnel_registry collection)
    onSnapshot(collection(db, 'personnel_registry'), (snapshot) => {
      const contacts: any[] = [];
      snapshot.forEach((d) => {
        contacts.push({ id: d.id, ...d.data() });
      });

      console.log(`📥 [LOG RECEIVED]: personnel_registry sync loaded ${contacts.length} personnel records.`);

      // Update in-memory cache
      this.cache.set('contacts_list', contacts);

      // Broadcast update packet to all active subscribers
      this.broadcast({
        type: 'SYSTEM',
        origin: 'FIRESTORE_SYNC_ENGINE',
        payload: { entity: 'contacts_list', action: 'update' },
        severity: 'low'
      });
    }, (error) => {
      console.error('🚨 [FIRESTORE SYNC]: Error in personnel_registry real-time sync:', error);
    });

    // Real-time listener for tactical_units (tactical_units collection)
    onSnapshot(collection(db, 'tactical_units'), (snapshot) => {
      const units: any[] = [];
      snapshot.forEach((d) => {
        units.push({ id: d.id, ...d.data() });
      });

      console.log(`📥 [LOG RECEIVED]: tactical_units sync loaded ${units.length} units.`);

      // Update in-memory cache
      this.cache.set('tactical_units', units);

      // Broadcast update packet to all active subscribers
      this.broadcast({
        type: 'SYSTEM',
        origin: 'FIRESTORE_SYNC_ENGINE',
        payload: { entity: 'tactical_units', action: 'update' },
        severity: 'low'
      });
    }, (error) => {
      console.error('🚨 [FIRESTORE SYNC]: Error in tactical_units real-time sync:', error);
    });

    // Real-time listener for dashboard_logs (activity_log collection)
    onSnapshot(collection(db, 'activity_log'), (snapshot) => {
      const logs: BusPacket[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        // 🛡️ Retroactive Filter: Exclude internal state-sync system signals from feed ingestion
        const isSystemSignal = data.origin === 'FIRESTORE_SYNC_ENGINE' || 
                               (data.type === 'SYSTEM' && data.payload?.entity);
        if (!isSystemSignal) {
          logs.push({ id: d.id, ...data } as BusPacket);
        }
      });

      // Sort logs by timestamp descending (newest first) for standard ledger feed
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Limit in-memory cache to last 50 items to optimize memory footprint
      const limitedLogs = logs.slice(0, 50);

      console.log(`📥 [LOG RECEIVED]: activity_log sync loaded ${limitedLogs.length} ledger packets.`);

      // Update in-memory cache
      this.cache.set('dashboard_logs', limitedLogs);

      // Broadcast update packet to all active subscribers
      this.broadcast({
        type: 'SYSTEM',
        origin: 'FIRESTORE_SYNC_ENGINE',
        payload: { entity: 'dashboard_logs', action: 'update' },
        severity: 'low'
      });
    }, (error) => {
      console.error('🚨 [FIRESTORE SYNC]: Error in activity_log real-time sync:', error);
    });

    // Real-time listener for ics_resources (ics_resources collection)
    onSnapshot(collection(db, 'ics_resources'), (snapshot) => {
      const resources: any[] = [];
      snapshot.forEach((d) => {
        resources.push({ id: d.id, ...d.data() });
      });

      console.log(`📥 [LOG RECEIVED]: ics_resources sync loaded ${resources.length} resource records.`);

      // Update in-memory cache
      this.cache.set('ics_resources', resources);

      // Broadcast update packet to all active subscribers
      this.broadcast({
        type: 'SYSTEM',
        origin: 'FIRESTORE_SYNC_ENGINE',
        payload: { entity: 'ics_resources', action: 'update' },
        severity: 'low'
      });
    }, (error) => {
      console.error('🚨 [FIRESTORE SYNC]: Error in ics_resources real-time sync:', error);
    });
  }

  public subscribe(callback: BusSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getLastPacket(type: BusPacket['type']): BusPacket | undefined {
    return this.lastPackets.get(type);
  }

  public setCache(key: string, value: any): void {
    const oldValue = this.cache.get(key);

    // Core loop protection: bypass identical state packets to prevent sync drift and infinite loops
    if (JSON.stringify(oldValue) === JSON.stringify(value)) {
      return;
    }

    this.cache.set(key, value);

    if (key === 'contacts_list' || key === 'tactical_units' || key === 'ics_resources') {
      this.syncToFirestore(key, oldValue, value);
    }
  }

  private async syncToFirestore(key: string, oldValue: any, newValue: any): Promise<void> {
    let collectionName = '';
    if (key === 'contacts_list') collectionName = 'personnel_registry';
    else if (key === 'tactical_units') collectionName = 'tactical_units';
    else if (key === 'ics_resources') collectionName = 'ics_resources';
    try {
      const oldArray = Array.isArray(oldValue) ? oldValue : [];
      const newArray = Array.isArray(newValue) ? newValue : [];

      const newIds = new Set(newArray.map((item: any) => String(item.id)));

      // 1. Identify and purge deleted items
      const deletedItems = oldArray.filter((item: any) => !newIds.has(String(item.id)));
      for (const item of deletedItems) {
        await deleteDoc(doc(db, collectionName, String(item.id)));
        console.log(`✅ [SUCCESS]: Purged deleted doc ${item.id} from ${collectionName}`);
      }

      // 2. Identify new or modified items and upload
      const itemsToSet = newArray.filter((item: any) => {
        const oldItem = oldArray.find((o: any) => String(o.id) === String(item.id));
        return !oldItem || JSON.stringify(oldItem) !== JSON.stringify(item);
      });

      for (const item of itemsToSet) {
        await setDoc(doc(db, collectionName, String(item.id)), item);
        console.log(`✅ [SUCCESS]: Synchronized doc ${item.id} to ${collectionName}`);
      }
    } catch (err) {
      console.error(`🚨 [CRITICAL]: Failed to sync entity ${key} to Firestore collection ${collectionName}`, err);
    }
  }

  public getCache<T>(key: string): T | undefined {
    return this.cache.get(key) as T;
  }

  public broadcast(packet: Omit<BusPacket, 'id' | 'timestamp'>): void {
    const fullPacket: BusPacket = {
      ...packet,
      id: `PKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.lastPackets.set(fullPacket.type, fullPacket);

    // 🔒 NIMS IMMUTABLE ACTIVE LEDGER INTERCEPT:
    // Persist only real operational logs, excluding background sync triggers and internal state-refresh signals
    const isSystemSignal = fullPacket.origin === 'FIRESTORE_SYNC_ENGINE' || 
                           (fullPacket.type === 'SYSTEM' && fullPacket.payload?.entity);

    if (!isSystemSignal) {
      setDoc(doc(db, 'activity_log', fullPacket.id), fullPacket)
        .then(() => {
          console.log(`✅ [SUCCESS]: Telemetry log ${fullPacket.id} persisted to Firestore Immutable Ledger.`);
        })
        .catch((err) => {
          console.error(`🚨 [CRITICAL]: Failed to persist telemetry log ${fullPacket.id} to Firestore:`, err);
        });
    }

    this.subscribers.forEach((subscriber) => {
      try {
        subscriber(fullPacket);
      } catch (err) {
        console.error('Error in subscriber callback:', err);
      }
    });
  }
}

export const dataBus = new DataBus();


