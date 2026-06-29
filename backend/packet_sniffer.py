"""
packet_sniffer.py

Captures live packets, parses them, updates statistics,
and writes raw packets directly to a PCAP file.
"""

from scapy.all import sniff
from scapy.utils import PcapWriter

from packet_parser import parse_packet


def start_sniffer(analyzer):

    # Create PCAP writer for current session
    writer = PcapWriter(
        analyzer.capture_file,
        append=True,
        sync=True
    )

    def process_packet(packet):

        try:

            # Save raw packet directly to PCAP
            writer.write(packet)

            # Parse packet
            packet_info = parse_packet(packet)

            if packet_info:

                analyzer.update_statistics(packet_info)

        except Exception as e:

            print(f"[Packet Error] {e}")

    print("=" * 60)
    print("AI Network Traffic Analyzer")
    print("=" * 60)
    print("Packet Sniffer Started...")
    print(f"Saving Capture : {analyzer.capture_file}")
    print("Press CTRL + C to Stop")
    print("=" * 60)

    try:

        sniff(
            prn=process_packet,
            store=False
        )

    except KeyboardInterrupt:

        print("\nStopping Packet Capture...")

    finally:

        writer.close()

        print("PCAP File Saved Successfully.")