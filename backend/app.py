from flask import Flask, jsonify, request
from flask_cors import CORS
from threading import Thread

import config
from packet_sniffer import start_sniffer
from traffic_analyzer import TrafficAnalyzer
from flask import send_file
from auth.utils import token_required

# ------------------------------------
# Flask App
# ------------------------------------

app = Flask(__name__)

# Enable CORS — requests come from Nginx reverse proxy (same Docker network)
# Allow localhost for local dev and the Docker internal network
CORS(app, origins=[
    "http://localhost",
    "http://localhost:80",
    "http://localhost:5173",
    "http://127.0.0.1",
    "http://127.0.0.1:5173",
    "http://network-analyzer-web",
])

# Register Auth Blueprint
from auth.routes import auth_bp
app.register_blueprint(auth_bp, url_prefix='/auth')

# ------------------------------------
# Create ONE Traffic Analyzer Object
# ------------------------------------

analyzer = TrafficAnalyzer()
analyzer.db.migrate_database()

# ------------------------------------
# API Routes
# ------------------------------------

@app.route("/")
def home():
    return jsonify({
        "message": "AI Network Traffic Analyzer API",
        "status": "Running"
    })


@app.route("/health")
def health():
    db_health = {}
    try:
        db_health = analyzer.db.health_check()
    except Exception as e:
        db_health = {"status": "unhealthy", "error": str(e)}

    status = "healthy"
    if db_health.get("status") != "healthy":
        status = "degraded"

    return jsonify({
        "status": status,
        "database": db_health
    })


@app.route("/statistics")
@token_required()
def statistics():
    return jsonify(analyzer.get_statistics())


@app.route("/metrics")
@token_required()
def metrics():
    return jsonify(analyzer.get_metrics())


@app.route("/protocols")
@token_required()
def protocols():
    return jsonify(analyzer.get_protocol_statistics())


@app.route("/ip-versions")
@token_required()
def ip_versions():
    return jsonify(analyzer.get_ip_version_statistics())


@app.route("/top-ips")
@token_required()
def top_ips():
    return jsonify(analyzer.get_top_ips())


@app.route("/ports")
@token_required()
def ports():
    return jsonify(analyzer.get_top_ports())

@app.route("/recent-packets")
@token_required(allowed_roles=['Admin', 'Analyst'])
def recent_packets():
    from packet_filter import filter_packets
    query = request.args.get("filter", "")
    packets = analyzer.get_recent_packets()
    if query:
        packets = filter_packets(packets, query)
    return jsonify(packets)

@app.route("/geoip/locations")
@token_required(allowed_roles=['Admin', 'Analyst'])
def geoip_locations():
    from geoip_lookup import lookup_ip
    packets = analyzer.get_recent_packets()
    unique_ips = set()
    for p in packets:
        src = p.get("source_ip")
        dst = p.get("destination_ip")
        if src:
            unique_ips.add(src)
        if dst:
            unique_ips.add(dst)
    
    locations = {}
    for ip in unique_ips:
        try:
            loc = lookup_ip(ip)
            if loc and not loc.get("private"):
                locations[ip] = loc
        except Exception as lookup_err:
            print(f"[GeoIP Lookup Warning] Error resolving IP {ip}: {lookup_err}")
            
    return jsonify(locations)

@app.route("/export/csv")
@token_required(allowed_roles=['Admin', 'Analyst'])
def export_csv():
    username = request.user.get('username', 'Unknown Operator')
    try:
        analyzer.db.insert_audit_log(username, "EXPORT_CSV", "Operator exported session packet log as CSV.", request.remote_addr)
    except Exception as e:
        print(f"[Audit Log Warning] {e}")
    filename = analyzer.export_current_session()
    return send_file(
        filename,
        as_attachment=True
    )

@app.route("/export/pcap")
@token_required(allowed_roles=['Admin', 'Analyst'])
def export_pcap():
    username = request.user.get('username', 'Unknown Operator')
    try:
        analyzer.db.insert_audit_log(username, "EXPORT_PCAP", "Operator exported session packet log as PCAP.", request.remote_addr)
    except Exception as e:
        print(f"[Audit Log Warning] {e}")
    filename = analyzer.export_current_pcap()
    return send_file(
        filename,
        as_attachment=True
    )

