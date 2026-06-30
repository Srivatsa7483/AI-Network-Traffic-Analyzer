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

            if getattr(analyzer, "paused", False):
                return

            # Save raw packet directly to PCAP
            writer.write(packet)

            # Parse packet
            packet_info = parse_packet(packet)

            if packet_info:

                analyzer.update_statistics(packet_info, packet)

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
            store=False,
            stop_filter=lambda pkt: not analyzer.running
        )

    except PermissionError:

        print("\n" + "=" * 60)
        print("[Sniffer Warning] Raw socket capture permissions (NET_RAW) are missing.")
        print("This is expected on cloud hosting environments (Render/Heroku/Vercel).")
        print("The backend will run in API/Demo Mode using existing database records.")
        print("=" * 60)

    except Exception as e:

        print(f"\n[Sniffer Warning] Could not start packet capture: {e}")

    finally:

        writer.close()

        print("PCAP File Saved Successfully.")