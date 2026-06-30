"""
Feature extractor for ML anomaly detection.
"""

from collections import Counter


class FeatureExtractor:

    def extract_window(self, packets):

        if not packets:
            return None

        total_packets = len(packets)

        total_bytes = sum(
            p["packet_size"]
            for p in packets
        )

        avg_size = total_bytes / total_packets

        protocols = Counter(
            p["protocol"]
            for p in packets
        )

        src_ips = len(set(
            p["source_ip"]
            for p in packets
        ))

        dst_ips = len(set(
            p["destination_ip"]
            for p in packets
        ))

        src_ports = len(set(
            p.get("source_port")
            for p in packets
        ))

        dst_ports = len(set(
            p.get("destination_port")
            for p in packets
        ))

        return [

            total_packets,

            total_bytes,

            avg_size,

            protocols.get("TCP", 0),

            protocols.get("UDP", 0),

            protocols.get("ICMP", 0),

            src_ips,

            dst_ips,

            src_ports,

            dst_ports

        ]