@app.route("/alerts")
@token_required(allowed_roles=['Admin', 'Analyst'])
def alerts():

    return jsonify(
        analyzer.db.get_alerts()
    )

@app.route("/alerts/history")
@token_required(allowed_roles=['Admin', 'Analyst'])
def alert_history():

    return jsonify(

        analyzer.db.get_alerts()

    )

@app.route("/alerts/session")
@token_required(allowed_roles=['Admin', 'Analyst'])
def session_alerts():

    return jsonify(

        analyzer.db.get_session_alerts(

            analyzer.session_id

        )

    )

@app.route("/alerts/summary")
@token_required(allowed_roles=['Admin', 'Analyst'])
def alert_summary():

    return jsonify(

        analyzer.db.get_alert_summary()

    )

@app.route("/alerts/live")
@token_required(allowed_roles=['Admin', 'Analyst'])
def live_alerts():

    return jsonify(

        analyzer.detector.get_alerts()

    )

@app.route("/security")
@token_required(allowed_roles=['Admin', 'Analyst'])
def security():

    return jsonify(

        analyzer.get_security_statistics()

    )

@app.route("/sessions")
@token_required(allowed_roles=['Admin', 'Analyst'])
def sessions():
    rows = analyzer.db.get_sessions()
    # Inject live in-memory packet count for the currently running session
    # The DB only stores total_packets when end_session() is called (at shutdown),
    # so the running session row always shows 0 until we patch it here.
    live_count = analyzer.statistics["total_packets"]
    patched = []
    for row in rows:
        row = list(row)
        # row format: [id, start_time, end_time, total_packets, status]
        if row[0] == analyzer.session_id and row[4] == "Running":
            row[3] = live_count
        patched.append(row)
    return jsonify(patched)

@app.route("/sessions/<int:session_id>/packets")
@token_required(allowed_roles=['Admin', 'Analyst'])
def get_session_packets(session_id):
    rows = analyzer.db.get_packets_by_session(session_id)
    packets = []
    for r in rows:
        p = {
            "id": r[0],
            "session_id": r[1],
            "timestamp": r[2],
            "source_ip": r[3],
            "destination_ip": r[4],
            "protocol": r[5],
            "source_port": r[6],
            "destination_port": r[7],
            "packet_size": r[8],
            "ip_version": r[9],
        }
        if len(r) > 10:
            p["flags"] = r[10]
        else:
            p["flags"] = None
        if len(r) > 11:
            p["info"] = r[11]
        else:
            p["info"] = f"{r[5]} Frame"
        packets.append(p)
    return jsonify(packets)

@app.route("/sessions/<int:session_id>/report")
@token_required(allowed_roles=['Admin', 'Analyst'])
def get_session_report(session_id):
    from flask import make_response
    from report_generator import generate_html_report

    username = request.user.get('username', 'Unknown Operator')
    try:
        analyzer.db.insert_audit_log(username, "REPORT_GENERATE", f"Operator generated HTML report for session #{session_id}.", request.remote_addr)
    except Exception as e:
        print(f"[Audit Log Warning] {e}")

    session = analyzer.db.get_session_by_id(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
        
    packets = analyzer.db.get_packets_by_session(session_id)
    alerts = analyzer.db.get_session_alerts(session_id)
    
    total_packets = len(packets)
    total_bytes = sum(p[8] for p in packets) if packets else 0
    avg_size = total_bytes / total_packets if total_packets > 0 else 0
    
    if session[4] == "Running" and session_id == analyzer.session_id:
        packet_rate = analyzer.statistics["packet_rate"]
    else:
        packet_rate = 0
        
    metrics = {
        "total_packets": total_packets,
        "total_bytes": total_bytes,
        "packet_rate": packet_rate,
        "average_packet_size": avg_size
    }
    
    # Compute protocol distribution
    protocols = {}
    for p in packets:
        proto = p[5]
        if proto:
            protocols[proto] = protocols.get(proto, 0) + 1
            
    # Compute top talkers
    ip_counts = {}
    for p in packets:
        src = p[3]
        dst = p[4]
        if src:
            ip_counts[src] = ip_counts.get(src, 0) + 1
        if dst:
            ip_counts[dst] = ip_counts.get(dst, 0) + 1
            
    top_ips = dict(sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:8])
    
    html_content = generate_html_report(session, metrics, protocols, top_ips, alerts)
    
    if request.args.get("download") == "true":
        response = make_response(html_content)
        response.headers["Content-Disposition"] = f"attachment; filename=session_{session_id}_report.html"
        response.headers["Content-Type"] = "text/html"
        return response
        
    return html_content

