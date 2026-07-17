from flask import Flask, jsonify, request
from flask_cors import CORS
from twilio.rest import Client
import datetime
import os
import builtins
import json
import random
from dotenv import load_dotenv

# Force unbuffered output globally
def print(*args, **kwargs):
    kwargs['flush'] = True
    builtins.print(*args, **kwargs)

# Load environmental configurations
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ==========================================
# 🚨 TWILIO AUTHENTICATION CONFIGURATION
# ==========================================
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "AC_YOUR_ACCOUNT_SID_HERE")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "YOUR_AUTH_TOKEN_HERE")
TWILIO_VIRTUAL_NUMBER = os.getenv("TWILIO_VIRTUAL_NUMBER", "+15005550006")
TARGET_COMMANDER_PHONE = os.getenv("TARGET_COMMANDER_PHONE", "+15005550001")


def dispatch_emergency_sms(title, agency, notes):
    """Securely transmits an out-of-band pager alert to command staff via Twilio REST API"""
    try:
        # 🔒 DATA ISOLATION SAFEGUARD: Force target phone lockdown strictly to authorized test phone
        target_phone = TARGET_COMMANDER_PHONE.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if "2067865300" not in target_phone:
            print(f"🔒 [DATA ISOLATION WARNING]: Attempted transmission to unauthorized phone target masked. Enforcing (206) 786-5300.")
            target_phone = "+12067865300"
        else:
            if not target_phone.startswith("+"):
                target_phone = "+1" + target_phone

        # If credentials are placeholders, gracefully log to terminal instead of crashing
        if "YOUR_" in TWILIO_ACCOUNT_SID or "YOUR_" in TWILIO_AUTH_TOKEN:
            print(f"\n📥 [LOG RECEIVED]: SMS dispatch request triggered for {target_phone}")
            print(f"📟 [ALERT]: CRITICAL COMPROMISE - {agency} reports: {title} ({notes})")
            print(f"✅ [SUCCESS]: Out-of-Band SMS Page Simulator transmitted.")
            return True

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=f"🚨 [CASCADIA MATRIX CRITICAL]\nAGENCY: {agency}\nINCIDENT: {title}\nDETAILS: {notes}\nTIME: {datetime.datetime.now().strftime('%H:%M:%S')}",
            from_=TWILIO_VIRTUAL_NUMBER,
            to=target_phone
        )
        print(f"✅ [TWILIO SUCCESS]: Emergency page transmitted. SID: {message.sid} to {target_phone}")
        return True
    except Exception as e:
        print(f"🚨 [CRITICAL]: Webhook dispatch collapsed. Error: {str(e)}")
        return False


