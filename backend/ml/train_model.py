import os
import joblib
from sklearn.ensemble import IsolationForest
import sys

# Add backend directory to path so we can import database and config
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import DatabaseManager

MODEL_DIR = os.path.join(BACKEND_DIR, "ml", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)


def load_packets():
    db = DatabaseManager()
    
    # Check if we are running SQLite or Postgres, and use the correct placeholder format
    import config
    param_style = "%s" if config.DB_TYPE == "postgres" else "?"

    with db.get_connection() as conn:
        with conn.cursor() as cursor:
            # Fetch only the latest 20,000 packets to prevent SSL timeouts over the internet.
            # We wrap it in an outer order by session_id, id so windowing works correctly.
            cursor.execute("""
            SELECT
                session_id,
                timestamp,
                source_ip,
                destination_ip,
                protocol,
                source_port,
                destination_port,
                packet_size,
                ip_version
            FROM (
                SELECT id, session_id, timestamp, source_ip, destination_ip, protocol,
                       source_port, destination_port, packet_size, ip_version
                FROM packets
                ORDER BY id DESC
                LIMIT 20000
            ) subquery
            ORDER BY session_id, id
            """)
            rows = cursor.fetchall()

    packets = []
    for r in rows:
        packets.append({
            "session_id": r[0],
            "timestamp": r[1],
            "source_ip": r[2],
            "destination_ip": r[3],
            "protocol": r[4],
            "source_port": r[5],
            "destination_port": r[6],
            "packet_size": r[7],
            "ip_version": r[8]
        })
    return packets



def time_to_seconds(t_str):
    try:
        parts = t_str.split(":")
        if len(parts) == 3:
            h, m, s = map(int, parts)
            return h * 3600 + m * 60 + s
    except Exception:
        pass
    return 0


def get_windows(packets):
    # Group by session_id
    sessions = {}
    for p in packets:
        sess_id = p["session_id"]
        if sess_id not in sessions:
            sessions[sess_id] = []
        sessions[sess_id].append(p)

    windows = []
    for sess_id, sess_packets in sessions.items():
        if not sess_packets:
            continue
        
        # Group into 5-second windows
        current_window = []
        start_time = time_to_seconds(sess_packets[0]["timestamp"])
        
        for p in sess_packets:
            t_sec = time_to_seconds(p["timestamp"])
            # If within 5 seconds window, group together
            if abs(t_sec - start_time) < 5:
                current_window.append(p)
            else:
                if len(current_window) >= 5: # Keep windows with at least 5 packets
                    windows.append(current_window)
                current_window = [p]
                start_time = t_sec
                
        if len(current_window) >= 5:
            windows.append(current_window)
            
    return windows


def train():
    print("=" * 60)
    print("Loading packet data...")
    print("=" * 60)

    packets = load_packets()
    print(f"Packets Loaded : {len(packets)}")

    if len(packets) < 1000:
        print("Collect at least 1000 packets before training.")
        return

    # Group into windows
    windows = get_windows(packets)
    print(f"Grouped into {len(windows)} traffic windows.")

    if len(windows) < 5:
        print("Not enough windows to train. Capture more packets.")
        return

    # Extract 10 features for each window
    from ml.feature_extractor import FeatureExtractor
    extractor = FeatureExtractor()
    X = []
    
    for w in windows:
        features = extractor.extract_window(w)
        if features:
            X.append(features)

    # Train Isolation Forest
    model = IsolationForest(
        n_estimators=200,
        contamination=0.02,
        random_state=42
    )

    print("\nTraining Isolation Forest on window telemetry...")
    model.fit(X)

    joblib.dump(model, MODEL_PATH)

    print("\n" + "=" * 60)
    print("MODEL TRAINED SUCCESSFULLY")
    print("=" * 60)
    print(f"Training Windows : {len(X)}")
    print(f"Model Saved      : {MODEL_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    train()