@app.route("/ai/status")
@token_required(allowed_roles=['Admin', 'Analyst'])
def ai_status():

    return {

        "model": "Isolation Forest",

        "status": "Loaded"

    }

@app.route("/ai/info")
@token_required(allowed_roles=['Admin', 'Analyst'])
def ai_info():

    return {

        "algorithm": "Isolation Forest",

        "window_size": 100,

        "features": 10

    }

@app.route("/ai/history")
@token_required(allowed_roles=['Admin', 'Analyst'])
def ai_history():
    return jsonify(analyzer.ai_history)

@app.route("/ai/trends")
@token_required(allowed_roles=['Admin', 'Analyst'])
def ai_trends():
    limit = request.args.get("limit", default=100, type=int)
    try:
        trends = analyzer.db.get_ai_trends(limit)
        return jsonify(trends)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/ai/statistics")
@token_required(allowed_roles=['Admin', 'Analyst'])
def ai_statistics():

    return jsonify({

        "model":"Isolation Forest",

        "detections":

            len(

                analyzer.ai_history

            )

    })

# Background ML model training states
is_training = False
training_status = "idle"
training_error = None

def run_training_in_background():
    global is_training, training_status, training_error
    is_training = True
    training_status = "training"
    training_error = None
    try:
        from ml.train_model import train as train_ml_model
        train_ml_model()
        training_status = "completed"
    except Exception as e:
        training_status = "error"
        training_error = str(e)
        print(f"[ML Training Error] Background training failed: {e}")
    finally:
        is_training = False

@app.route("/ai/train", methods=["POST"])
@token_required(allowed_roles=['Admin'])
def ai_train():
    global is_training, training_status, training_error
    if is_training:
        return jsonify({"status": "error", "message": "Model training is already in progress."}), 400

    username = request.user.get('username', 'Unknown Operator')
    try:
        analyzer.db.insert_audit_log(username, "MODEL_RETRAIN", "Operator initiated ML model retraining sequence.", request.remote_addr)
    except Exception as e:
        print(f"[Audit Log Warning] {e}")

    # Spawn asynchronous worker thread
    worker = Thread(target=run_training_in_background, daemon=True)
    worker.start()

    return jsonify({
        "status": "success",
        "message": "AI model training started in background worker thread."
    })

@app.route("/ai/train/status")
@token_required(allowed_roles=['Admin', 'Analyst'])
def get_ai_train_status():
    global is_training, training_status, training_error
    return jsonify({
        "is_training": is_training,
        "status": training_status,
        "error": training_error
    })

