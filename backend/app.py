from flask import Flask, jsonify
from flask_cors import CORS
from threading import Thread

from packet_sniffer import start_sniffer
from traffic_analyzer import TrafficAnalyzer
from flask import send_file

# ------------------------------------
# Flask App
# ------------------------------------

app = Flask(__name__)

# Enable CORS for React Frontend
CORS(app)

# ------------------------------------
# Create ONE Traffic Analyzer Object
# ------------------------------------

analyzer = TrafficAnalyzer()

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
    return jsonify({
        "status": "healthy"
    })


@app.route("/statistics")
def statistics():
    return jsonify(analyzer.get_statistics())


@app.route("/metrics")
def metrics():
    return jsonify(analyzer.get_metrics())


@app.route("/protocols")
def protocols():
    return jsonify(analyzer.get_protocol_statistics())


@app.route("/ip-versions")
def ip_versions():
    return jsonify(analyzer.get_ip_version_statistics())


@app.route("/top-ips")
def top_ips():
    return jsonify(analyzer.get_top_ips())


@app.route("/ports")
def ports():
    return jsonify(analyzer.get_top_ports())

@app.route("/recent-packets")
def recent_packets():

    return jsonify(
        analyzer.get_recent_packets()
    )

@app.route("/export/csv")
def export_csv():

    filename = analyzer.export_current_session()

    return send_file(

        filename,

        as_attachment=True

    )

@app.route("/export/pcap")
def export_pcap():

    filename = analyzer.export_current_pcap()

    return send_file(

        filename,

        as_attachment=True

    )

@app.route("/alerts")
def alerts():

    return jsonify(
        analyzer.db.get_alerts()
    )


# ------------------------------------
# Main
# ------------------------------------

if __name__ == "__main__":

    # Start Packet Sniffer in Background Thread
    sniffer_thread = Thread(
        target=start_sniffer,
        args=(analyzer,),
        daemon=True
    )

    sniffer_thread.start()

    print("=" * 60)
    print("AI NETWORK TRAFFIC ANALYZER")
    print("=" * 60)
    print("Packet Sniffer Running...")
    print("Flask API Running...")
    print("API URL: http://127.0.0.1:5000")
    print("=" * 60)

    try:

        app.run(
            host="0.0.0.0",
            port=5000,
            debug=False
        )

    except KeyboardInterrupt:

        print("\nStopping...")

    finally:

        analyzer.close_session()

        print("Session Saved Successfully.")