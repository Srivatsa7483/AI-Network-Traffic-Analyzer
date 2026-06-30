"""
ICMP Flood Detector
"""

import time


class ICMPDetector:

    def __init__(self):

        self.activity = {}

        self.threshold = 100

        self.window = 10

    # --------------------------------------

    def detect(self, packet):

        if packet["protocol"] != "ICMP":
            return None

        src = packet["source_ip"]

        now = time.time()

        if src not in self.activity:

            self.activity[src] = {

                "count": 0,

                "start": now

            }

        data = self.activity[src]

        if now - data["start"] > self.window:

            data["count"] = 0

            data["start"] = now

        data["count"] += 1

        if data["count"] >= self.threshold:

            alert = {

                "severity": "HIGH",

                "type": "ICMP_FLOOD",

                "source_ip": src,

                "description":
                    f"{data['count']} ICMP packets in "
                    f"{self.window} seconds."

            }

            data["count"] = 0

            data["start"] = now

            return alert

        return None