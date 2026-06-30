"""
packet_parser.py

Purpose:
    Parse Scapy packets and return structured packet information.

Author: Srivatsa
Project: AI Network Traffic Analyzer
"""

from scapy.layers.inet import IP, TCP, UDP, ICMP
from scapy.layers.inet6 import IPv6


def generate_info(packet):
    """
    Generate a human-readable Wireshark-style summary for the packet.
    """
    from scapy.layers.inet import TCP, UDP, ICMP
    from scapy.packet import Raw

    try:
        if packet.haslayer(TCP):
            tcp = packet[TCP]
            flags = str(tcp.flags)
            flag_list = []
            if "S" in flags: flag_list.append("SYN")
            if "A" in flags: flag_list.append("ACK")
            if "F" in flags: flag_list.append("FIN")
            if "R" in flags: flag_list.append("RST")
            if "P" in flags: flag_list.append("PSH")
            
            flag_str = "+".join(flag_list) if flag_list else flags
            
            # Simple HTTP / TLS Checks in payload
            if packet.haslayer(Raw):
                payload = bytes(packet[Raw].load)
                for method in [b"GET", b"POST", b"PUT", b"DELETE", b"HTTP"]:
                    if payload.startswith(method):
                        try:
                            line = payload.split(b"\r\n")[0].decode("utf-8", errors="ignore")
                            return f"HTTP {line}"
                        except Exception:
                            pass
                # TLS Client Hello check
                if len(payload) > 5 and payload[:2] == b"\x16\x03" and payload[5] == 0x01:
                    return "TLS Client Hello"

            return f"TCP: {tcp.sport} -> {tcp.dport} [{flag_str}] Seq={tcp.seq} Ack={tcp.ack}"

        elif packet.haslayer(UDP):
            udp = packet[UDP]
            try:
                from scapy.layers.dns import DNS
                if packet.haslayer(DNS):
                    dns = packet[DNS]
                    if dns.qr == 0:
                        qname = dns.qd.qname.decode("utf-8", errors="ignore") if dns.qd else "Unknown"
                        return f"DNS Query: {qname}"
                    else:
                        return "DNS Response"
            except Exception:
                pass

            if udp.sport == 123 or udp.dport == 123:
                return "NTP Time Sync"
            if udp.sport in [67, 68] or udp.dport in [67, 68]:
                return "DHCP Configuration"

            return f"UDP: {udp.sport} -> {udp.dport} Len={udp.len}"

        elif packet.haslayer(ICMP):
            icmp = packet[ICMP]
            if icmp.type == 8:
                return "ICMP Echo (ping) Request"
            elif icmp.type == 0:
                return "ICMP Echo (ping) Reply"
            elif icmp.type == 3:
                return "ICMP Destination Unreachable"
            return f"ICMP Type={icmp.type} Code={icmp.code}"

    except Exception:
        pass

    return "IP Traffic"


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
        "info": None
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
        packet_info["source_port"] = None
        packet_info["destination_port"] = None

    else:

        packet_info["protocol"] = "OTHER"

    # Generate Wireshark-style Info summary
    packet_info["info"] = generate_info(packet)

    return packet_info