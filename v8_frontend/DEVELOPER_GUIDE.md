# CascadiaEM Development & Low-Code Admin Editor Standard

This document defines the strict engineering law and design principles for building dropdown (pulldown) menus within CascadiaEM.

---

## 🏛️ Strict Architectural Law: Admin Editor Access

> [!IMPORTANT]
> **Every single new pulldown/dropdown menu added to any CascadiaEM module MUST have low-code Admin Editor access.**
> 
> Hardcoded selector lists are strictly prohibited for operational schemas. Any list of options (e.g., categories, counties, cities, status options, recipient groups, agencies, or kinds) must be managed dynamically from the cloud database via the **Admin Editor Overlay**.

---

## 🛠️ Step-by-Step Implementation Guide

To add a new pulldown menu, you must implement the following three-part integration:

### 1. Extend the Cloud Schema in `DropdownService.ts`

Open [DropdownService.ts](file:///Users/michaelfeatnehough/developer/CascadiaEM_v8_Active/v8_frontend/src/services/DropdownService.ts) and add your new configuration key to the schema:

1. **Add to `Dropdowns` Interface**:
   ```typescript
   export interface Dropdowns {
     // ... existing fields ...
     my_new_dropdown_key: string[]; // <-- Your new key
   }
   ```

2. **Define in `DEFAULT_DROPDOWNS`**:
   ```typescript
   export const DEFAULT_DROPDOWNS: Dropdowns = {
     // ... existing fields ...
     my_new_dropdown_key: [
       'Default Option 1',
       'Default Option 2',
       'Default Option 3'
     ]
   };
   ```

3. **Integrate into Firestore Snapshot Merging**:
   Inside the `onSnapshot` hook inside `DropdownServiceManager`, ensure your new key is safely merged to prevent missing field errors when loading from cloud databases:
   ```typescript
   onSnapshot(dropdownDocRef, (snapshot) => {
     if (snapshot.exists()) {
       const data = snapshot.data();
       this.currentDropdowns = {
         // ... existing fields ...
         my_new_dropdown_key: data.my_new_dropdown_key || DEFAULT_DROPDOWNS.my_new_dropdown_key,
       };
     }
     // ...
   });
   ```

---

### 2. Render the Selector with the Admin Customizer Gear

Inside your React module component:

1. **Import the customizer and dropdown hooks**:
   ```typescript
   import { useDropdowns } from '../services/DropdownService';
   import { CanvaDropdownCustomizer, CanvaSelect } from '../components/DesignSandbox';
   ```

2. **Retrieve the real-time config values**:
   ```typescript
   const { dropdowns } = useDropdowns();
   ```

3. **Render the Selector component alongside its `CanvaDropdownCustomizer`**:
   Place the `<CanvaDropdownCustomizer />` immediately next to or above your label using flexbox layouts:
   ```tsx
   <div className="space-y-1.5">
     <div className="flex items-center justify-between">
       <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
         Select Priority
       </label>
       {/* The Admin Editor Customizer Button */}
       <CanvaDropdownCustomizer dropdownKey="my_new_dropdown_key" label="Priority Options" />
     </div>
     
     <CanvaSelect 
       value={selectedPriority}
       onChange={(e) => setSelectedPriority(e.target.value)}
       className="p-2 py-2 text-xs"
     >
       {(dropdowns.my_new_dropdown_key || []).map(opt => (
         <option key={opt} value={opt}>{opt.toUpperCase()}</option>
       ))}
     </CanvaSelect>
   </div>
   ```

---

### 3. Dynamic Roster/Dataset Option Merging (Recommended)

When rendering **Filter Selectors** that operate over active datasets, always merge the configured list from the Admin Engine with any custom values currently residing inside the dataset. This ensures that custom legacy data is never lost or filtered out:

```typescript
const priorityOptionsList = Array.from(new Set([
  ...(dropdowns.my_new_dropdown_key || []),
  ...activeIncidents.map(inc => inc.priority)
])).filter(Boolean);
```

---

## ⚡ Benefits of This Standard
- **Zero-Downtime Reconfiguration**: Emergency operations chiefs can alter critical NIMS taxonomy and designations on-the-fly during active incidents without requiring code redeployments.
- **Flawless Client Sync**: Changes publish across Snohomish County and tribal response screens in real-time.
- **Highly Aesthetic**: Seamlessly renders an animated glassmorphic configuration overlay when `Low-Code Admin Mode` is enabled in the sidebar.
