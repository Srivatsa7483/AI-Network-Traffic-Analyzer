import os
import sqlite3
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

def migrate():
    # Load environment variables
    load_dotenv()
    
    postgres_url = os.getenv("DATABASE_URL")
    sqlite_file = "network_analyzer.db"
    
    if not postgres_url or not (postgres_url.startswith("postgresql://") or postgres_url.startswith("postgres://")):
        print("[Migration Error] DATABASE_URL is not set or is not a PostgreSQL URL.")
        print("Please configure a valid PostgreSQL DATABASE_URL in your .env file.")
        return

    if not os.path.exists(sqlite_file):
        print(f"[Migration Warning] SQLite file '{sqlite_file}' not found. Nothing to migrate.")
        return

    print(f"Connecting to SQLite database: {sqlite_file}...")
    sqlite_conn = sqlite3.connect(sqlite_file)
    sqlite_cursor = sqlite_conn.cursor()

    # Adjust URL if postgres:// is used instead of postgresql://
    if postgres_url.startswith("postgres://"):
        postgres_url = postgres_url.replace("postgres://", "postgresql://", 1)

    print(f"Connecting to PostgreSQL database...")
    try:
        pg_conn = psycopg2.connect(postgres_url)
        pg_cursor = pg_conn.cursor()
    except Exception as e:
        print(f"[Migration Error] Failed to connect to PostgreSQL: {e}")
        sqlite_conn.close()
        return

    try:
        # 1. Fetch data from SQLite
        print("Fetching data from SQLite...")
        
        sqlite_cursor.execute("SELECT id, start_time, end_time, total_packets, status FROM sessions")
        sessions = sqlite_cursor.fetchall()
        
        sqlite_cursor.execute("SELECT id, session_id, timestamp, source_ip, destination_ip, protocol, source_port, destination_port, packet_size, ip_version, flags, info FROM packets")
        packets = sqlite_cursor.fetchall()
        
        sqlite_cursor.execute("SELECT id, session_id, timestamp, severity, threat_type, source_ip, description FROM alerts")
        alerts = sqlite_cursor.fetchall()
        
        print(f"Found: {len(sessions)} sessions, {len(packets)} packets, {len(alerts)} alerts in SQLite.")

        # 2. Insert into PostgreSQL using bulk batches to minimize network latency
        print("Migrating sessions to PostgreSQL...")
        execute_batch(pg_cursor, """
        INSERT INTO sessions (id, start_time, end_time, total_packets, status)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
        """, sessions, page_size=1000)
            
        print("Migrating packets to PostgreSQL (using optimized batch inserts)...")
        # page_size=5000 inserts 5,000 packets per network roundtrip
        execute_batch(pg_cursor, """
        INSERT INTO packets (id, session_id, timestamp, source_ip, destination_ip, protocol, source_port, destination_port, packet_size, ip_version, flags, info)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
        """, packets, page_size=5000)

        print("Migrating alerts to PostgreSQL...")
        execute_batch(pg_cursor, """
        INSERT INTO alerts (id, session_id, timestamp, severity, threat_type, source_ip, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
        """, alerts, page_size=1000)

        # 3. Reset primary key sequence generators in PostgreSQL
        print("Syncing primary key ID sequences in PostgreSQL...")
        tables = ["sessions", "packets", "alerts"]
        for table in tables:
            pg_cursor.execute(f"""
            SELECT setval(
                pg_get_serial_sequence('{table}', 'id'),
                COALESCE(MAX(id), 1),
                MAX(id) IS NOT NULL
            ) FROM {table}
            """)
            new_val = pg_cursor.fetchone()[0]
            print(f"  Sequence for '{table}' set to {new_val}")

        pg_conn.commit()
        print("🎉 Migration completed successfully!")

    except Exception as e:
        pg_conn.rollback()
        print(f"[Migration Error] Migration failed: {e}")
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate()
