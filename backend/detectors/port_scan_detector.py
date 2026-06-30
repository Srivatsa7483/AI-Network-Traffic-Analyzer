"""
Port Scan Detector
"""

import time


class PortScanDetector:

    def __init__(self):

        self.activity = {}

        self.threshold = 10

        self.window = 10

    # --------------------------------------

    def detect(self, packet):

        if packet.get("destination_port") is None:
            return None

        src = packet["source_ip"]

        port = packet["destination_port"]

        now = time.time()

        if src not in self.activity:

            self.activity[src] = {

                "ports": set(),

                "start": now

            }

        data = self.activity[src]

        if now - data["start"] > self.window:

            data["ports"].clear()

            data["start"] = now

        data["ports"].add(port)

        if len(data["ports"]) >= self.threshold:

            alert = {

                "severity": "HIGH",

                "type": "PORT_SCAN",

                "source_ip": src,

                "description":
                    f"Scanned {len(data['ports'])} ports in "
                    f"{self.window} seconds."

            }

            data["ports"].clear()

            data["start"] = now

            return alert

        return None