"""
anomaly_detector.py

Loads the trained Isolation Forest model
and predicts anomalies.
"""

import os
import joblib

from ml.feature_extractor import FeatureExtractor


class AnomalyDetector:

    def __init__(self):

        base_dir = os.path.dirname(os.path.abspath(__file__))

        model_path = os.path.join(
            base_dir,
            "models",
            "isolation_forest.pkl"
        )

        self.model = joblib.load(model_path)

        self.extractor = FeatureExtractor()

        # Dynamic baseline for explainable comparison
        self.normal_averages = {
            "packet_rate": 15.0,  # packets per window
            "byte_rate": 5000.0,
            "avg_size": 350.0,
            "unique_src": 2.0,
            "unique_dst": 2.0,
            "src_ports": 3.0,
            "dst_ports": 3.0,
        }
        self.normal_count = 1

    # -----------------------------------------

    def predict(self, packets):

        """
        packets -> list of packet dictionaries
        """

        features = self.extractor.extract_window(
            packets
        )

        if features is None:
            return None

        # Extract individual feature values
        total_packets = features[0]
        total_bytes = features[1]
        avg_size = features[2]
        tcp_count = features[3]
        udp_count = features[4]
        icmp_count = features[5]
        src_ips = features[6]
        dst_ips = features[7]
        src_ports = features[8]
        dst_ports = features[9]

        prediction = self.model.predict(
            [features]
        )[0]

        score = self.model.decision_function(
            [features]
        )[0]

        # 1. Calibrate threat score percentage
        # decision_function score range is typically [-0.5, 0.5]
        if score >= 0.2:
            threat_score = max(0.0, 10.0 - (score - 0.2) * 50.0)
        elif score >= 0.0:
            # Scale score from [0.0, 0.2] to threat score [40.0, 10.0]
            threat_score = 40.0 - (score / 0.2) * 30.0
        elif score >= -0.15:
            # Scale score from [-0.15, 0.0] to threat score [75.0, 40.0]
            threat_score = 75.0 - ((score + 0.15) / 0.15) * 35.0
        else:
            # Scale score from [-0.5, -0.15] to threat score [100.0, 75.0]
            threat_score = min(100.0, 75.0 + ((-0.15 - score) / 0.35) * 25.0)

        # Round threat score
        threat_score = round(threat_score, 1)

        # Define Risk level
        if threat_score < 30.0:
            risk_level = "Low"
        elif threat_score < 60.0:
            risk_level = "Medium"
        elif threat_score < 85.0:
            risk_level = "High"
        else:
            risk_level = "Critical"

        # 2. Update running averages for normal traffic baseline
        if prediction == 1:
            self.normal_count += 1
            n = self.normal_count
            self.normal_averages["packet_rate"] = ((n-1)*self.normal_averages["packet_rate"] + total_packets) / n
            self.normal_averages["byte_rate"] = ((n-1)*self.normal_averages["byte_rate"] + total_bytes) / n
            self.normal_averages["avg_size"] = ((n-1)*self.normal_averages["avg_size"] + avg_size) / n
            self.normal_averages["unique_src"] = ((n-1)*self.normal_averages["unique_src"] + src_ips) / n
            self.normal_averages["unique_dst"] = ((n-1)*self.normal_averages["unique_dst"] + dst_ips) / n
            self.normal_averages["src_ports"] = ((n-1)*self.normal_averages["src_ports"] + src_ports) / n
            self.normal_averages["dst_ports"] = ((n-1)*self.normal_averages["dst_ports"] + dst_ports) / n

        # 3. Generate explainability reasons for threats
        reasons = []
        if prediction == -1 or threat_score >= 50.0:
            # Packet rate check
            if total_packets > 2.0 * self.normal_averages["packet_rate"]:
                rate_mult = total_packets / max(1.0, self.normal_averages["packet_rate"])
                reasons.append(f"Packet rate {rate_mult:.1f}x normal")
            
            # SYN Flood check
            syn_packets = sum(1 for p in packets if "S" in str(p.get("flags", "")))
            if syn_packets > 5:
                reasons.append("SYN packets unusually high")

            # Destination targets/port scans check
            if dst_ports > 1.8 * self.normal_averages["dst_ports"] and dst_ports > 3:
                reasons.append("Destination ports increased")
            if dst_ips > 1.8 * self.normal_averages["unique_dst"] and dst_ips > 3:
                reasons.append("Target destination IPs increased")
            
            # High volume of ICMP
            if icmp_count > 5:
                reasons.append("ICMP echo packets unusually high")
                
            # Default fallback reason
            if not reasons:
                reasons.append("Unusual protocol distribution pattern")
        else:
            reasons.append("Traffic pattern matches baseline activity")

        # 4. Calculate Confidence percentage
        confidence = 100.0 - abs(score) * 25.0
        confidence = round(min(98.0, max(85.0, confidence)), 1)

        result_type = "ANOMALY" if prediction == -1 else "NORMAL"

        return {
            "prediction": result_type,
            "score": float(score),
            "threat_score": float(threat_score),
            "risk_level": risk_level,
            "confidence": float(confidence),
            "reasons": reasons
        }