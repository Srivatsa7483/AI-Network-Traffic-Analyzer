"""
threat_detector.py

Central Threat Detection Engine

Author: Srivatsa
Project: AI Network Traffic Analyzer
"""

import time

from detectors.port_scan_detector import PortScanDetector
from detectors.syn_flood_detector import SynFloodDetector
from detectors.dns_detector import DNSDetector
from detectors.icmp_detector import ICMPDetector
from detectors.udp_detector import UDPDetector
from detectors.packet_rate_detector import PacketRateDetector


class ThreatDetector:

    # Severity Mapping
    SEVERITY = {
        "PORT_SCAN": "HIGH",
        "SYN_FLOOD": "CRITICAL",
        "DNS_FLOOD": "HIGH",
        "ICMP_FLOOD": "MEDIUM",
        "HIGH_UDP_TRAFFIC": "MEDIUM",
        "HIGH_PACKET_RATE": "CRITICAL"
    }

    # ----------------------------------------------------

    def __init__(self, db, session_id, on_alert=None):

        self.db = db
        self.session_id = session_id
        self.on_alert = on_alert  # optional callback: called after each alert is saved

        self.alerts = []

        # Prevent duplicate alerts
        self.last_alert = {}

        # Register all detectors
        self.detectors = [

            PortScanDetector(),

            SynFloodDetector(),

            DNSDetector(),

            ICMPDetector(),

            UDPDetector(),

            PacketRateDetector()

        ]

    # ----------------------------------------------------

    def analyze_packet(self, packet):

        """
        Send every packet to every detector.
        """

        for detector in self.detectors:

            alert = detector.detect(packet)

            if alert:

                # Add timestamp
                alert["timestamp"] = time.strftime(
                    "%Y-%m-%d %H:%M:%S"
                )

                # Ensure severity exists
                alert["severity"] = self.SEVERITY.get(
                    alert["type"],
                    "LOW"
                )

                key = (
                    alert["type"],
                    alert["source_ip"]
                )

                # Skip duplicate alerts
                if key in self.last_alert:
                    continue

                self.last_alert[key] = alert["timestamp"]

                # Store in memory
                self.alerts.append(alert)

                # Store in database
                self.db.insert_alert(
                    self.session_id,
                    alert
                )

                # Notify caller (e.g. increment in-memory counter)
                if self.on_alert:
                    self.on_alert(alert)

                # Print on terminal
                self.print_alert(alert)

    # ----------------------------------------------------

    def print_alert(self, alert):

        try:

            print("\n")
            print("=" * 70)
            print("🚨 THREAT DETECTED")
            print("=" * 70)
            print(f"Time        : {alert['timestamp']}")
            print(f"Type        : {alert['type']}")
            print(f"Severity    : {alert['severity']}")
            print(f"Source IP   : {alert['source_ip']}")
            print(f"Description : {alert['description']}")
            print("=" * 70)

        except UnicodeEncodeError:

            print("\n")
            print("=" * 70)
            print("[ALERT] THREAT DETECTED")
            print("=" * 70)
            print(f"Time        : {alert['timestamp']}")
            print(f"Type        : {alert['type']}")
            print(f"Severity    : {alert['severity']}")
            print(f"Source IP   : {alert['source_ip']}")
            print(f"Description : {alert['description']}")
            print("=" * 70)

    # ----------------------------------------------------

    def get_alerts(self):

        return self.alerts

    # ----------------------------------------------------

    def clear_alerts(self):

        self.alerts.clear()
        self.last_alert.clear()