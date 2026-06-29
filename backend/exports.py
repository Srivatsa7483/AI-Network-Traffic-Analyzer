from scapy.all import wrpcap
import csv


class ExportManager:

    def export_packets_to_csv(self, packets, filename):

        with open(filename, "w", newline="", encoding="utf-8") as file:

            writer = csv.writer(file)

            writer.writerows(packets)

        return filename

    def export_pcap(self, packets, filename):

        wrpcap(filename, packets)

        return filename