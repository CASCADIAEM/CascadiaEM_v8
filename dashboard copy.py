import streamlit as st
import subprocess
import os
import socket
import datetime

# Directories & Branding Configuration
base_dir = os.path.expanduser("~/developer")
active_dir = os.path.join(base_dir, "CascadiaEM_v8_Active")
history_dir = os.path.join(base_dir, "HISTORICAL_BUILDS")
token_meta_file = os.path.join(active_dir, ".token_meta")
logo_path = os.path.join(active_dir, "v8_frontend", "public", "assets", "logo", "cem_logo.png")

has_logo = os.path.exists(logo_path)

# Page Setup with Brand Assets
st.set_page_config(
    page_title="CascadiaEM Master Dev Suite",
    layout="wide",
    page_icon=logo_path if has_logo else "🛡️"
)

# Initialize Session State
if "target_dir" not in st.session_state:
    st.session_state.target_dir = active_dir
if "target_name" not in st.session_state:
    st.session_state.target_name = "Active Workspace (Main Build)"

# Initialize Token Creation Date File
if not os.path.exists(token_meta_file):
    try:
        with open(token_meta_file, "w") as f:
            f.write("2026-07-17")
    except:
        pass

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def get_git_metrics(target_path):
    try:
        count = subprocess.run(["git", "rev-list", "--count", "HEAD"], cwd=target_path, capture_output=True, text=True).stdout.strip()
        last_log = subprocess.run(["git", "log", "-1", "--format=%cd", "--date=relative"], cwd=target_path, capture_output=True, text=True).stdout.strip()
        return count if count else "0", last_log if last_log else "Never"
    except:
        return "0", "Disconnected"

def get_token_days_left():
    try:
        with open(token_meta_file, "r") as f:
            created_date_str = f.read().strip()
        created_date = datetime.datetime.strptime(created_date_str, "%Y-%m-%d").date()
        today = datetime.date(2026, 7, 17)
        elapsed = (today - created_date).days
        remaining = 90 - elapsed
        return max(0, remaining)
    except:
        return 90

# ==========================================
# 📖 SIDEBAR OPERATIONAL PLAYBOOK
# ==========================================
with st.sidebar:
    if has_logo:
        st.image(logo_path, use_container_width=True)
    st.header("Suite Playbook & Help")
    st.markdown("Use this reference manual to guide development sessions and clear environment deadlocks.")
    
    with st.expander("🚨 CRITICAL: AI Session Troubleshooting Log", expanded=True):
        st.markdown("""
        **Issue:** React frontend rendered as completely unstyled raw HTML text with structural layout and CSS processing totally broken.
        
        **Root Cause:** An automated AI script mutated the `vite.config.ts` network configurations—changing the server preview port from `8080` to `8081`. The system was serving fallback cache assets while completely bypassing the live Tailwind CSS compiler stream.
        
        **Solution:** Reverted the configuration key back to port `8080` and systematically deleted local untracked framework build artifacts (`.vite`, `node_modules`).
        
        **Avoidance Mandate for Incoming AIs:** Do NOT alter designated application port configurations, paths, or baseline dependencies unless explicitly directed by the user. Keep architectures modular.
        """)

    with st.expander("🚀 Standard Active Dev Workflow"):
        st.markdown("""
        **Goal:** Build and modify the active v8 system.
        1. Ensure variant loader is set to **Active Workspace**.
        2. Click **Start Backend Server** (Runs on Port `5001`).
        3. Click **Launch React Server** (Runs on Port `8080`).
        4. Open your code editor and make changes.
        5. Use the **Git Engine** at the bottom to secure snapshots frequently.
        """)

    with st.expander("🕒 Historical Preview Workflow"):
        st.markdown("""
        **Goal:** Safely view older application versions.
        1. **Crucial:** Click **Stop** on any active servers before switching!
        2. Select an archive from the dropdown.
        3. Click **Mount & Preview Selected Version**.
        4. Look at the status blocks:
           * If **React** is discovered: Turn on Python backend, then launch React.
           * If **Static** is discovered: Only launch the Static server (no backend required).
        5. Click **Reset to Main Workspace** when done.
        """)

    with st.expander("🔑 How to Renew Token"):
        st.markdown("""
        When the dashboard metrics show your GitHub token is approaching 0 days, refresh it instantly:
        1. Go to **GitHub Settings** ➔ **Developer settings** ➔ **Personal access tokens (classic)**.
        2. Generate a token checking the `repo` scope.
        3. Open your Mac Terminal and run:
        ```bash
        cd ~/developer/CascadiaEM_v8_Active
        git remote set-url origin [https://YOUR_NEW_TOKEN@github.com/CASCADIAEM/CascadiaEM_v8.git](https://YOUR_NEW_TOKEN@github.com/CASCADIAEM/CascadiaEM_v8.git)
        ```
        4. To reset this dashboard's countdown timer, delete the `.token_meta` file inside your active folder or update the date text inside it.
        """)

    with st.expander("🛠️ Emergency Terminal Escape Hatch"):
        st.markdown("""
        If a server gets stuck running silently in the background, run this command in your Mac Terminal to forcefully clear the port:
        ```bash
        lsof -t -i:8080 | xargs kill -9
        ```
        """)

