import unittest
import sys
import os

# Adjust import path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from packet_filter import PacketFilter, filter_packets

class TestPacketFilter(unittest.TestCase):
    def setUp(self):
        self.packets = [
            {
                "id": 1,
                "source_ip": "192.168.1.15",
                "destination_ip": "8.8.8.8",
                "protocol": "TCP",
                "source_port": 54321,
                "destination_port": 443,
                "packet_size": 1200,
                "info": "TCP: 54321 -> 443 [SYN] Seq=123456"
            },
            {
                "id": 2,
                "source_ip": "192.168.1.20",
                "destination_ip": "1.1.1.1",
                "protocol": "UDP",
                "source_port": 60001,
                "destination_port": 53,
                "packet_size": 85,
                "info": "DNS Query: google.com"
            },
            {
                "id": 3,
                "source_ip": "8.8.8.8",
                "destination_ip": "192.168.1.15",
                "protocol": "ICMP",
                "source_port": None,
                "destination_port": None,
                "packet_size": 64,
                "info": "ICMP Echo (ping) Reply"
            },
            {
                "id": 4,
                "source_ip": "192.168.1.15",
                "destination_ip": "142.250.190.46",
                "protocol": "TCP",
                "source_port": 49152,
                "destination_port": 80,
                "packet_size": 150,
                "info": "HTTP GET /index.html"
            }
        ]

    def test_protocol_filters(self):
        # TCP
        tcp_res = filter_packets(self.packets, "tcp")
        self.assertEqual(len(tcp_res), 2)
        self.assertEqual(tcp_res[0]["id"], 1)
        self.assertEqual(tcp_res[1]["id"], 4)

        # UDP
        udp_res = filter_packets(self.packets, "udp")
        self.assertEqual(len(udp_res), 1)
        self.assertEqual(udp_res[0]["id"], 2)

        # DNS
        dns_res = filter_packets(self.packets, "dns")
        self.assertEqual(len(dns_res), 1)
        self.assertEqual(dns_res[0]["id"], 2)

        # HTTP
        http_res = filter_packets(self.packets, "http")
        self.assertEqual(len(http_res), 1)
        self.assertEqual(http_res[0]["id"], 4)

    def test_ip_filters(self):
        # ip.src
        src_res = filter_packets(self.packets, "ip.src == 192.168.1.15")
        self.assertEqual(len(src_res), 2)

        # ip.dst
        dst_res = filter_packets(self.packets, "ip.dst == 8.8.8.8")
        self.assertEqual(len(dst_res), 1)
        self.assertEqual(dst_res[0]["id"], 1)

    def test_port_filters(self):
        # port matching src/dst
        port_res = filter_packets(self.packets, "port == 443")
        self.assertEqual(len(port_res), 1)
        self.assertEqual(port_res[0]["id"], 1)

        port_80_res = filter_packets(self.packets, "port == 80")
        self.assertEqual(len(port_80_res), 1)
        self.assertEqual(port_80_res[0]["id"], 4)

    def test_length_filters(self):
        # length >
        len_res = filter_packets(self.packets, "length > 500")
        self.assertEqual(len(len_res), 1)
        self.assertEqual(len_res[0]["id"], 1)

        # length <
        len_lt_res = filter_packets(self.packets, "len < 100")
        self.assertEqual(len(len_lt_res), 2)

    def test_logical_operators(self):
        # and
        and_res = filter_packets(self.packets, "tcp and port == 80")
        self.assertEqual(len(and_res), 1)
        self.assertEqual(and_res[0]["id"], 4)

        # or
        or_res = filter_packets(self.packets, "udp or icmp")
        self.assertEqual(len(or_res), 2)

        # mixed grouping with parens
        mixed_res = filter_packets(self.packets, "tcp and (port == 443 or port == 80)")
        self.assertEqual(len(mixed_res), 2)

    def test_invalid_syntax_fallback(self):
        # If syntax is invalid, it should fall back to a text search matching info
        fallback_res = filter_packets(self.packets, "ping")
        self.assertEqual(len(fallback_res), 1)
        self.assertEqual(fallback_res[0]["id"], 3)


if __name__ == "__main__":
    unittest.main()