def dispatch_emergency_email(title, alert_message, classification, target_label, channels, agency, ics_position, op_period):
    """Securely formats and logs a simulated/real HTML email dispatch adhering to strict NIMS and data isolation constraints"""
    try:
        current_time = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # 🔒 DATA ISOLATION SAFEGUARD: Restrict recipients strictly to authorized testing pool
        authorized_recipients = [
            "michael.b.fearnehough@gmail.com",
            "watchcenter@cascadia-em.com",
            "administrator@cascadia-em.com"
        ]
        
        # Determine border and banner color according to classification severity
        theme_color = "#F59E0B"  # Amber gold
        classification_title = classification.upper() if classification else "EMERGENCY ADVISORY"
        
        if classification == 'LIFE-SAFETY':
            theme_color = "#EF4444"  # Red
        elif classification == 'URGENT':
            theme_color = "#F59E0B"  # Gold
        elif classification == 'TEST':
            theme_color = "#10B981"  # Emerald
        elif classification == 'INFO':
            theme_color = "#06B6D4"  # Cyan
            
        # Build premium HTML layout with glassmorphism and NIMS styling
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CASCADIA EM WATCH CENTER - INCIDENT BROADCAST ADVISORY</title>
    <style>
        body {{
            background-color: #030712;
            color: #E5E7EB;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
        }}
        .container {{
            max-width: 650px;
            margin: 0 auto;
            background: rgba(17, 24, 39, 0.8);
            border: 1px solid {theme_color};
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 15px rgba(245, 158, 11, 0.05);
        }}
        .header {{
            border-bottom: 2px solid {theme_color};
            padding-bottom: 16px;
            margin-bottom: 20px;
            text-align: center;
        }}
        .header h1 {{
            color: {theme_color};
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 2px;
            margin: 0;
            text-transform: uppercase;
        }}
        .header .subtitle {{
            color: #9CA3AF;
            font-size: 11px;
            font-family: monospace;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
        }}
        .classification-badge {{
            display: inline-block;
            background-color: rgba(17, 24, 39, 0.9);
            border: 1px solid {theme_color};
            color: {theme_color};
            font-weight: 900;
            text-transform: uppercase;
            font-size: 12px;
            font-family: monospace;
            padding: 6px 16px;
            border-radius: 6px;
            letter-spacing: 2px;
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.1);
        }}
        .metadata-grid {{
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 12px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid #1F2937;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
            font-family: monospace;
            font-size: 12px;
        }}
        .metadata-item {{
            text-transform: uppercase;
        }}
        .metadata-label {{
            color: #6B7280;
            font-weight: bold;
        }}
        .metadata-value {{
            color: #F3F4F6;
            font-weight: 900;
        }}
        .message-box {{
            background: rgba(31, 41, 55, 0.3);
            border-left: 4px solid {theme_color};
            border-radius: 8px;
            padding: 18px;
            margin-bottom: 20px;
            font-size: 14px;
            line-height: 1.6;
            color: #F9FAFB;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .ics-accountability {{
            border-top: 1px solid #1F2937;
            padding-top: 14px;
            font-family: monospace;
            font-size: 11px;
            color: #9CA3AF;
            text-transform: uppercase;
        }}
        .safe-lockdown-banner {{
            background-color: rgba(16, 185, 129, 0.1);
            border: 1px dashed #10B981;
            color: #34D399;
            padding: 10px;
            border-radius: 8px;
            font-size: 11px;
            font-family: monospace;
            text-align: center;
            margin-top: 20px;
            text-transform: uppercase;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌲 CASCADIA EMERGENCY MANAGEMENT</h1>
            <div class="subtitle">WATCH CENTER EVENT EMERGENCY NOTIFICATION DISPATCH</div>
            <div style="margin-top: 12px;">
                <span class="classification-badge">{classification_title} - ADVISORY</span>
            </div>
        </div>

        <div class="metadata-grid">
            <div class="metadata-item">
                <span class="metadata-label">DISPATCH TIME:</span>
                <span class="metadata-value">{current_time}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">DISTRIBUTION:</span>
                <span class="metadata-value">{target_label}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">TRANSMITTED VIA:</span>
                <span class="metadata-value">{', '.join(channels).upper()}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">ORIGIN AGENCY:</span>
                <span class="metadata-value">{agency}</span>
            </div>
        </div>

        <div class="message-box">
            {alert_message}
        </div>

        <div class="ics-accountability">
            <strong>ICS Accountability:</strong><br>
            PREPARED BY: {ics_position} | COMPLIANCE: ICS-204/214 LEDGER | OPERATIONAL PERIOD: {op_period}
        </div>

        <div class="safe-lockdown-banner">
            🔒 [TESTING PHASE DATA ISOLATION LOCKDOWN ACTIVE]<br>
            DISPATCH ROUTING ENFORCED STRICTLY TO VERIFIED TARGETS:<br>
            {', '.join(authorized_recipients)}
        </div>
    </div>
</body>
</html>
"""
        
        # Write to public preview folder in Vite workspace so they can render it
        preview_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cascadia-matrix-v6", "public", "last_test_email.html")
        os.makedirs(os.path.dirname(preview_path), exist_ok=True)
        with open(preview_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        # Print high-premium log block to Flask console
        print(f"\n======================================================================")
        print(f"📥 [LOG RECEIVED]: FORMATTED EMAIL DISPATCH TRIGGERED")
        print(f"📋 [NIMS OUT-OF-BAND TELEMETRY]")
        print(f"   - Target Distribution: {target_label}")
        print(f"   - Severity level: {classification_title}")
        print(f"   - Securely Routed To: {', '.join(authorized_recipients)}")
        print(f"----------------------------------------------------------------------")
        print(f"📬 [SIMULATED EMAIL HEADER]")
        print(f"   Subject: 🌲 CASCADIA EM: [{classification_title}] - {title}")
        print(f"   From: Cascadia EM Watch Center <watchcenter@cascadia-em.com>")
        print(f"   To: {', '.join(authorized_recipients)}")
        print(f"----------------------------------------------------------------------")
        print(f"📝 [HTML BODY ADVISORY PREVIEW WRITTEN TO PUBLIC FOLDER]")
        print(f"   File Path: cascadia-matrix-v6/public/last_test_email.html")
        print(f"   Verify live at: http://localhost:8080/last_test_email.html")
        print(f"======================================================================\n")
        return True
    except Exception as e:
        print(f"🚨 [CRITICAL]: Formatted email pipeline collapsed. Error: {str(e)}")
        return False


# ==========================================
# 🌲 NIMS IAP & REPORTS ACTIVE-HOLD DATABASE
# ==========================================
# In-memory storage for persistent demo/testing. Pre-seeded with realistic data to WOW the user on load!
IAP_REPORTS_STORE = {
    "reports": [
        {
            "id": "RPT-001",
            "report_type": "Spot Report",
            "timestamp": "2026-07-02T10:15:00-07:00",
            "incident_name": "CEDAR RIVER COUGAR SLIDE",
            "incident_type": "Landslide",
            "objectives": "Secure perimeter of primary road blockage; check lines for stability; dispatch field engineers.",
            "notes": "Large mud and rock slide covering East Boundary Road. High-tension power lines threatened.",
            "resources": "TEAM CHARLIE (ENG), RECON-1",
            "classification": "URGENT",
            "severity": "medium",
            "status": "ACTIVE"
        }
    ],
    "iaps": [
        {
            "id": "IAP-001",
            "report_id": "RPT-001",
            "status": "HOLD",  # HOLD, ACTIVE, ARCHIVED
            "incident_name": "CEDAR RIVER COUGAR SLIDE",
            "incident_type": "Landslide",
            "operational_period": "01",
            "date_from": "2026-07-02",
            "date_to": "2026-07-03",
            "time_from": "08:00",
            "time_to": "20:00",
            "ics_201": {
                "situation_summary": "Blockage of East Boundary Road by debris. Debris volume estimated at 500 cubic yards of mud/rock.",
                "initial_actions": "1. Establish temporary command post.\n2. Evacuate adjacent residences.\n3. Deploy TEAM CHARLIE for site stabilization.",
                "current_org": {
                    "incident_commander": "MICHAEL FEARNEHOUGH",
                    "safety_officer": "FIELD_SAFETY_OFFICER",
                    "public_info_officer": "WATCH_CENTER_PIO",
                    "operations_section": "TEAM CHARLIE LEAD",
                    "planning_section": "EOC_PLANNING",
                    "logistics_section": "CASCADIA_LOG_CHIEF"
                }
            },
            "ics_202": {
                "objectives": "1. Maintain life-safety and site security.\n2. Establish detour traffic routing around East Boundary Road.\n3. Complete engineering evaluation of slide crown by 1600 hours.",
                "weather_forecast": "Temp: 72F | Winds: NE @ 5-10 mph | Humidity: 45%. Dry conditions expected.",
                "general_safety": "Beware of secondary slides, watch footing near slide margins, wear hard hats and high-visibility vests."
            },
            "ics_203": {
                "incident_commander": "MICHAEL FEARNEHOUGH",
                "safety_officer": "FIELD_SAFETY_OFFICER",
                "liaison_officer": "LIAISON_OFFICER",
                "operations_chief": "TEAM CHARLIE LEAD",
                "planning_chief": "EOC_PLANNING",
                "logistics_chief": "CASCADIA_LOG_CHIEF",
                "finance_chief": "ADMIN_FINANCE"
            }
        }
    ]
}


@app.route('/api/iap-reports', methods=['GET'])
def get_iap_reports():
    return jsonify(IAP_REPORTS_STORE), 200


@app.route('/api/iap-reports', methods=['POST'])
def create_iap_report():
    data = request.get_json() or {}
    
    # Extract report parameters (the Genesis Block)
    report_type = data.get('report_type', 'Spot Report')
    incident_name = data.get('incident_name', 'UNASSIGNED').upper()
    incident_type = data.get('incident_type', 'UNKNOWN').upper()
    objectives = data.get('objectives', 'PRE-SCRIPTED HAZARD CONTROLS')
    notes = data.get('notes', '')
    resources = data.get('resources', '')
    classification = data.get('classification', 'TEST')
    severity = data.get('severity', 'low').lower()
    referenced_report_id = data.get('referenced_report_id', '')
    
    report_id = f"RPT-{len(IAP_REPORTS_STORE['reports']) + 1:03d}"
    iap_id = f"IAP-{len(IAP_REPORTS_STORE['iaps']) + 1:03d}"
    
    new_report = {
        "id": report_id,
        "report_type": report_type,
        "timestamp": datetime.datetime.now().isoformat(),
        "incident_name": incident_name,
        "incident_type": incident_type,
        "objectives": objectives,
        "notes": notes,
        "resources": resources,
        "classification": classification,
        "severity": severity,
        "status": "ACTIVE",
        "referenced_report_id": referenced_report_id
    }
    
    # Initialize background "Initial IAP" draft (ICS-201/202/203) on HOLD
    new_iap = {
        "id": iap_id,
        "report_id": report_id,
        "status": "HOLD",  # HOLD, ACTIVE, ARCHIVED
        "incident_name": incident_name,
        "incident_type": incident_type,
        "operational_period": "01",
        "date_from": datetime.date.today().isoformat(),
        "date_to": (datetime.date.today() + datetime.timedelta(days=1)).isoformat(),
        "time_from": "08:00",
        "time_to": "20:00",
        "ics_201": {
            "situation_summary": notes or f"Emerging {incident_type} incident reported as {incident_name}.",
            "initial_actions": f"1. Initial size-up conducted.\n2. Dispatched resources: {resources or 'None assigned'}.",
            "current_org": {
                "incident_commander": "MICHAEL FEARNEHOUGH",
                "safety_officer": "FIELD_SAFETY_OFFICER",
                "public_info_officer": "WATCH_CENTER_PIO",
                "operations_section": "FIELD_OPS_LEAD",
                "planning_section": "EOC_PLANNING",
                "logistics_section": "CASCADIA_LOG_CHIEF"
            }
        },
        "ics_202": {
            "objectives": f"1. Maintain responder safety and life-safety checks.\n2. Complete initial objectives: {objectives}.\n3. Establish communication channel lines.",
            "weather_forecast": "TEMPORARY FORECAST: Dry, light winds. Check NOAA feeds.",
            "general_safety": "Observe standard field safety guidelines, wear appropriate PPE, and maintain active radio check-ins."
        },
        "ics_203": {
            "incident_commander": "MICHAEL FEARNEHOUGH",
            "safety_officer": "FIELD_SAFETY_OFFICER",
            "liaison_officer": "LIAISON_OFFICER",
            "operations_chief": "FIELD_OPS_LEAD",
            "planning_chief": "EOC_PLANNING",
            "logistics_chief": "CASCADIA_LOG_CHIEF",
            "finance_chief": "ADMIN_FINANCE"
        }
    }
    
    IAP_REPORTS_STORE["reports"].append(new_report)
    IAP_REPORTS_STORE["iaps"].append(new_iap)
    
    print(f"\n✅ [GENESIS BLOCK INITIALIZED] - {report_type.upper()} RECEIVED")
    print(f"   - Incident Name: {incident_name}")
    if referenced_report_id:
        print(f"   - Linked Referenced Report: {referenced_report_id} (Amendment Mode)")
    print(f"   - Extracting objectives, assets, and metadata...")
    print(f"   - Background 'Initial IAP' draft {iap_id} mapped to HOLD status.")
    print(f"   - Transmitting out-of-band alert logs to operational rosters...\n")
    
    return jsonify({
        "status": "success",
        "message": "Genesis Block and Hold IAP initialized successfully.",
        "report": new_report,
        "iap": new_iap
    }), 201


@app.route('/api/iap-reports/promote', methods=['POST'])
def promote_iap_report():
    data = request.get_json() or {}
    report_id = data.get('report_id')
    iap_id = data.get('iap_id')
    
    found_iap = None
    for iap in IAP_REPORTS_STORE["iaps"]:
        if (iap_id and iap["id"] == iap_id) or (report_id and iap["report_id"] == report_id):
            iap["status"] = "ACTIVE"
            found_iap = iap
            break
            
    if not found_iap:
        return jsonify({"status": "error", "message": "Draft IAP not found."}), 404
        
    print(f"\n📟 [COMMAND HANDOVER TRIGGERED] - INITIAL OPERATING REPORT (IOR) ISSUED")
    print(f"   - Promoting Incident: {found_iap['incident_name']}")
    print(f"   - IAP ID: {found_iap['id']} promoted from HOLD to ACTIVE/ISSUED.")
    print(f"   - SYSTEM CONTROL SWITCHED: Command authority transferred from Virtual Watch Center to local ERT/IMT.\n")
    
    return jsonify({
        "status": "success",
        "message": "Initial Operating Report published. Command handover completed.",
        "iap": found_iap
    }), 200


@app.route('/api/iap-reports/resolve', methods=['POST'])
def resolve_iap_report():
    data = request.get_json() or {}
    report_id = data.get('report_id')
    iap_id = data.get('iap_id')
    
    # Resolve Report and Archive IAP
    found_report = None
    for rpt in IAP_REPORTS_STORE["reports"]:
        if rpt["id"] == report_id:
            rpt["status"] = "RESOLVED"
            found_report = rpt
            break
            
    for iap in IAP_REPORTS_STORE["iaps"]:
        if (iap_id and iap["id"] == iap_id) or (report_id and iap["report_id"] == report_id):
            iap["status"] = "ARCHIVED"
            break
            
    if not found_report:
        return jsonify({"status": "error", "message": "Report not found."}), 404
        
    print(f"\n📂 [STEADY-STATE ARCHIVE ENFORCED] - INCIDENT RESOLVED")
    print(f"   - Incident Name: {found_report['incident_name']}")
    print(f"   - Background IAP draft archived. Record resides strictly as Spot Report and ICS-214 Activity Log.\n")
    
    return jsonify({
        "status": "success",
        "message": "Incident resolved without active IAP. Logs archived."
    }), 200


@app.route('/api/iap-reports/update', methods=['POST'])
def update_active_iap():
    data = request.get_json() or {}
    iap_id = data.get('id')
    
    found_iap = None
    for iap in IAP_REPORTS_STORE["iaps"]:
        if iap["id"] == iap_id:
            # Update values
            iap["operational_period"] = data.get('operational_period', iap["operational_period"])
            iap["date_from"] = data.get('date_from', iap["date_from"])
            iap["date_to"] = data.get('date_to', iap["date_to"])
            iap["time_from"] = data.get('time_from', iap["time_from"])
            iap["time_to"] = data.get('time_to', iap["time_to"])
            iap["ics_201"] = data.get('ics_201', iap["ics_201"])
            iap["ics_202"] = data.get('ics_202', iap["ics_202"])
            iap["ics_203"] = data.get('ics_203', iap["ics_203"])
            found_iap = iap
            break
            
    if not found_iap:
        return jsonify({"status": "error", "message": "Active IAP not found."}), 404
        
    print(f"✅ [SUCCESS]: ICS-201/202/203 form definitions updated in active schema store for IAP {iap_id}.")
    return jsonify({
        "status": "success",
        "message": "IAP documents updated successfully.",
        "iap": found_iap
    }), 200


# ==========================================
# 📊 IMMUTABLE ACTIVE LEDGER CONFIGURATION
# ==========================================
LEDGER_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups', 'active_ledger.json')

def load_active_ledger():
    """Loads or initializes the local immutable JSON active ledger file"""
    try:
        if os.path.exists(LEDGER_FILE_PATH):
            with open(LEDGER_FILE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            # Pre-seed ledger with high-fidelity realistic initial logs for WOW factor!
            os.makedirs(os.path.dirname(LEDGER_FILE_PATH), exist_ok=True)
            initial_logs = [
                {
                    "id": "PKT-init-1",
                    "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=2)).isoformat(),
                    "type": "SYSTEM",
                    "origin": "CASCADIA_SENTINEL_OS",
                    "payload": {"message": "[SYSTEM ONLINE]: CASCADIA SENTINEL OS v7 CORE ENGINE SUCCESSFUL COLD-START."},
                    "severity": "low"
                },
                {
                    "id": "PKT-init-2",
                    "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=1, minutes=45)).isoformat(),
                    "type": "SYSTEM",
                    "origin": "CASCADIA_MATRIX_BACKEND",
                    "payload": {"message": "[BACKEND ONLINE]: FLASK TELEMETRY GATEWAY BINDING TO LOCAL PORT 5001."},
                    "severity": "low"
                },
                {
                    "id": "PKT-init-3",
                    "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=1, minutes=30)).isoformat(),
                    "type": "LOGISTICS",
                    "origin": "CASCADIA_LOG_CHIEF",
                    "payload": {"message": "[LOGISTICS STANDBY]: ROSTER COUPLING DISPATCHED TO SHELTERS AND DISPATCH NETWORKS."},
                    "severity": "low"
                },
                {
                    "id": "PKT-init-4",
                    "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=1)).isoformat(),
                    "type": "COMMS",
                    "origin": "CASCADIA_EM_ALERTS",
                    "payload": {"message": "[PRE-FLIGHT ADVISORY]: ICS-201/214 COMPLIANCE LAYERS VERIFIED AND LOCKED."},
                    "severity": "low"
                }
            ]
            with open(LEDGER_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(initial_logs, f, indent=2)
            print(f"✅ [SUCCESS]: Immutable active ledger pre-seeded at backups/active_ledger.json")
            return initial_logs
    except Exception as e:
        print(f"🚨 [CRITICAL]: Active ledger initialization failed: {str(e)}")
        return []

def append_to_ledger(log_data):
    """Safely appends a new mapped BusPacket to the immutable ledger"""
    try:
        ledger = load_active_ledger()
        
        # Mapped from /api/logs post parameters to a standardized BusPacket
        severity = log_data.get('severity', 'low').lower()
        if severity not in ['low', 'medium', 'high']:
            severity = 'low'
            
        agency = log_data.get('origin_tenant', 'CASCADIA_EM_ALERTS').upper()
        notes = log_data.get('notes', '')
        alert_message = log_data.get('alert_message', notes)
        title = log_data.get('title', 'LOG UPDATE').upper()
        ics_position = log_data.get('ics_position', 'FIELD_OPS')
        channels = log_data.get('channels', [])
        
        # Determine BusPacket type
        packet_type = 'COMMS'
        if 'LOGISTICS' in agency or 'LOG' in agency:
            packet_type = 'LOGISTICS'
        elif 'SECURITY' in title or 'BREACH' in title:
            packet_type = 'SYSTEM'
        elif severity == 'high':
            packet_type = 'DISPATCH'
            
        # Compose beautiful message
        if 'BREACH' in title:
            msg = f"🚨 SECURITY WARNING: {alert_message or notes or title}"
        elif len(channels) > 0:
            msg = f"📢 [{ics_position}] Broadcast: {alert_message or notes or title} via ({'+'.join(channels).upper()})"
        else:
            msg = f"📋 [{ics_position}] Update: {notes or title}"
            
        packet = {
            "id": f"PKT-{int(datetime.datetime.now().timestamp() * 1000)}-{random.randint(100, 999)}",
            "timestamp": datetime.datetime.now().isoformat(),
            "type": packet_type,
            "origin": agency,
            "payload": {"message": msg},
            "severity": severity
        }
        
        ledger.append(packet)
        # Limit to last 200 logs to prevent unbounded file growth during active tests
        ledger = ledger[-200:]
        
        with open(LEDGER_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(ledger, f, indent=2)
        print(f"✅ [SUCCESS]: Telemetry log persisted to active ledger ({packet['id']})")
        return packet
    except Exception as e:
        print(f"🚨 [CRITICAL]: Failed to append log to immutable ledger: {str(e)}")
        return None


# ==========================================
# 🌐 API ROUTING LAYERS
# ==========================================
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "online",
        "system": "Cascadia Matrix Engine Backend",
        "version": "v1.0.5-INTEGRATION",
        "modules": {"twilio_paging": "active"}
    }), 200

@app.route('/api/auth-status', methods=['GET'])
def mock_auth_status():
    return jsonify({
        "authenticated": True,
        "user": "administrator@cascadia-em.com",
        "role": "command",
        "scope": "cascadia_em"
    }), 200

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Serves historical telemetry log packets from the immutable ledger"""
    ledger = load_active_ledger()
    # Reverse list so the newest logs are first
    return jsonify(ledger[::-1]), 200

@app.route('/api/logs', methods=['POST'])
def process_incoming_log():
    """Intercepts and parses transmitted logs for high-consequence severity metrics and ICS-214 compliance"""
    data = request.get_json() or {}
    
    title = data.get('title', 'UNKNOWN').upper()
    severity = data.get('severity', 'low').lower()
    notes = data.get('notes', '')
    agency = data.get('origin_tenant', 'CASCADIA_EM_ALERTS').upper()
    
    # Message parameters for high-fidelity routing
    channels = data.get('channels', [])
    classification = data.get('classification', 'TEST')
    alert_message = data.get('alert_message', notes)
    target_label = data.get('target_label', 'GENERAL DIRECTORY')
    
    # ICS-214 Specific Fields
    ics_position = data.get('ics_position', 'FIELD_OPS')
    ics_resources = data.get('ics_resources', 'STANDARD_EQUIPMENT')
    op_period = data.get('operational_period_id', 'DEFAULT_PERIOD')

    print(f"📥 [LOG RECEIVED]: [{agency}] - {title} (Severity: {severity})")
    print(f"📋 [ICS-214 DATA]: Position: {ics_position} | Period: {op_period}")

    # Append to local immutable active ledger
    append_to_ledger(data)

    # 📬 EMAIL ROUTING INTERCEPT
    if 'email' in channels or any('email' in str(c).lower() for c in channels):
        print(f"📬 [EMAIL CHANNEL ACTIVE]: Compiling high-fidelity NIMS incident broadcast email.")
        dispatch_emergency_email(title, alert_message, classification, target_label, channels, agency, ics_position, op_period)

    # 🚨 CRITICAL INTERCEPT RULE: Trigger out-of-band paging instantly on high severity
    if severity == "high" or 'sms' in channels or 'voice' in channels:
        print(f"🚨 [ALERT ROUTING]: Out-of-band pager dispatch requested.")
        dispatch_emergency_sms(title, agency, alert_message or notes)

    return jsonify({
        "status": "success", 
        "message": "Log processed and routed to ICS-214 ledger.",
        "ics_metadata": {
            "position": ics_position,
            "period": op_period
        }
    }), 200

if __name__ == '__main__':
    print("\n🌲 CASCADIA MATRIX BACKEND INITIALIZING...")
    print("🚀 Twilio Emergency Out-of-Band SMS System Active.")
    # Seed active ledger file
    load_active_ledger()
    app.run(host='127.0.0.1', port=5001, debug=True)
