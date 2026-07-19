# CascadiaEM Architectural State Blueprint & Grounding Rules

## 🚨 CRITICAL CONTEXT FOR THIS DEV SESSION
Do not look for older directories, propose deprecated port mappings, change historical archive entries, or alter established API routing paradigms. You are acting on a highly structured development ecosystem with strict operational boundaries.

---

## 📂 1. Directory & Workspace Structure

### Active Core Workspace
*   **Root Directory:** `~/developer/CascadiaEM_v8_Active`
*   **Frontend Application Stack:** Located strictly inside `v8_frontend/`
*   **Backend Application Stack:** Located strictly inside `v8_backend/`

### Historical Archive Vault (Read-Only)
*   **Location:** `~/developer/HISTORICAL_BUILDS/`
*   **Rule:** All legacy `.zip` structural nesting errors have been flattened. Treat these folders as immutable reference points:
    *   `2026-06-18_CascadiaEM_v1.0_Base_Clean` (Base environment layout)
    *   `2026-06-18_CascadiaEM_v1.0_Variant_Clean` (Variant interface mechanics)
    *   `2026-06-18_CascadiaEM_v1.0.4_Stable_Folder` (Firebase layout; zero-byte backend engine, serves static UI out of `public/`)

---

## 🔌 2. Networking, Ports, & Communication Rules
*   **Active Frontend Engine:** Locked exclusively to Port `8080` (React/Vite compilation layer).
*   **Active Backend Engine:** Locked exclusively to Port `5001` (Python/API boundary script).
*   **Port 5000 Prohibition:** Never reference, configure, or point code updates to port `5000`. It is deprecated.
*   **Firebase Local Emulator Suite Mandatory Routing:** All application code managing Firestore, Cloud Functions, or Authentication must explicitly point to local host emulators (`localhost`) during this development session. 
*   **Live Cloud API Prohibition:** Absolutely no code may initiate live calls to Google Cloud Vertex AI (`aiplatform`), Generative Language API (`generativelanguage`), or Vision AI (`visionai`). Treat these services as fully decommissioned in the code layer.

---

## 🐙 3. Version Control & Security Mandates
*   **Local Repository:** Anchored at `~/developer/CascadiaEM_v8_Active`.
*   **Cloud Upstream Remote:** Synchronized with `https://github.com/CASCADIAEM/CascadiaEM_v8.git` (Default branch: `main`).
*   **Authentication:** Local configurations utilize a secure access token directly embedded in the git origin path wrapper.
*   **Secret Handling (.gitignore Rules):** 
    *   All `.env` files are globally blocked via `**/.env` across both frontend and backend directories.
    *   **Absolute Rule:** Never append, expose, or write live API strings, Twilio Account SIDs, or private authorization hashes into tracked application files.

---

## 🎛️ 4. Control Automation Layout
*   The system utilizes a custom `dashboard.py` running Streamlit to scan port statuses, run discovery filters on selected code mounts, control live server processes, execute background git snapshots, and package code into historical cold-storage archives.

---

## ⚡ 5. Token Drain Mitigation & File Architecture Rules
To prevent massive context bloat, slow processing, and token exhaustion, all code generation and architectural modifications must strictly obey these efficiency parameters:

### Monolithic File Prohibition
*   **Maximum File Length:** No single frontend file or backend route controller should exceed **250 lines of code**. If a file begins creeping past this threshold, it must be broken down immediately.
*   **Atomic Component Architecture:** UI elements inside `v8_frontend` must be isolated into modular, single-responsibility components (e.g., separating input cards, status bars, and logic hooks into individual files). Never build a single giant dashboard file.

### Context Preservation Strategy
*   **Targeted Snippets Only:** When proposing code fixes or optimizations, never reprint an entire file to change five lines. Only output the exact modified functions, classes, or blocks, detailing where they sit in relation to the file's current layout.
*   **Dependency Sanity:** Do not inject massive external npm or pip libraries to handle basic utility functions. Rely on lightweight, core-native language implementations to keep `package.json` and the server architecture clean.

### Zero-Drift Rule
*   Do not suggest restructuring active database contracts, file paths, or core global routing modules unless explicitly instructed. Code must adapt to the existing lean template rather than inflating it with boilerplate abstractions.

---

## ☁️ 6. Firebase Emulator & Cloud Function Boundaries

### Strict Local Environment Execution
*   **Zero Live Provisioning:** You are strictly forbidden from executing `gcloud` or `firebase deploy` commands. All database schemas and backend logic must be evaluated exclusively inside the Firebase Local Emulator Suite.
*   **No Automated Asset Generation:** Do not write scripts or code blocks that attempt to programmatically spin up live Google Cloud Storage buckets, Cloud SQL instances, or external webhooks.

### Firestore Query & Index Compliance
*   **Composite Index Awareness:** When writing or modifying Firestore queries inside `v8_backend` or Cloud Functions, ensure they do not trigger `FAILED_PRECONDITION` index errors. If a query requires a composite index, you must explicitly document the required fields in a comment block rather than allowing the function to execute in a failing loop.
*   **Cloud Function Execution Safeguards:** Any background cron or data purge scripts (such as `scheduledDataPurge`) must include strict runtime timeouts and execution limits to prevent infinite container scaling and processing waste.

---

## 🎛️ 7. Dashboard & Automation Script Preservation

### Master Control Suite Immunity
*   **File Isolation:** The master control panel file (`dashboard.py`) and the historical cold-storage script (`backup.sh`) are **read-only** for this session. Do not alter, refactor, or optimize these files unless explicitly commanded by the user.
*   **Process Management Rules:** Do not change the programmatic process termination logic (e.g., `lsof -t -i:8080 | xargs kill -9`) utilized by the dashboard to manage environment deadlocks.
*   **Metadata Integrity:** Never delete, modify, or corrupt the `.token_meta` file or alter the 90-day GitHub token tracking metrics rendered on the system status matrix.
*   **Node Modules Exclusion:** Maintain the exclusion rules inside `backup.sh`. When historical archives are compiled, `node_modules` must always be completely purged from both the frontend and backend layers to keep storage contexts light and token-free.

---

## 🎯 Current Engineering Objective
Maintain structural consistency within the active workspace branch. When harvesting layout fragments, design paradigms, or components from historical variations, translate the source code to fit this active structural template, port assignment, and path mapping perfectly without altering the host environment.
