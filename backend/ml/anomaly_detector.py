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

        prediction = self.model.predict(
            [features]
        )[0]

        score = self.model.decision_function(
            [features]
        )[0]

        if prediction == -1:

            return {

                "prediction": "ANOMALY",

                "score": float(score)

            }

        return {

            "prediction": "NORMAL",

            "score": float(score)

        }