@app.route("/packets/<int:packet_id>/detail")
@token_required(allowed_roles=['Admin', 'Analyst'])
def packet_detail(packet_id):

    raw_pkt = analyzer.raw_packets.get(packet_id)

    if not raw_pkt:

        return jsonify({"error": "Packet details expired or not found"}), 404

    # 1. Parse Scapy layers into a structured format
    layers = {}

    import time
    current_layer = raw_pkt
    while current_layer:
        layer_name = current_layer.__class__.__name__
        fields = {}
        for f in current_layer.fields_desc:
            val = getattr(current_layer, f.name)
            if val is not None:
                if isinstance(val, bytes):
                    fields[f.name] = val.decode("utf-8", errors="ignore")
                else:
                    fields[f.name] = str(val)
        layers[layer_name] = fields
        
        # Stop loop if no payload
        current_layer = current_layer.payload
        if not current_layer or current_layer.__class__.__name__ == "NoPayload":
            break

    # 2. Translate raw bytes to side-by-side Hex & ASCII monospace blocks
    raw_bytes = bytes(raw_pkt)
    hex_blocks = []
    ascii_blocks = []
    
    for i in range(0, len(raw_bytes), 16):
        chunk = raw_bytes[i:i+16]
        h_part = " ".join(f"{b:02x}" for b in chunk)
        h_part = h_part.ljust(47)
        a_part = "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk)
        hex_blocks.append(f"{i:04x}   {h_part}")
        ascii_blocks.append(a_part)
        
    hexdump_lines = [f"{h}  |  {a}" for h, a in zip(hex_blocks, ascii_blocks)]
    hexdump_str = "\n".join(hexdump_lines)

    return jsonify({
        "id": packet_id,
        "summary": {
            "time": time.strftime("%H:%M:%S"),
            "size": len(raw_pkt),
            "protocol": raw_pkt.__class__.__name__
        },
        "layers": layers,
        "payload": {
            "hex": hexdump_str,
            "raw": raw_bytes.hex()
        }
    })

@app.route("/sessions/<int:session_id>", methods=["DELETE"])
@token_required(allowed_roles=['Admin'])
def delete_session(session_id):
    username = request.user.get('username', 'Unknown Operator')
    try:
        analyzer.db.insert_audit_log(username, "SESSION_DELETE", f"Operator purged capture session #{session_id}.", request.remote_addr)
    except Exception as e:
        print(f"[Audit Log Warning] {e}")

    if session_id == analyzer.session_id:
        return jsonify({"status": "error", "message": "Cannot delete active capture session."}), 400

    success = analyzer.db.delete_session(session_id)
    if success:
        return jsonify({"status": "success", "message": f"Session #{session_id} successfully deleted."})
    else:
        return jsonify({"status": "error", "message": "Failed to delete session database files."}), 500

@app.route("/capture/start", methods=["POST"])
@token_required(allowed_roles=['Admin'])
def capture_start():
    username = request.user.get('username', 'Unknown Operator')
    try:
        analyzer.db.insert_audit_log(username, "CAPTURE_START", "Operator initiated sniffer interface active listener.", request.remote_addr)
    except Exception as e:
        print(f"[Audit Log Warning] {e}")
    if not analyzer.running:
        analyzer.running = True
        sniffer_thread = Thread(
            target=start_sniffer,
            args=(analyzer,),
            daemon=True
        )
        sniffer_thread.start()
    analyzer.paused = False
    return jsonify({"status": "success", "message": "Capture started."})

@app.route("/capture/pause", methods=["POST"])
@token_required(allowed_roles=['Admin'])
def capture_pause():
    username = request.user.get('username', 'Unknown Operator')
    try:
        analyzer.db.insert_audit_log(username, "CAPTURE_PAUSE", "Operator paused sniffer interface active listener.", request.remote_addr)
    except Exception as e:
        print(f"[Audit Log Warning] {e}")
    analyzer.paused = True
    return jsonify({"status": "success", "message": "Capture paused."})

@app.route("/capture/stop", methods=["POST"])
@token_required(allowed_roles=['Admin'])
def capture_stop():
    username = request.user.get('username', 'Unknown Operator')
    try:
        analyzer.db.insert_audit_log(username, "CAPTURE_STOP", "Operator terminated sniffer interface listener.", request.remote_addr)
    except Exception as e:
        print(f"[Audit Log Warning] {e}")
    analyzer.running = False
    return jsonify({"status": "success", "message": "Capture stopped."})

