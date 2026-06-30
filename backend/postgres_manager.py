import sys
import time
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager

class PostgreSQLManager:
    def __init__(self, database_url):
        self.database_url = database_url
        # Adjust URL if postgres:// is used instead of postgresql://
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://", 1)
        
        self.pool = None
        self.closed = False
        
        try:
            # ThreadedConnectionPool is safe for multi-threaded applications like this one
            self.pool = pool.ThreadedConnectionPool(
                minconn=2,
                maxconn=20,
                dsn=self.database_url
            )
            print("[Database] PostgreSQL Threaded Connection Pool initialized successfully.")
            self.create_tables()
        except Exception as e:
            print(f"[Database Error] Failed to initialize PostgreSQL pool: {e}", file=sys.stderr)
            raise e

    @contextmanager
    def get_connection(self):
        """Get a connection from the pool. If it's closed/broken, replace it."""
        if self.closed or not self.pool:
            raise Exception("PostgreSQL Manager is closed or uninitialized")

        conn = self.pool.getconn()
        try:
            # If the connection was closed externally, get a fresh one
            if conn.closed:
                self.pool.putconn(conn, close=True)
                conn = self.pool.getconn()
            yield conn
            conn.commit()
        except Exception as e:
            try:
                conn.rollback()
            except Exception:
                pass
            raise e
        finally:
            try:
                self.pool.putconn(conn)
            except Exception:
                pass  # Connection may already be returned; ignore

    def create_tables(self):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Create Packets Table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS packets (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER,
                    timestamp VARCHAR(50),
                    source_ip VARCHAR(100),
                    destination_ip VARCHAR(100),
                    protocol VARCHAR(20),
                    source_port INTEGER,
                    destination_port INTEGER,
                    packet_size INTEGER,
                    ip_version VARCHAR(10),
                    flags VARCHAR(50),
                    info TEXT
                )
                """)

                # Create Sessions Table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id SERIAL PRIMARY KEY,
                    start_time VARCHAR(50),
                    end_time VARCHAR(50),
                    total_packets INTEGER,
                    status VARCHAR(20)
                )
                """)

                # Create Alerts Table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER,
                    timestamp VARCHAR(50),
                    severity VARCHAR(20),
                    threat_type VARCHAR(50),
                    source_ip VARCHAR(100),
                    description TEXT
                )
                """)

                # Create Users Table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(80) UNIQUE NOT NULL,
                    email VARCHAR(120) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(20) DEFAULT 'Analyst',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """)

    def create_session(self, start_time):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Mark any old running sessions as completed and calculate their final packet count
                cursor.execute("""
                UPDATE sessions
                SET status = 'Completed', 
                    end_time = 'Abrupt Shutdown',
                    total_packets = (
                        SELECT COUNT(*) 
                        FROM packets 
                        WHERE packets.session_id = sessions.id
                    )
                WHERE status = 'Running'
                """)
                
                cursor.execute("""
                INSERT INTO sessions (start_time, end_time, total_packets, status)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """, (start_time, None, 0, "Running"))
                
                session_id = cursor.fetchone()[0]
                return session_id

    def end_session(self, session_id, end_time, total_packets):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                UPDATE sessions
                SET end_time = %s, total_packets = %s, status = 'Completed'
                WHERE id = %s
                """, (end_time, total_packets, session_id))

    def insert_packet(self, session_id, packet):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                INSERT INTO packets (
                    session_id, timestamp, source_ip, destination_ip, protocol,
                    source_port, destination_port, packet_size, ip_version, flags, info
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    session_id,
                    packet["timestamp"],
                    packet["source_ip"],
                    packet["destination_ip"],
                    packet["protocol"],
                    packet.get("source_port"),
                    packet.get("destination_port"),
                    packet["packet_size"],
                    packet["ip_version"],
                    packet.get("flags"),
                    packet.get("info")
                ))

    def insert_packets_bulk(self, session_id, packets):
        """Batch insert a list of packets in a single DB round-trip."""
        if not packets:
            return
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                rows = [
                    (
                        session_id,
                        p["timestamp"],
                        p["source_ip"],
                        p["destination_ip"],
                        p["protocol"],
                        p.get("source_port"),
                        p.get("destination_port"),
                        p["packet_size"],
                        p["ip_version"],
                        p.get("flags"),
                        p.get("info")
                    )
                    for p in packets
                ]
                cursor.executemany("""
                INSERT INTO packets (
                    session_id, timestamp, source_ip, destination_ip, protocol,
                    source_port, destination_port, packet_size, ip_version, flags, info
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, rows)

    def get_recent_packets(self, limit=100):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT id, session_id, timestamp, source_ip, destination_ip, protocol,
                       source_port, destination_port, packet_size, ip_version, flags, info
                FROM packets
                ORDER BY id DESC
                LIMIT %s
                """, (limit,))
                return cursor.fetchall()

    def get_sessions(self):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT id, start_time, end_time, total_packets, status
                FROM sessions
                ORDER BY id DESC
                """)
                return cursor.fetchall()

    def close(self):
        if not self.closed:
            if self.pool:
                self.pool.closeall()
                print("[Database] PostgreSQL connection pool closed.")
            self.closed = True

    def migrate_database(self):
        # Check if columns flags & info exist, add them if missing
        # (Although table creation in PostgreSQL already includes them, we keep it for symmetry)
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check for flags column
                cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='packets' AND column_name='flags'
                """)
                if not cursor.fetchone():
                    cursor.execute("ALTER TABLE packets ADD COLUMN flags VARCHAR(50)")
                
                # Check for info column
                cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='packets' AND column_name='info'
                """)
                if not cursor.fetchone():
                    cursor.execute("ALTER TABLE packets ADD COLUMN info TEXT")

    def delete_session(self, session_id):
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Delete alerts associated with session
                    cursor.execute("DELETE FROM alerts WHERE session_id = %s", (session_id,))
                    # Delete packets associated with session
                    cursor.execute("DELETE FROM packets WHERE session_id = %s", (session_id,))
                    # Delete session itself
                    cursor.execute("DELETE FROM sessions WHERE id = %s", (session_id,))
                    return True
        except Exception as e:
            print(f"[Database Error] Deleting session #{session_id} failed: {e}", file=sys.stderr)
            return False

    def get_packets_by_session(self, session_id):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT id, session_id, timestamp, source_ip, destination_ip, protocol,
                       source_port, destination_port, packet_size, ip_version, flags, info
                FROM packets
                WHERE session_id = %s
                ORDER BY id
                """, (session_id,))
                return cursor.fetchall()

    def insert_alert(self, session_id, alert):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                INSERT INTO alerts (session_id, timestamp, severity, threat_type, source_ip, description)
                VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    session_id,
                    alert["timestamp"],
                    alert["severity"],
                    alert["type"],
                    alert["source_ip"],
                    alert["description"]
                ))

    def get_alerts(self):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT id, session_id, timestamp, severity, threat_type, source_ip, description
                FROM alerts
                ORDER BY id DESC
                """)
                return cursor.fetchall()

    def get_alert_summary(self):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT threat_type, COUNT(*)
                FROM alerts
                GROUP BY threat_type
                ORDER BY COUNT(*) DESC
                """)
                rows = cursor.fetchall()
                summary = {}
                for row in rows:
                    summary[row[0]] = row[1]
                return summary

    def get_session_alerts(self, session_id):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT id, session_id, timestamp, severity, threat_type, source_ip, description
                FROM alerts
                WHERE session_id = %s
                ORDER BY id DESC
                """, (session_id,))
                return cursor.fetchall()

    def total_alerts(self):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM alerts")
                return cursor.fetchone()[0]

    def health_check(self):
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
            return {"status": "healthy", "type": "postgres"}
        except Exception as e:
            return {"status": "unhealthy", "type": "postgres", "error": str(e)}

    # ----------------------------------------------------
    # User Operations for Authentication
    # ----------------------------------------------------

    def create_user(self, username, email, password_hash, role='Analyst'):
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                    INSERT INTO users (username, email, password_hash, role, created_at)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                    RETURNING id
                    """, (username, email, password_hash, role))
                    user_id = cursor.fetchone()[0]
                    return user_id
        except psycopg2.IntegrityError as e:
            raise ValueError("Username or email already exists")

    def get_user_by_username(self, username):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT id, username, email, password_hash, role, created_at
                FROM users
                WHERE username = %s
                """, (username,))
                return cursor.fetchone()

    def get_user_by_id(self, user_id):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT id, username, email, password_hash, role, created_at
                FROM users
                WHERE id = %s
                """, (user_id,))
                return cursor.fetchone()

    def update_user_profile(self, user_id, username, email):
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                    UPDATE users
                    SET username = %s, email = %s
                    WHERE id = %s
                    """, (username, email, user_id))
                    return True
        except psycopg2.IntegrityError as e:
            raise ValueError("Username or email already exists")
