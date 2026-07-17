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

# Automatic path mapping to your repository logo asset
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
    
    with st.expander("🚀 Standard Active Dev Workflow", expanded=True):
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
    title_col, logo_col = st.columns([5, 1])
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
# 📊 INDUSTRY METRIC / KPI STATUS BAR
# ==========================================
m_back, m_front, m_git, m_token = st.columns(4)
with m_back:
    st.metric("Backend Engine (Port 5001)", "ONLINE" if backend_live else "OFFLINE")
with m_front:
    st.metric("Frontend Server (Port 8080)", "ONLINE" if frontend_live else "OFFLINE")
with m_git:
    total_commits, last_sync = get_git_metrics(active_dir)
    st.metric("Total Secured Commits", total_commits, help=f"Last saved modification: {last_sync}")
with m_token:
    days_left = get_token_days_left()
    st.metric("GitHub Token Lifespan", f"{days_left} Days Left", delta="-1 Day" if days_left < 90 else "Fresh", delta_color="inverse" if days_left < 15 else "normal")

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
        if st.button("🔴 Stop Backend Server", key="stop_back", use_container_width=True):
            subprocess.run("lsof -t -i:5001 | xargs kill -9", shell=True)
            st.rerun()
    else:
        st.error("🔴 BACKEND STATUS DOWN")
        if backend_script:
            if st.button("🟢 Start Backend Server", key="start_back", use_container_width=True):
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
        if st.button("🔴 Stop Frontend Server", key="stop_front", use_container_width=True):
            subprocess.run("lsof -t -i:8080 | xargs kill -9", shell=True)
            st.rerun()
    else:
        st.error("🔴 FRONTEND COMPILER OFFLINE")
        if frontend_dir:
            if frontend_type == "react":
                st.info("⚡ Modern React architecture discovered.")
                if st.button("🟢 Launch React Server", key="start_front", use_container_width=True):
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
            ["Active Workspace (Main Build)"] + backups
        )
    with col_actions:
        st.write("<div style='padding-top:28px;'></div>", unsafe_allow_html=True)
        if selected_backup == "Active Workspace (Main Build)":
            if st.button("🔄 Reset to Main Active Workspace", use_container_width=True):
                if is_port_open(5001): subprocess.run("lsof -t -i:5001 | xargs kill -9", shell=True)
                if is_port_open(8080): subprocess.run("lsof -t -i:8080 | xargs kill -9", shell=True)
                st.session_state.target_dir = active_dir
                st.session_state.target_name = "Active Workspace (Main Build)"
                st.rerun()
        else:
            if st.button("🚀 Mount & Preview Selected Version", use_container_width=True):
                if is_port_open(5001): subprocess.run("lsof -t -i:5001 | xargs kill -9", shell=True)
                if is_port_open(8080): subprocess.run("lsof -t -i:8080 | xargs kill -9", shell=True)
                st.session_state.target_dir = os.path.join(history_dir, selected_backup)
                st.session_state.target_name = f"Archive Preview: {selected_backup}"
                st.rerun()

st.markdown("---")

# ==========================================
# 🐙 GIT SNAPSHOT ENGINE (WITH ERROR CAPTURE)
# ==========================================
st.header("🐙 Git Version Control Engine")
try:
    status_check = subprocess.run(["git", "status"], cwd=active_dir, capture_output=True, text=True)
    st.text_area("Workspace Source Ledger Status:", status_check.stdout, height=150)
    
    col_input, col_commit_btn, col_push_btn = st.columns([2, 1, 1])
    with col_input:
        commit_msg = st.text_input("Describe modifications for this version snapshot:", placeholder="e.g., Uploaded high-resolution official logo asset", key="git_commit_input")
    with col_commit_btn:
        st.write("<div style='padding-top:28px;'></div>", unsafe_allow_html=True)
        if st.button("🔒 Commit Snapshot", use_container_width=True):
            if not commit_msg:
                st.warning("Please supply a descriptive version entry note.")
            else:
                subprocess.run(["git", "add", "."], cwd=active_dir)
                res = subprocess.run(["git", "commit", "-m", commit_msg], cwd=active_dir, capture_output=True, text=True)
                if res.returncode == 0:
                    st.success("Snapshot secured locally.")
                    st.rerun()
                else:
                    st.error(f"Commit Failed: {res.stderr if res.stderr else res.stdout}")
    with col_push_btn:
        st.write("<div style='padding-top:28px;'></div>", unsafe_allow_html=True)
        if st.button("📤 Push to Cloud Repository", use_container_width=True):
            with st.spinner("Syncing data links..."):
                push_res = subprocess.run(["git", "push"], cwd=active_dir, capture_output=True, text=True)
                if push_res.returncode == 0:
                    st.success("Synchronized with cloud repo.")
                else:
                    st.error(f"Sync failed: {push_res.stderr}")
except Exception as e:
    st.error(f"Failed to communicate with local git module framework: {e}")

st.markdown("---")

# ==========================================
# 💾 RECOVERY COLD STORAGE EXPORTER
# ==========================================
st.header("💾 Create Cold-Storage Backup Archive")
col_arch_input, col_arch_btn = st.columns([2, 2])
with col_arch_input:
    desc = st.text_input("Enter a descriptive label for file storage tracking:", placeholder="e.g., post-cleanup-v8-baseline")
with col_arch_btn:
    st.write("<div style='padding-top:28px;'></div>", unsafe_allow_html=True)
    if st.button("Trigger Cold Archive Export", use_container_width=True):
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
