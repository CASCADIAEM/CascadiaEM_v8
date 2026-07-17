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

## 🎯 Current Engineering Objective
Maintain structural consistency within the active workspace branch. When harvesting layout fragments, design paradigms, or components from historical variations, translate the source code to fit this active structural template, port assignment, and path mapping perfectly without altering the host environment.
