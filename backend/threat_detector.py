"""
threat_detector.py

Detects suspicious network activities.

Author: Srivatsa
Project: AI Network Traffic Analyzer
"""

import time


class ThreatDetector:

    def __init__(self, db, session_id):

        self.db = db

        self.session_id = session_id

        self.port_activity = {}

        self.alerts = []

        self.PORT_THRESHOLD = 10

        self.TIME_WINDOW = 10

        self.syn_activity = {}

        self.SYN_THRESHOLD = 50
    # -------------------------------------------------

    def analyze_packet(self, packet_info):

        # Ignore packets without ports
        if packet_info.get("destination_port") is None:
            return

        source_ip = packet_info["source_ip"]
        destination_port = packet_info["destination_port"]

        current_time = time.time()

        # First packet from this source
        if source_ip not in self.port_activity:

            self.port_activity[source_ip] = {

                "ports": set(),

                "start_time": current_time

            }

        activity = self.port_activity[source_ip]

        # Window expired → reset
        if current_time - activity["start_time"] > self.TIME_WINDOW:

            activity["ports"].clear()

            activity["start_time"] = current_time

        # Add port
        activity["ports"].add(destination_port)

        # Detect Port Scan
        if len(activity["ports"]) >= self.PORT_THRESHOLD:

            alert = {

                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),

                "severity": "HIGH",

                "type": "PORT SCAN",

                "source_ip": source_ip,

                "description":
                    f"Accessed {len(activity['ports'])} unique ports "
                    f"in {self.TIME_WINDOW} seconds."

            }
            self.detect_syn_flood(packet_info)
            # Prevent duplicate alerts
            if alert not in self.alerts:

                self.alerts.append(alert)

                self.db.insert_alert(

    self.session_id,

    alert

)

                print("\n")
                print("=" * 70)
                print("⚠ PORT SCAN DETECTED")
                print("=" * 70)
                print(f"Source IP : {source_ip}")
                print(f"Ports     : {sorted(activity['ports'])}")
                print("=" * 70)

            # Reset after detection
            activity["ports"].clear()

            activity["start_time"] = current_time

    # -------------------------------------------------

    def get_alerts(self):

        return self.alerts

    # -------------------------------------------------

    def clear_alerts(self):

        self.alerts.clear()

    def detect_syn_flood(self, packet_info):

        if packet_info["protocol"] != "TCP":
            return

        flags = packet_info.get("flags")

        if flags != "S":
            return

        source_ip = packet_info["source_ip"]

        current_time = time.time()

        if source_ip not in self.syn_activity:

            self.syn_activity[source_ip] = {

            "count": 0,

            "start_time": current_time

        }

        activity = self.syn_activity[source_ip]

        if current_time - activity["start_time"] > self.TIME_WINDOW:

            activity["count"] = 0

            activity["start_time"] = current_time

            activity["count"] += 1

        if activity["count"] >= self.SYN_THRESHOLD:

            alert = {

            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),

            "severity": "HIGH",

            "type": "SYN FLOOD",

            "source_ip": source_ip,

            "description":
                f"{activity['count']} SYN packets in "
                f"{self.TIME_WINDOW} seconds."

        }

        self.alerts.append(alert)

        self.db.insert_alert(

            self.session_id,

            alert

        )

        print("\n")
        print("=" * 70)
        print("⚠ SYN FLOOD DETECTED")
        print("=" * 70)
        print(f"Source IP : {source_ip}")
        print(f"SYN Count : {activity['count']}")
        print("=" * 70)

        activity["count"] = 0

        activity["start_time"] = current_time