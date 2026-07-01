"""
traffic_analyzer.py

Purpose:
    Analyze live network traffic and maintain statistics.

Author: Srivatsa
Project: AI Network Traffic Analyzer
"""

import time
import os
from exports import ExportManager
from database import DatabaseManager
from collections import deque
from threat_detector import ThreatDetector
from ml.anomaly_detector import AnomalyDetector
from collections import Counter

class TrafficAnalyzer:

    def __init__(self):

        self.running = True

        self.paused = False

        self.start_time = time.time()

        self.db = DatabaseManager()

        self.session_id = self.db.create_session(
            time.strftime("%Y-%m-%d %H:%M:%S")
        )
        # In-memory alert counter for current session — avoids hitting DB per poll
        # Must be initialized BEFORE ThreatDetector so the callback can reference it
        self._total_alerts_count = 0

        self.detector = ThreatDetector(
            self.db,
            self.session_id,
            on_alert=self._on_new_alert
        )

        # AI Module
        try:
            self.ai_detector = AnomalyDetector()
            self.ai_enabled = True
        except Exception as e:
            print(f"AI Module Disabled: {e}")
            self.ai_detector = None
            self.ai_enabled = False

        # Packets collected for AI analysis
        self.ml_packets = []

        # AI detection history
        self.ai_history = []

        # Analyze every 5 seconds
        self.ml_window_start = time.time()
        self.ml_window_duration = 5

        # Get absolute path to the project root captures folder
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(backend_dir)
        self.captures_dir = os.path.join(project_root, "captures")
        os.makedirs(self.captures_dir, exist_ok=True)

        self.capture_file = os.path.join(self.captures_dir, f"session_{self.session_id}.pcap")

        self.recent_packets = deque(maxlen=100)

        self.exporter = ExportManager()

        self.raw_packets = {}

        self.next_packet_id = 1

        # Packet batch buffer — flush to DB every 2s or every 50 packets
        self._packet_buffer = []
        self._last_flush_time = time.time()
        self._flush_interval = 2.0   # seconds
        self._flush_batch_size = 50  # packets


        self.statistics = {
            "total_packets": 0,
            "total_bytes": 0,

            "protocols": {
                "TCP": 0,
                "UDP": 0,
                "ICMP": 0,
                "OTHER": 0
            },

            "ip_versions": {
                "IPv4": 0,
                "IPv6": 0
            },

            "source_ips": {},
            "destination_ips": {},

            "source_ports": {},
            "destination_ports": {}
        }

    # -------------------------------------------------
    # Return statistics
    # -------------------------------------------------

    def get_statistics(self):
        return self.statistics

    # -------------------------------------------------
    # Update statistics
    # -------------------------------------------------

    def update_statistics(self, packet_info, raw_packet):

        if packet_info is None:
            return

        # Increment total packets
        self.statistics["total_packets"] += 1

        # Increment total bytes
        self.statistics["total_bytes"] += packet_info["packet_size"]

        # Increment protocol count
        proto = packet_info["protocol"]
        if proto in self.statistics["protocols"]:
            self.statistics["protocols"][proto] += 1
        else:
            self.statistics["protocols"]["OTHER"] += 1

        # IP Version
        version = packet_info["ip_version"]
        if version in self.statistics["ip_versions"]:
            self.statistics["ip_versions"][version] += 1

        # Source IP
        src_ip = packet_info["source_ip"]
        if src_ip:
            self.statistics["source_ips"][src_ip] = (
                self.statistics["source_ips"].get(src_ip, 0) + 1
            )

        # Destination IP
        dst_ip = packet_info["destination_ip"]
        if dst_ip:
            self.statistics["destination_ips"][dst_ip] = (
                self.statistics["destination_ips"].get(dst_ip, 0) + 1
            )

        # Source Port
        src_port = packet_info.get("source_port")
        if src_port is not None:
            self.statistics["source_ports"][src_port] = (
                self.statistics["source_ports"].get(src_port, 0) + 1
            )

        # Destination Port
        dst_port = packet_info.get("destination_port")
        if dst_port is not None:
            self.statistics["destination_ports"][dst_port] = (
                self.statistics["destination_ports"].get(dst_port, 0) + 1
            )

        # Generate the unique ID for this packet
        packet_id = self.next_packet_id
        self.next_packet_id += 1

        # Cache raw packet mapped by ID
        self.raw_packets[packet_id] = raw_packet

        # Prune older packets to limit memory
        if len(self.raw_packets) > 1000:
            oldest_id = next(iter(self.raw_packets))
            self.raw_packets.pop(oldest_id)

        packet = {
            "id": packet_id,
            "timestamp": time.strftime("%H:%M:%S"),
            "source_ip": packet_info["source_ip"],
            "destination_ip": packet_info["destination_ip"],
            "protocol": packet_info["protocol"],
            "source_port": packet_info.get("source_port"),
            "destination_port": packet_info.get("destination_port"),
            "packet_size": packet_info["packet_size"],
            "ip_version": packet_info["ip_version"],
            "flags": packet_info.get("flags"),
            "info": packet_info.get("info")
        }

        self.recent_packets.appendleft(packet)

        # Buffer packet for batch DB insert
        self._packet_buffer.append(packet)

        # Flush if batch size reached OR flush interval elapsed
        now = time.time()
        if len(self._packet_buffer) >= self._flush_batch_size or \
                (now - self._last_flush_time) >= self._flush_interval:
            self._flush_packet_buffer()

        self.detector.analyze_packet(packet_info)

        # -------------------------------------------------
        # AI Detection (Every 5 Seconds)
        # -------------------------------------------------

        if self.ai_enabled:

            self.ml_packets.append(packet_info)

            current_time = time.time()

            if current_time - self.ml_window_start >= self.ml_window_duration:

                result = self.ai_detector.predict(
                    self.ml_packets
                )

                if result:
                    timestamp_now = time.strftime("%H:%M:%S")
                    
                    # Log trend details for both normal and anomaly
                    trend_entry = {
                        "timestamp": timestamp_now,
                        "prediction": result["prediction"],
                        "score": result["score"],
                        "threat_score": result["threat_score"],
                        "risk_level": result["risk_level"],
                        "confidence": result["confidence"],
                        "reasons": result["reasons"]
                    }
                    
                    self.ai_history.append(trend_entry)
                    if len(self.ai_history) > 200:
                        self.ai_history.pop(0)

                    try:
                        self.db.insert_ai_trend(self.session_id, trend_entry)
                    except Exception as db_err:
                        print(f"[Database Warning] Could not insert AI trend: {db_err}")

                    # If an anomaly is identified, generate alert
                    if result["prediction"] == "ANOMALY":
                        top_source = Counter(
                            p["source_ip"] for p in self.ml_packets
                        ).most_common(1)

                        source_ip = (
                            top_source[0][0]
                            if top_source
                            else "Unknown"
                        )

                        alert_desc = f"AI Anomaly Alert: {', '.join(result['reasons'])} (Threat Score: {result['threat_score']}%)"
                        severity_level = "CRITICAL" if result["risk_level"] == "Critical" else "HIGH" if result["risk_level"] == "High" else "MEDIUM"

                        alert = {
                            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                            "severity": severity_level,
                            "type": "AI_ANOMALY",
                            "source_ip": source_ip,
                            "description": alert_desc
                        }

                        # Save in memory
                        self.detector.alerts.append(alert)

                        # Save in database
                        try:
                            self.db.insert_alert(
                                self.session_id,
                                alert
                            )
                        except Exception as db_err:
                            print(f"[Database Warning] Could not insert AI anomaly alert: {db_err}")

                        # Increment in-memory alert counter
                        self._total_alerts_count += 1

                        try:
                            print("\n")
                            print("=" * 70)
                            print("🤖 AI ANOMALY DETECTED")
                            print("=" * 70)
                            print(f"Threat Score: {result['threat_score']}% ({result['risk_level']} Risk)")
                            print(f"Confidence  : {result['confidence']}%")
                            print(f"Reasons     : {', '.join(result['reasons'])}")
                            print("=" * 70)
                        except UnicodeEncodeError:
                            print("\n")
                            print("=" * 70)
                            print("[AI ANOMALY] DETECTED")
                            print("=" * 70)
                            print(f"Threat Score: {result['threat_score']}% ({result['risk_level']} Risk)")
                            print(f"Confidence  : {result['confidence']}%")
                            print(f"Reasons     : {', '.join(result['reasons'])}")
                            print("=" * 70)

                # Reset the window
                self.ml_packets.clear()
                self.ml_window_start = current_time

    # -------------------------------------------------
    # Average Packet Size
    # -------------------------------------------------

    def get_average_packet_size(self):

        if self.statistics["total_packets"] == 0:
            return 0

        return round(
            self.statistics["total_bytes"] /
            self.statistics["total_packets"], 2
        )

    # -------------------------------------------------
    # Packet Rate
    # -------------------------------------------------

    def get_packet_rate(self):

        elapsed = time.time() - self.start_time

        if elapsed <= 0:
            return 0

        return round(
            self.statistics["total_packets"] / elapsed,
            2
        )

    # -------------------------------------------------
    # Bandwidth
    # -------------------------------------------------

    def get_bandwidth(self):

        elapsed = time.time() - self.start_time

        if elapsed <= 0:
            return 0

        return round(
            self.statistics["total_bytes"] / elapsed,
            2
        )

    # -------------------------------------------------
    # Top Source IP
    # -------------------------------------------------

    def get_top_source_ip(self):

        if not self.statistics["source_ips"]:
            return None

        return max(
            self.statistics["source_ips"],
            key=self.statistics["source_ips"].get
        )

    # -------------------------------------------------
    # Top Destination IP
    # -------------------------------------------------

    def get_top_destination_ip(self):

        if not self.statistics["destination_ips"]:
            return None

        return max(
            self.statistics["destination_ips"],
            key=self.statistics["destination_ips"].get
        )

    # -------------------------------------------------
    # Top Source Port
    # -------------------------------------------------

    def get_top_source_port(self):

        if not self.statistics["source_ports"]:
            return None

        return max(
            self.statistics["source_ports"],
            key=self.statistics["source_ports"].get
        )

    # -------------------------------------------------
    # Top Destination Port
    # -------------------------------------------------

    def get_top_destination_port(self):

        if not self.statistics["destination_ports"]:
            return None

        return max(
            self.statistics["destination_ports"],
            key=self.statistics["destination_ports"].get
        )

    # -------------------------------------------------
    # Display Statistics
    # -------------------------------------------------

    def display_statistics(self):

        print("\n" + "=" * 70)
        print("          AI NETWORK TRAFFIC ANALYZER")
        print("=" * 70)

        print(f"Total Packets       : {self.statistics['total_packets']}")
        print(f"Total Bytes         : {self.statistics['total_bytes']}")
        print(f"Average Packet Size : {self.get_average_packet_size()} Bytes")
        print(f"Packet Rate         : {self.get_packet_rate()} packets/sec")
        print(f"Bandwidth           : {self.get_bandwidth()} Bytes/sec")

        print("\nProtocol Counts")
        print("-" * 70)

        total = self.statistics["total_packets"]

        for protocol, count in self.statistics["protocols"].items():

            percentage = (count / total * 100) if total else 0

            print(
                f"{protocol:<10}: {count:<8} ({percentage:.2f}%)"
            )

        print("\nIP Versions")
        print("-" * 70)

        for version, count in self.statistics["ip_versions"].items():
            print(f"{version:<10}: {count}")

        src = self.get_top_source_ip()

        print("\nTop Source IP")
        print("-" * 70)

        if src:
            print(f"{src} ({self.statistics['source_ips'][src]} packets)")
        else:
            print("No Data")

        dst = self.get_top_destination_ip()

        print("\nTop Destination IP")
        print("-" * 70)

        if dst:
            print(f"{dst} ({self.statistics['destination_ips'][dst]} packets)")
        else:
            print("No Data")

        sport = self.get_top_source_port()

        print("\nTop Source Port")
        print("-" * 70)

        if sport is not None:
            print(f"{sport} ({self.statistics['source_ports'][sport]} packets)")
        else:
            print("No Data")

        dport = self.get_top_destination_port()

        print("\nTop Destination Port")
        print("-" * 70)

        if dport is not None:
            print(f"{dport} ({self.statistics['destination_ports'][dport]} packets)")
        else:
            print("No Data")

        print("=" * 70)

    # -------------------------------------------------
    # Reset Statistics
    # -------------------------------------------------

    def reset_statistics(self):
        self.__init__()
    
    #Protocol
    def get_protocol_statistics(self):

        total = self.statistics["total_packets"]

        result = {}

        for protocol, count in self.statistics["protocols"].items():

            percentage = 0

            if total > 0:
                percentage = round((count / total) * 100, 2)

            result[protocol] = {
                "count": count,
                "percentage": percentage
            }

        return result

    #Ip version
    def get_ip_version_statistics(self):
        return self.statistics["ip_versions"]

    #Top ips
    def get_top_ips(self):

        return {

            "top_source_ip": self.get_top_source_ip(),

            "top_destination_ip": self.get_top_destination_ip()

        }

    #Top ports
    def get_top_ports(self):

        return {

            "top_source_port": self.get_top_source_port(),

            "top_destination_port": self.get_top_destination_port()

        }

    #Metrics
    def get_metrics(self):

        return {

            "total_packets": self.statistics["total_packets"],

            "total_bytes": self.statistics["total_bytes"],

            "average_packet_size": self.get_average_packet_size(),

            "packet_rate": self.get_packet_rate(),

            "bandwidth": self.get_bandwidth()

        }

    def get_recent_packets(self):

        return list(self.recent_packets)

    def _on_new_alert(self, alert):
        """Called by ThreatDetector whenever a new (non-duplicate) alert fires."""
        self._total_alerts_count += 1

    def _flush_packet_buffer(self):
        """Flush buffered packets to the database in one bulk INSERT.
        On failure, packets are kept in the buffer and retried on next flush.
        """
        if not self._packet_buffer:
            return
        to_flush = self._packet_buffer[:]
        self._packet_buffer.clear()
        self._last_flush_time = time.time()
        try:
            self.db.insert_packets_bulk(self.session_id, to_flush)
        except Exception as e:
            print(f"[Buffer Flush Error] {e} — {len(to_flush)} packets will be retried")
            # Put packets back so they aren't lost
            self._packet_buffer = to_flush + self._packet_buffer

    def close_session(self):

        self.running = False

        # Flush any remaining buffered packets before closing
        self._flush_packet_buffer()

        self.db.end_session(

            self.session_id,

            time.strftime("%Y-%m-%d %H:%M:%S"),

            self.statistics["total_packets"]

        )

        self.db.close()

    def export_current_session(self):

        packets = self.db.get_packets_by_session(
            self.session_id
        )

        filename = os.path.join(self.captures_dir, f"session_{self.session_id}.csv")

        return self.exporter.export_packets_to_csv(
            packets,
            filename
        )

    def export_current_pcap(self):

        # The raw PCAP is already written in real-time by the Scapy PcapWriter.
        # We just return this file path directly to prevent overwriting/corrupting it.
        return self.capture_file


# -------------------------------------------------
# AI Statistics
# -------------------------------------------------

    def get_ai_statistics(self):

        return {
            "model": "Isolation Forest",
            "status": "Loaded",
            "window_duration": self.ml_window_duration,
            "detections": len(self.ai_history)
        }

    def get_security_statistics(self):
        # Use DB total for historical alerts (covers all past sessions)
        # and add current session's in-memory count on top
        db_total = 0
        try:
            db_total = self.db.total_alerts()
        except Exception:
            pass
        return {
            "total_alerts": db_total,
            "current_session": len(self.detector.get_alerts())
        }

    # -------------------------------------------------
    # AI History
    # -------------------------------------------------

    def get_ai_history(self):

        return self.ai_history