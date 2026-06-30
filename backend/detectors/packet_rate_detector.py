"""
Packet Rate Detector
"""

import time


class PacketRateDetector:

    def __init__(self):

        self.count = 0

        self.start = time.time()

        self.threshold = 5000

    # --------------------------------------

    def detect(self, packet):

        self.count += 1

        now = time.time()

        elapsed = now - self.start

        if elapsed < 1:

            return None

        rate = self.count / elapsed

        self.count = 0

        self.start = now

        if rate >= self.threshold:

            return {

                "severity": "HIGH",

                "type": "HIGH_PACKET_RATE",

                "source_ip": packet["source_ip"],

                "description":
                    f"{rate:.2f} packets/sec"

            }

        return None