# ==========================================
# 🔍 RECURSIVE AUTO-DISCOVERY ENGINE
# ==========================================
def find_backend_script(target_dir):
    standard_path = os.path.join(target_dir, "v8_backend")
    for script in ["server.py", "app.py", "main.py"]:
        p = os.path.join(standard_path, script)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return p
    return None

def find_frontend_dir(target_dir):
    if os.path.exists(os.path.join(target_dir, "firebase.json")):
        public_path = os.path.join(target_dir, "public")
        if os.path.exists(public_path): return public_path, "static"

    for root, dirs, files in os.walk(target_dir):
        if "node_modules" in root or "v8_backend" in root or "functions" in root: continue
        if "package.json" in files: return root, "react"
    return None, None

backend_script = find_backend_script(st.session_state.target_dir)
frontend_dir, frontend_type = find_frontend_dir(st.session_state.target_dir)

backend_live = is_port_open(5001)
frontend_live = is_port_open(8080)

# ==========================================
# 🏛️ HEADER & STRATEGIC BANNER
# ==========================================
if has_logo:
    title_col, logo_col = st.columns([4, 1])
    with title_col:
        st.title("CascadiaEM Master Control Suite")
        st.caption("Central Operations Control & Cloud Backup Pipeline — Use frequency: Daily during active development sprints to sync codebase snapshots.")
    with logo_col:
        st.image(logo_path, width=90)
else:
    st.title("🛡️ CascadiaEM Master Control Suite")
    st.caption("Central Operations Control & Cloud Backup Pipeline — Use frequency: Daily during active development sprints to sync codebase snapshots.")

if st.session_state.target_dir == active_dir:
    st.success(f"📍 **Currently Controlling Primary Environment:** {st.session_state.target_name}")
else:
    st.warning(f"⚠️ **Currently Controlling Archived Reference Layer:** {st.session_state.target_name}")

# ==========================================
# 📊 DYNAMIC NETWORK STATUS CONTAINER & METRIC BAR
# ==========================================
if backend_live and frontend_live:
    status_border_color = "#10b981"  # Connected (Green)
    status_bg_color = "rgba(16, 185, 129, 0.04)"
    status_label_text = "CONNECTED"
elif backend_live or frontend_live:
    status_border_color = "#f59e0b"  # Trying / Partial (Yellow)
    status_bg_color = "rgba(245, 158, 11, 0.04)"
    status_label_text = "TRYING"
else:
    status_border_color = "#ef4444"  # Disconnected (Red)
    status_bg_color = "rgba(239, 68, 68, 0.04)"
    status_label_text = "DISCONNECTED"

total_commits, last_sync = get_git_metrics(st.session_state.target_dir)
days_left = get_token_days_left()
token_delta = "-1 Day" if days_left < 90 else "Fresh"
token_delta_color = "#ef4444" if days_left < 15 else "#94a3b8"