@app.route("/capture/clear", methods=["POST"])
@token_required(allowed_roles=['Admin'])
def capture_clear():
    username = request.user.get('username', 'Unknown Operator')
    try:
        analyzer.db.insert_audit_log(username, "CAPTURE_CLEAR", "Operator cleared active packet buffer.", request.remote_addr)
    except Exception as e:
        print(f"[Audit Log Warning] {e}")
    analyzer.recent_packets.clear()
    analyzer.statistics["total_packets"] = 0
    analyzer.statistics["total_bytes"] = 0
    analyzer.statistics["protocols"] = {"TCP": 0, "UDP": 0, "ICMP": 0, "OTHER": 0}
    analyzer.statistics["source_ips"].clear()
    analyzer.statistics["destination_ips"].clear()
    analyzer.statistics["source_ports"].clear()
    analyzer.statistics["destination_ports"].clear()
    return jsonify({"status": "success", "message": "Telemetry buffers reset."})

@app.route("/capture/status")
@token_required()
def capture_status():
    return jsonify({
        "running": analyzer.running,
        "paused": analyzer.paused
    })

# ------------------------------------
# Sniffer Startup & Signal Handlers
# Runs under BOTH gunicorn and direct python app.py
# ------------------------------------

import signal
import sys

def graceful_shutdown(signum, frame):
    print(f"\nSignal {signum} received. Initiating graceful shutdown...")
    try:
        analyzer.close_session()
        print("Session Saved Successfully.")
    except Exception as e:
        print(f"Error saving session: {e}")
    sys.exit(0)

signal.signal(signal.SIGTERM, graceful_shutdown)
signal.signal(signal.SIGINT, graceful_shutdown)

# Start packet sniffer in a background daemon thread
_sniffer_thread = Thread(target=start_sniffer, args=(analyzer,), daemon=True)
_sniffer_thread.start()

print("=" * 60)
print("AI NETWORK TRAFFIC ANALYZER")
print("=" * 60)
print("Packet Sniffer Running...")
print("Flask API Running on 0.0.0.0:5000")
print("=" * 60)

@app.route("/audit-logs")
@token_required(allowed_roles=['Admin'])
def get_audit_logs():
    limit = request.args.get("limit", default=100, type=int)
    try:
        logs = analyzer.db.get_audit_logs(limit)
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api-keys")
@token_required(allowed_roles=['Admin'])
def get_api_keys_route():
    try:
        keys = analyzer.db.get_api_keys()
        return jsonify(keys)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api-keys", methods=["POST"])
@token_required(allowed_roles=['Admin'])
def create_api_key_route():
    import secrets
    data = request.get_json() or {}
    name = data.get("name")
    role = data.get("role", "Analyst")
    if not name:
        return jsonify({"error": "Key name is required"}), 400
        
    if role not in ["Admin", "Analyst", "Guest"]:
        return jsonify({"error": "Invalid role specified"}), 400
        
    key_value = f"soc_live_{secrets.token_hex(24)}"
    
    success = analyzer.db.create_api_key(key_value, name, role)
    if success:
        username = request.user.get("username", "Unknown Operator")
        try:
            analyzer.db.insert_audit_log(username, "APIKEY_CREATE", f"Operator generated new API key ({name}) with role {role}.", request.remote_addr)
        except Exception:
            pass
        return jsonify({
            "status": "success",
            "key": {
                "key_value": key_value,
                "name": name,
                "role": role
            }
        }), 201
    else:
        return jsonify({"error": "Failed to store API Key"}), 500

@app.route("/api-keys/<int:key_id>", methods=["DELETE"])
@token_required(allowed_roles=['Admin'])
def revoke_api_key_route(key_id):
    success = analyzer.db.revoke_api_key(key_id)
    if success:
        username = request.user.get("username", "Unknown Operator")
        try:
            analyzer.db.insert_audit_log(username, "APIKEY_REVOKE", f"Operator revoked API key ID #{key_id}.", request.remote_addr)
        except Exception:
            pass
        return jsonify({"status": "success", "message": f"API key #{key_id} successfully revoked."})
    else:
        return jsonify({"error": "Failed to revoke API key"}), 500

if __name__ == "__main__":
    try:
        app.run(host="0.0.0.0", port=5000, debug=False)
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        analyzer.close_session()
        print("Session Saved Successfully.")