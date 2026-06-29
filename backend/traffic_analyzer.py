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



class TrafficAnalyzer:

    def __init__(self):

        self.start_time = time.time()

        self.db = DatabaseManager()

        self.session_id = self.db.create_session(
            time.strftime("%Y-%m-%d %H:%M:%S")
        )
        self.detector = ThreatDetector(

    self.db,

    self.session_id

)

        # Get absolute path to the project root captures folder
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(backend_dir)
        self.captures_dir = os.path.join(project_root, "captures")
        os.makedirs(self.captures_dir, exist_ok=True)

        self.capture_file = os.path.join(self.captures_dir, f"session_{self.session_id}.pcap")

        self.recent_packets = deque(maxlen=100)

        self.exporter = ExportManager()

        self.raw_packets = deque(maxlen=5000)

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

    def update_statistics(self, packet_info):

        if packet_info is None:
            return

        self.statistics["total_packets"] += 1
        self.statistics["total_bytes"] += packet_info["packet_size"]

        # Protocol
        protocol = packet_info.get("protocol", "OTHER")

        if protocol in self.statistics["protocols"]:
            self.statistics["protocols"][protocol] += 1
        else:
            self.statistics["protocols"]["OTHER"] += 1

        # IP Version
        ip_version = packet_info.get("ip_version")

        if ip_version in self.statistics["ip_versions"]:
            self.statistics["ip_versions"][ip_version] += 1

        # Source IP
        src_ip = packet_info.get("source_ip")

        if src_ip:
            self.statistics["source_ips"][src_ip] = (
                self.statistics["source_ips"].get(src_ip, 0) + 1
            )

        # Destination IP
        dst_ip = packet_info.get("destination_ip")

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

        packet = {

        "timestamp": time.strftime("%H:%M:%S"),

        "source_ip": packet_info["source_ip"],

        "destination_ip": packet_info["destination_ip"],

        "protocol": packet_info["protocol"],

        "source_port": packet_info.get("source_port"),

        "destination_port": packet_info.get("destination_port"),

        "packet_size": packet_info["packet_size"],

        "ip_version": packet_info["ip_version"]

    }

        self.recent_packets.appendleft(packet)
        self.db.insert_packet(
    self.session_id,
    packet
)
        self.detector.analyze_packet(packet_info)

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

    def close_session(self):

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

        filename = os.path.join(self.captures_dir, f"session_{self.session_id}.pcap")

        return self.exporter.export_pcap(

            list(self.raw_packets),

            filename

        )


    