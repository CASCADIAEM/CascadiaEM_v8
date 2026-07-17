import streamlit as st
import subprocess
import os
import socket

st.set_page_config(page_title="CascadiaEM Master Dev Suite", layout="wide", page_icon="🌲")

# Directories Configuration
base_dir = os.path.expanduser("~/developer")
active_dir = os.path.join(base_dir, "CascadiaEM_v8_Active")
history_dir = os.path.join(base_dir, "HISTORICAL_BUILDS")

# Initialize Session State
if "target_dir" not in st.session_state:
    st.session_state.target_dir = active_dir
if "target_name" not in st.session_state:
    st.session_state.target_name = "Active Workspace (Main Build)"

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

# ==========================================
# 📖 SIDEBAR OPERATIONAL PLAYBOOK
# ==========================================
with st.sidebar:
    st.header("🌲 Suite Playbook & Help")
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

    with st.expander("⚠️ Port 8080 Exclusivity Rule"):
        st.markdown("""
        Network ports can only host **one build at a time**. 
        
        If you switch versions without stopping a running server, Port `8080` will remain blocked, causing the new version to fail or render a blank white screen.
        """)

    with st.expander("🛠️ Emergency Terminal Escape Hatch"):
        st.markdown("""
        If the dashboard buttons become unresponsive or a server gets stuck running silently in the background, run this command in your Mac Terminal to forcefully clear the port:
        
        ```bash
        lsof -t -i:8080 | xargs kill -9
        ```
        *Replace `8080` with `5000` or `5001` if a backend server hangs.*
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
    
    for root, dirs, files in os.walk(target_dir):
        if "node_modules" in root or "functions" in root:
            continue
        for file in ["server.py", "app.py", "main.py"]:
            if file in files:
                p = os.path.join(root, file)
                if os.path.getsize(p) > 0:
                    return p
    return None

def find_frontend_dir(target_dir):
    if os.path.exists(os.path.join(target_dir, "firebase.json")):
        public_path = os.path.join(target_dir, "public")
        if os.path.exists(public_path):
            return public_path, "static"

    for root, dirs, files in os.walk(target_dir):
        if "node_modules" in root or "v8_backend" in root or "functions" in root:
            continue
        if "package.json" in files:
            return root, "react"
            
    for root, dirs, files in os.walk(target_dir):
        if "node_modules" in root or "v8_backend" in root:
            continue
        if "index.html" in files:
            return root, "static"
            
    return None, None

# Dynamically locate entry targets
backend_script = find_backend_script(st.session_state.target_dir)
frontend_dir, frontend_type = find_frontend_dir(st.session_state.target_dir)

# Port scanning
backend_ports = [5000, 5001]
active_backend_port = next((p for p in backend_ports if is_port_open(p)), None)
backend_live = active_backend_port is not None

frontend_ports = [8080, 8081, 8082, 8083, 8084, 8085]
active_frontend_port = next((p for p in frontend_ports if is_port_open(p)), None)
frontend_live = active_frontend_port is not None

# TITLE & STATUS BANNER
st.title("🌲 CascadiaEM Master Control Suite")
if st.session_state.target_dir == active_dir:
    st.success(f"📍 **Currently Controlling:** {st.session_state.target_name}")
else:
    st.warning(f"⚠️ **Currently Controlling Archived Preview:** {st.session_state.target_name}")

st.markdown("---")

# ==========================================
# ⚡ SERVICE CONTROL CENTER
# ==========================================
st.header("⚡ Service Control Center")
st.write(f"Target Directory: `{st.session_state.target_dir}`")

col_back, col_front = st.columns(2)

with col_back:
    st.subheader("🐍 Python Backend Server")
    if backend_live:
        st.success(f"🟢 BACKEND ONLINE (Port {active_backend_port})")
        if st.button("🔴 Stop Backend Server", key="stop_back", help="Forcefully terminates the Python process listening on this port."):
            subprocess.run(f"lsof -t -i:{active_backend_port} | xargs kill -9", shell=True)
            st.rerun()
    else:
        st.error("🔴 BACKEND OFFLINE")
        if backend_script:
            if st.button("🟢 Start Backend Server", key="start_back", help=f"Executes python3 on the discovered entry script at {os.path.basename(backend_script)}"):
                subprocess.Popen(["python3", backend_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                st.toast("Starting Python Engine...", icon="🚀")
                st.rerun()
        else:
            st.warning("No operational backend engine script discovered in this specific build snapshot.")

with col_front:
    st.subheader("⚛️ React / HTML Frontend Interface")
    if frontend_live:
        st.success(f"🟢 FRONTEND ONLINE (Port {active_frontend_port})")
        st.info(f"🔗 View interface layout variant at: http://localhost:{active_frontend_port}")
        if st.button("🔴 Stop Frontend Server", key="stop_front", help="Forcefully terminates the web host server process holding onto this port."):
            subprocess.run(f"lsof -t -i:{active_frontend_port} | xargs kill -9", shell=True)
            st.rerun()
    else:
        st.error("🔴 FRONTEND OFFLINE")
        if frontend_dir:
            if frontend_type == "react":
                st.info("⚡ Modern React architecture discovered.")
                if st.button("🟢 Launch React Server", key="start_front", help="Links shared node_modules assets and executes 'npm run dev' to boot the Vite compiler."):
                    archive_modules = os.path.join(frontend_dir, "node_modules")
                    active_modules = os.path.join(active_dir, "v8_frontend", "node_modules")
                    if not os.path.exists(archive_modules) and os.path.exists(active_modules):
                        subprocess.run(f"ln -s '{active_modules}' '{archive_modules}'", shell=True)
                    subprocess.Popen(["npm", "run", "dev"], cwd=frontend_dir, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    st.toast("Launching Vite Compiler...", icon="⚡")
                    st.rerun()
            elif frontend_type == "static":
                st.info("📄 Static layout/hosting assets directory discovered.")
                if st.button("🟢 Launch Static Web Server", key="start_front", help="Fires up an ultra-lightweight, native Python HTTP server inside the static folder root."):
                    subprocess.Popen(["python3", "-m", "http.server", "8080"], cwd=frontend_dir, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    st.toast("Spinning up Web Host Engine...", icon="📄")
                    st.rerun()
        else:
            st.warning("No frontend index.html or package.json files discovered in this variant.")

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
            help="Select an archival snapshot. Loading a variant shifts the file pointers so you can run and audit older visual states."
        )
    with col_actions:
        st.write("")
        if selected_backup == "Active Workspace (Main Build)":
            if st.button("🔄 Reset to Main Active Workspace", use_container_width=True, help="Safely shuts down running servers and returns context to the primary v8 branch."):
                if backend_live: subprocess.run(f"lsof -t -i:{active_backend_port} | xargs kill -9", shell=True)
                if frontend_live: subprocess.run(f"lsof -t -i:{active_frontend_port} | xargs kill -9", shell=True)
                st.session_state.target_dir = active_dir
                st.session_state.target_name = "Active Workspace (Main Build)"
                st.rerun()
        else:
            if st.button("🚀 Mount & Preview Selected Version", use_container_width=True, help="Kills running engines and safely swaps context to look inside this archive folder."):
                if backend_live: subprocess.run(f"lsof -t -i:{active_backend_port} | xargs kill -9", shell=True)
                if frontend_live: subprocess.run(f"lsof -t -i:{active_frontend_port} | xargs kill -9", shell=True)
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
    if "not a git repository" in status_check.stderr.lower():
        status_check = subprocess.run(["git", "status"], cwd=base_dir, capture_output=True, text=True)
        if "not a git repository" not in status_check.stderr.lower():
            git_target = base_dir

    if "not a git repository" in status_check.stderr.lower():
        st.info("No localized Git deployment detected in your active folder workspace.")
        if st.button("🚀 Initialize Git tracking on Active Workspace", help="Creates a local Git history tracking database to safeguard file changes."):
            subprocess.run(["git", "init"], cwd=active_dir)
            subprocess.run(["git", "add", "."], cwd=active_dir)
            subprocess.run(["git", "commit", "-m", "Initial baseline commit"], cwd=active_dir)
            st.rerun()
    else:
        st.text_area("Workspace Source Ledger Status:", status_check.stdout, height=150, help="The real-time output of 'git status'. Shows modified files waiting to be committed.")
        col_commit, col_push = st.columns([3, 1])
        with col_commit:
            commit_msg = st.text_input("Describe modifications for this version snapshot:", help="Type a short log entry explaining what you changed or harvested in this commit.")
            if st.button("🔒 Commit Snapshot", help="Locks these variations permanently into your encrypted local version control history branch."):
                if not commit_msg:
                    st.warning("Please supply a descriptive version entry note.")
                else:
                    subprocess.run(["git", "add", "."], cwd=git_target)
                    res = subprocess.run(["git", "commit", "-m", commit_msg], cwd=git_target, capture_output=True, text=True)
                    st.success("Snapshot secured inside Git timeline ledger.")
                    st.text(res.stdout)
        with col_push:
            st.write("")
            st.write("") 
            if st.button("📤 Push to Cloud Repository", use_container_width=True, help="Pushes your local version history up to your linked upstream cloud backup architecture."):
                with st.spinner("Syncing data links..."):
                    push_res = subprocess.run(["git", "push"], cwd=git_target, capture_output=True, text=True)
                    if push_res.returncode == 0:
                        st.success("Synchronized with cloud anchor repo.")
                    else:
                        st.error("Could not sync. Ensure remote configurations match upstream branches.")
                        st.text_area("Console feedback:", push_res.stderr)
except Exception as e:
    st.error(f"Failed to communicate with local git module framework: {e}")

st.markdown("---")

# ==========================================
# 💾 RECOVERY COLD STORAGE EXPORTER
# ==========================================
st.header("💾 Create Cold-Storage Backup Archive")
desc = st.text_input("Enter a descriptive label for file storage tracking:", help="Provide a unique tag to export a timestamped backup folder.")
if st.button("Trigger Cold Archive Export", help="Executes backup.sh to bundle and parse environment architecture rules directly into your cold archive database."):
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
                    st.text_area("Console Output Debugger Log:", result.stderr)
            except Exception as e:
                st.error(f"Failed to execute background automation module: {e}")
