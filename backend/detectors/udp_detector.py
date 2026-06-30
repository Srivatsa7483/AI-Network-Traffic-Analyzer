"""
UDP Traffic Detector
"""


class UDPDetector:

    def __init__(self):

        self.total = 0

        self.udp = 0

        self.threshold = 90

    # --------------------------------------

    def detect(self, packet):

        self.total += 1

        if packet["protocol"] == "UDP":

            self.udp += 1

        if self.total < 100:

            return None

        percentage = (self.udp / self.total) * 100

        if percentage >= self.threshold:

            alert = {

                "severity": "MEDIUM",

                "type": "HIGH_UDP_TRAFFIC",

                "source_ip": packet["source_ip"],

                "description":
                    f"UDP traffic is {percentage:.2f}%"

            }

            self.total = 0

            self.udp = 0

            return alert

        return None