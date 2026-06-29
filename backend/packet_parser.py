"""
packet_parser.py

Purpose:
    Parse Scapy packets and return structured packet information.

Author: Srivatsa
Project: AI Network Traffic Analyzer
"""

from scapy.layers.inet import IP, TCP, UDP, ICMP
from scapy.layers.inet6 import IPv6


def parse_packet(packet):
    """
    Extract useful information from a packet.

    Parameters:
        packet : Scapy Packet

    Returns:
        dict containing packet information
        OR
        None if the packet is unsupported.
    """

    packet_info = {
        "ip_version": None,
        "source_ip": None,
        "destination_ip": None,
        "protocol": None,
        "source_port": None,
        "destination_port": None,
        "packet_size": len(packet),
        "flags": None,
    }

    # ---------------------------------------
    # IPv4
    # ---------------------------------------
    if packet.haslayer(IP):

        ip = packet[IP]

        packet_info["ip_version"] = "IPv4"
        packet_info["source_ip"] = ip.src
        packet_info["destination_ip"] = ip.dst

    # ---------------------------------------
    # IPv6
    # ---------------------------------------
    elif packet.haslayer(IPv6):

        ip = packet[IPv6]

        packet_info["ip_version"] = "IPv6"
        packet_info["source_ip"] = ip.src
        packet_info["destination_ip"] = ip.dst

    else:
        return None

    # ---------------------------------------
    # TCP
    # ---------------------------------------
    if packet.haslayer(TCP):

        tcp = packet[TCP]

        packet_info["protocol"] = "TCP"
        packet_info["source_port"] = tcp.sport
        packet_info["destination_port"] = tcp.dport
        packet_info["flags"] = str(tcp.flags)

    # ---------------------------------------
    # UDP
    # ---------------------------------------
    elif packet.haslayer(UDP):

        udp = packet[UDP]

        packet_info["protocol"] = "UDP"
        packet_info["source_port"] = udp.sport
        packet_info["destination_port"] = udp.dport

    # ---------------------------------------
    # ICMP
    # ---------------------------------------
    elif packet.haslayer(ICMP):

        icmp = packet[ICMP]

        packet_info["protocol"] = "ICMP"
        packet_info["type"] = icmp.type
        packet_info["code"] = icmp.code

    else:

        packet_info["protocol"] = "OTHER"

    return packet_info