st.markdown(f"""
<div style="border: 2px solid {status_border_color}; background-color: {status_bg_color}; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="font-size: 11px; font-weight: 800; color: {status_border_color}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 8px; height: 8px; background-color: {status_border_color}; border-radius: 50%;"></span>
        System Status Matrix: {status_label_text}
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 16px;">
        <div style="flex: 1; min-width: 220px; background: #131B2F; padding: 14px; border-radius: 6px; border: 1px solid #1E293B;">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Backend Engine (Port 5001)</div>
            <div style="font-size: 24px; font-weight: bold; color: {'#10b981' if backend_live else '#ef4444'};">{'ONLINE' if backend_live else 'OFFLINE'}</div>
        </div>
        <div style="flex: 1; min-width: 220px; background: #131B2F; padding: 14px; border-radius: 6px; border: 1px solid #1E293B;">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Frontend Server (Port 8080)</div>
            <div style="font-size: 24px; font-weight: bold; color: {'#10b981' if frontend_live else '#ef4444'};">{'ONLINE' if frontend_live else 'OFFLINE'}</div>
        </div>
        <div style="flex: 1; min-width: 220px; background: #131B2F; padding: 14px; border-radius: 6px; border: 1px solid #1E293B;">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total Secured Commits</div>
            <div style="font-size: 24px; font-weight: bold; color: #f8fafc;">{total_commits}</div>
            <div style="font-size: 11px; color: #64748b; font-family: monospace; margin-top: 4px;">Mod: {last_sync}</div>
        </div>
        <div style="flex: 1; min-width: 220px; background: #131B2F; padding: 14px; border-radius: 6px; border: 1px solid #1E293B;">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">GitHub Token Lifespan</div>
            <div style="font-size: 24px; font-weight: bold; color: #f8fafc;">{days_left} Days Left</div>
            <div style="font-size: 11px; color: {token_delta_color}; margin-top: 4px; font-weight: 600;">{token_delta}</div>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

st.markdown("---")

# ==========================================
# ⚡ SERVICE CONTROL CENTER
# ==========================================
st.header("⚡ Service Control Center")
st.write(f"Target Directory Execution Path: `{st.session_state.target_dir}`")

col_back, col_front = st.columns(2)

with col_back:
    st.subheader("🐍 Python Backend Server")
    if backend_live:
        st.success("🟢 BACKEND CONNECTION LIVE")
        if st.button("🔴 Stop Backend Server", key="stop_back", use_container_width=True, help="Terminates the process hanging on Port 5001."):
            subprocess.run("lsof -t -i:5001 | xargs kill -9", shell=True)
            st.rerun()
    else:
        st.error("🔴 BACKEND STATUS DOWN")
        if backend_script:
            if st.button("🟢 Start Backend Server", key="start_back", use_container_width=True, help="Executes the python3 entry script in the background."):
                subprocess.Popen(["python3", backend_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                st.toast("Starting Python Engine...", icon="🚀")
                st.rerun()
        else:
            st.warning("No operational backend engine script discovered in this specific build snapshot.")

with col_front:
    st.subheader("⚛️ React / HTML Frontend Interface")
    if frontend_live:
        st.success("🟢 FRONTEND COMPILER RUNNING")
        st.info("🔗 View interface variant link at: http://localhost:8080")
        if st.button("🔴 Stop Frontend Server", key="stop_front", use_container_width=True, help="Terminates the server process holding Port 8080."):
            subprocess.run("lsof -t -i:8080 | xargs kill -9", shell=True)
            st.rerun()
    else:
        st.error("🔴 FRONTEND COMPILER OFFLINE")
        if frontend_dir:
            if frontend_type == "react":
                st.info("⚡ Modern React architecture discovered.")
                if st.button("🟢 Launch React Server", key="start_front", use_container_width=True, help="Runs 'npm run dev' to boot the Vite compiler."):
                    subprocess.Popen(["npm", "run", "dev"], cwd=frontend_dir, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    st.toast("Launching Vite Compiler...", icon="⚡")
                    st.rerun()
        else:
            st.warning("No frontend web tracking structures discovered in this segment.")

st.markdown("---")

# ==========================================
# 🕒 ARCHIVAL PREVIEWER & LAUNCHPAD
# ==========================================
st.header("🕒 Historical Launchpad & Variant Loader")
if os.path.exists(history_dir):
    backups = [d for d in os.listdir(history_dir) if os.path.isdir(os.path.join(history_dir, d))]
    backups.sort(reverse=True)
    
    col_select, col_actions = st.columns([2, 1])
    with col_select:
        selected_backup = st.selectbox(
            "Choose a Historical Variant to Load:",
            ["Active Workspace (Main Build)"] + backups,
            help="Selecting a variant targets file pointers to view and run old versions of the app."
        )
    with col_actions:
        st.write("<div style='padding-top:28px;'></div>", unsafe_allow_html=True)
        if selected_backup == "Active Workspace (Main Build)":
            if st.button("🔄 Reset to Main Active Workspace", use_container_width=True, help="Shuts down running contexts and returns to the primary workspace branch."):
                if is_port_open(5001): subprocess.run("lsof -t -i:5001 | xargs kill -9", shell=True)
                if is_port_open(8080): subprocess.run("lsof -t -i:8080 | xargs kill -9", shell=True)
                st.session_state.target_dir = active_dir
                st.session_state.target_name = "Active Workspace (Main Build)"
                st.rerun()
        else:
            if st.button("🚀 Mount & Preview Selected Version", use_container_width=True, help="Swaps current runtime parameters to examine inside this archive folder."):
                if is_port_open(5001): subprocess.run("lsof -t -i:5001 | xargs kill -9", shell=True)
                if is_port_open(8080): subprocess.run("lsof -t -i:8080 | xargs kill -9", shell=True)
                st.session_state.target_dir = os.path.join(history_dir, selected_backup)
                st.session_state.target_name = f"Archive Preview: {selected_backup}"
                st.rerun()

st.markdown("---")

# ==========================================
# 🐙 GIT SNAPSHOT ENGINE
# ==========================================
st.header("🐙 Git Version Control Engine")
git_target = active_dir if st.session_state.target_dir == active_dir else base_dir
try:
    status_check = subprocess.run(["git", "status"], cwd=git_target, capture_output=True, text=True)
    
    st.text_area("Workspace Source Ledger Status:", status_check.stdout, height=150, help="The output of 'git status'. Shows modified local files.")
    
    col_input, col_commit_btn, col_push_btn = st.columns([2, 1, 1])
    with col_input:
        commit_msg = st.text_input("Describe modifications for this version snapshot:", placeholder="e.g., Harvesting structural components from v6 layouts", help="Short note tracking what changed.")
    with col_commit_btn:
        st.write("<div style='padding-top:28px;'></div>", unsafe_allow_html=True)
        if st.button("🔒 Commit Snapshot", use_container_width=True, help="Secures these file variations into your encrypted local version database."):
            if not commit_msg:
                st.warning("Please supply a descriptive version entry note.")
            else:
                subprocess.run(["git", "add", "."], cwd=git_target)
                res = subprocess.run(["git", "commit", "-m", commit_msg], cwd=git_target, capture_output=True, text=True)
                st.success("Snapshot secured locally.")
                st.rerun()
    with col_push_btn:
        st.write("<div style='padding-top:28px;'></div>", unsafe_allow_html=True)
        if st.button("📤 Push to Cloud Repository", use_container_width=True, help="Synchronizes all committed variations safely with your secure GitHub repository backup."):
            with st.spinner("Syncing data links..."):
                push_res = subprocess.run(["git", "push"], cwd=git_target, capture_output=True, text=True)
                if push_res.returncode == 0:
                    st.success("Synchronized with cloud repo.")
                else:
                    st.error("Sync failed. Check remote network path configurations.")
except Exception as e:
    st.error(f"Failed to communicate with local git module framework: {e}")

st.markdown("---")

# ==========================================
# 💾 RECOVERY COLD STORAGE EXPORTER
# ==========================================
st.header("💾 Create Cold-Storage Backup Archive")
col_arch_input, col_arch_btn = st.columns([2, 2])
with col_arch_input:
    desc = st.text_input("Enter a descriptive label for file storage tracking:", placeholder="e.g., post-cleanup-v8-baseline", help="Unique tag to export a timestamped tracking archive.")
with col_arch_btn:
    st.write("<div style='padding-top:28px;'></div>", unsafe_allow_html=True)
    if st.button("Trigger Cold Archive Export", use_container_width=True, help="Executes backup.sh to bundle environment architecture into cold storage files."):
        if not desc:
            st.warning("Please provide a name for this clean tracking snapshot build.")
        else:
            with st.spinner("Processing isolation build parameters..."):
                try:
                    sh_path = os.path.join(base_dir, "backup.sh")
                    result = subprocess.run(['bash', sh_path, desc], capture_output=True, text=True)
                    if result.returncode == 0:
                        st.success("Snapshot completely exported into historical directory layers.")
                        st.rerun()
                    else:
                        st.error("Backup tracking execution module stalled.")
                except Exception as e:
                    st.error(f"Failed to execute background automation module: {e}")

st.markdown("---")

# ==========================================
# 📓 ARCHITECTURE POST-MORTEM & AI GUARDRAILS
# ==========================================
st.header("📓 System Architecture Ledger")
with st.expander("📝 Engineering Incident Report & Strategic Port Map Prevention", expanded=False):
    st.markdown("""
    ### 1. The Incident: Frontend Style Delivery Drop
    * **Symptom:** The user interface loaded successfully on local ports but compiled without layout sheets. Structural styling elements were fully stripped, rendering raw, un-sequenced text with unconstrained images blowing past the viewport limits.
    * **Root Cause:** An over-engineering AI agent modified layout behaviors and mutated core definitions inside `v8_frontend/vite.config.ts`, altering the active dev tracking port from `8080` to `8081`. The active web application layer was displaying stale runtime artifacts rather than processing through the active compiler framework.

    ### 2. Immediate Remedies Implemented
    * **Port Correction:** Forced the compiler profile target mapping back to port `8080`.
    * **Cache Clearing:** Purged untracked environment components (`.vite` processing directories, broken dependency lock links, and redundant `node_modules` folders) to ensure clean re-compilation.

    ### 3. Rules for Future AI Handoffs (How to Avoid This)
    1. **Do Not Touch Infrastructure:** Under no conditions should an incoming AI modify network parameters, active base folders, script execution keys, or port ranges (`8080` for interface compilation, `5001` for backend engines) unless a change is directly requested.
    2. **Do Not Fragment Styling Layouts:** Never break baseline CSS dependencies or split functional production assets to create monolithic layouts. 
    3. **Trust the Port Validation:** If style processing drops out, verify that the browser URL exactly references the compiling development port configuration.
    """)
