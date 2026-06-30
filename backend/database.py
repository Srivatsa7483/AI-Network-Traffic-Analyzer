import sqlite3
import threading


class SQLiteManager:

    def __init__(self, db_name="network_analyzer.db"):

        self.connection = sqlite3.connect(
            db_name,
            check_same_thread=False
        )

        self.lock = threading.Lock()

        self.closed = False

        self.create_tables()

    # ----------------------------------------------------

    def create_tables(self):

        with self.lock:

            cursor = self.connection.cursor()

            try:

                # Packets Table
                cursor.execute("""

                CREATE TABLE IF NOT EXISTS packets(

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    session_id INTEGER,

                    timestamp TEXT,

                    source_ip TEXT,

                    destination_ip TEXT,

                    protocol TEXT,

                    source_port INTEGER,

                    destination_port INTEGER,

                    packet_size INTEGER,

                    ip_version TEXT

                )

                """)

                # Auto-migration: check if session_id column exists
                cursor.execute("PRAGMA table_info(packets)")

                columns = [row[1] for row in cursor.fetchall()]

                if columns and "session_id" not in columns:

                    cursor.execute("ALTER TABLE packets ADD COLUMN session_id INTEGER")

                # Sessions Table
                cursor.execute("""

                CREATE TABLE IF NOT EXISTS sessions(

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    start_time TEXT,

                    end_time TEXT,

                    total_packets INTEGER,

                    status TEXT

                )

                """)

                # Alerts Table
                cursor.execute("""

                CREATE TABLE IF NOT EXISTS alerts(

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    session_id INTEGER,

                    timestamp TEXT,

                    severity TEXT,

                    threat_type TEXT,

                    source_ip TEXT,

                    description TEXT

                )

                """)

                # Users Table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT DEFAULT 'Analyst',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """)

                self.connection.commit()

            finally:

                cursor.close()

    # ----------------------------------------------------

    def create_session(self, start_time):

        with self.lock:

            cursor = self.connection.cursor()

            try:

                # Auto-cleanup: Mark any old running sessions as aborted/completed and count packets
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

                INSERT INTO sessions(

                    start_time,

                    end_time,

                    total_packets,

                    status

                )

                VALUES(?,?,?,?)

                """,

                (

                    start_time,

                    None,

                    0,

                    "Running"

                )

                )

                self.connection.commit()

                return cursor.lastrowid

            finally:

                cursor.close()

    # ----------------------------------------------------

    def end_session(self, session_id, end_time, total_packets):

        with self.lock:

            if self.closed:

                return

            cursor = self.connection.cursor()

            try:

                cursor.execute("""

                UPDATE sessions

                SET

                    end_time=?,

                    total_packets=?,

                    status=?

                WHERE id=?

                """,

                (

                    end_time,

                    total_packets,

                    "Completed",

                    session_id

                )

                )

                self.connection.commit()

            finally:

                cursor.close()

    # ----------------------------------------------------

    def insert_packet(self, session_id, packet):

        with self.lock:

            if self.closed:

                return

            cursor = self.connection.cursor()

            try:

                cursor.execute("""

                INSERT INTO packets(

                    session_id,

                    timestamp,

                    source_ip,

                    destination_ip,

                    protocol,

                    source_port,

                    destination_port,

                    packet_size,

                    ip_version,

                    flags,

                    info

                )

                VALUES(?,?,?,?,?,?,?,?,?,?,?)

                """,

                (

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

                )

                )

                self.connection.commit()

            finally:

                cursor.close()

    # ----------------------------------------------------

    def get_recent_packets(self, limit=100):

        with self.lock:

            cursor = self.connection.cursor()

            try:

                cursor.execute("""

                SELECT *

                FROM packets

                ORDER BY id DESC

                LIMIT ?

                """, (limit,))

                return cursor.fetchall()

            finally:

                cursor.close()

    # ----------------------------------------------------

    def get_sessions(self):

        with self.lock:

            cursor = self.connection.cursor()

            try:

                cursor.execute("""

                SELECT *

                FROM sessions

                ORDER BY id DESC

                """)

                return cursor.fetchall()

            finally:

                cursor.close()

    # ----------------------------------------------------

    def close(self):

        with self.lock:

            self.connection.close()

            self.closed = True

    # ----------------------------------------------------

    def migrate_database(self):

        with self.lock:

            if self.closed:

                return

            cursor = self.connection.cursor()

            try:

                cursor.execute("PRAGMA table_info(packets)")

                columns = [row[1] for row in cursor.fetchall()]

                if "flags" not in columns:

                    cursor.execute("ALTER TABLE packets ADD COLUMN flags TEXT")

                if "info" not in columns:

                    cursor.execute("ALTER TABLE packets ADD COLUMN info TEXT")

                self.connection.commit()

            except Exception as e:

                print(f"[Database Error] Migration failed: {e}")

            finally:

                cursor.close()

    # ----------------------------------------------------

    def delete_session(self, session_id):

        with self.lock:

            if self.closed:

                return False

            cursor = self.connection.cursor()

            try:

                # Delete alerts associated with session
                cursor.execute("DELETE FROM alerts WHERE session_id = ?", (session_id,))

                # Delete packets associated with session
                cursor.execute("DELETE FROM packets WHERE session_id = ?", (session_id,))

                # Delete session itself
                cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))

                self.connection.commit()

                return True

            except Exception as e:

                print(f"[Database Error] Deleting session #{session_id} failed: {e}")

                return False

            finally:

                cursor.close()

    # ----------------------------------------------------

    def get_packets_by_session(self, session_id):

        with self.lock:

            cursor = self.connection.cursor()

            try:

                cursor.execute("""

                SELECT *

                FROM packets

                WHERE session_id=?

                ORDER BY id

                """,

                (session_id,))

                return cursor.fetchall()

            finally:

                cursor.close()

    # ----------------------------------------------------

    def insert_alert(self, session_id, alert):

        with self.lock:

            if self.closed:

                return

            cursor = self.connection.cursor()

            try:

                cursor.execute("""

                INSERT INTO alerts(

                    session_id,

                    timestamp,

                    severity,

                    threat_type,

                    source_ip,

                    description

                )

                VALUES(?,?,?,?,?,?)

                """,

                (

                    session_id,

                    alert["timestamp"],

                    alert["severity"],

                    alert["type"],

                    alert["source_ip"],

                    alert["description"]

                )

                )

                self.connection.commit()

            finally:

                cursor.close()

    # ----------------------------------------------------

    def get_alerts(self):

        with self.lock:

            cursor = self.connection.cursor()

            try:

                cursor.execute("""

                SELECT *

                FROM alerts

                ORDER BY id DESC

                """)

                return cursor.fetchall()

            finally:

                cursor.close()

    # ----------------------------------------------------

    def get_alert_summary(self):

        with self.lock:

            cursor = self.connection.cursor()

            try:

                cursor.execute("""

                SELECT

                    threat_type,

                    COUNT(*)

                FROM alerts

                GROUP BY threat_type

                ORDER BY COUNT(*) DESC

                """)

                rows = cursor.fetchall()

                summary = {}

                for row in rows:

                    summary[row[0]] = row[1]

                return summary

            finally:

                cursor.close()

    # ----------------------------------------------------

    def get_session_alerts(self, session_id):

        with self.lock:

            cursor = self.connection.cursor()

            try:

                cursor.execute("""

                SELECT *

                FROM alerts

                WHERE session_id=?

                ORDER BY id DESC

                """,

                (session_id,))

                return cursor.fetchall()

            finally:

                cursor.close()

    # ----------------------------------------------------

    def total_alerts(self):

        with self.lock:

            cursor = self.connection.cursor()

            try:

                cursor.execute("""

                SELECT COUNT(*)

                FROM alerts

                """)

                return cursor.fetchone()[0]

            finally:

                cursor.close()

    # ----------------------------------------------------

    def health_check(self):
        try:
            with self.lock:
                cursor = self.connection.cursor()
                try:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
                finally:
                    cursor.close()
            return {"status": "healthy", "type": "sqlite"}
        except Exception as e:
            return {"status": "unhealthy", "type": "sqlite", "error": str(e)}

    # ----------------------------------------------------
    # User Operations for Authentication
    # ----------------------------------------------------

    def create_user(self, username, email, password_hash, role='Analyst'):
        with self.lock:
            cursor = self.connection.cursor()
            try:
                cursor.execute("""
                INSERT INTO users (username, email, password_hash, role)
                VALUES (?, ?, ?, ?)
                """, (username, email, password_hash, role))
                self.connection.commit()
                return cursor.lastrowid
            except sqlite3.IntegrityError:
                raise ValueError("Username or email already exists")
            finally:
                cursor.close()

    def get_user_by_username(self, username):
        with self.lock:
            cursor = self.connection.cursor()
            try:
                cursor.execute("""
                SELECT id, username, email, password_hash, role, created_at
                FROM users
                WHERE username = ?
                """, (username,))
                return cursor.fetchone()
            finally:
                cursor.close()

    def get_user_by_id(self, user_id):
        with self.lock:
            cursor = self.connection.cursor()
            try:
                cursor.execute("""
                SELECT id, username, email, password_hash, role, created_at
                FROM users
                WHERE id = ?
                """, (user_id,))
                return cursor.fetchone()
            finally:
                cursor.close()

    def update_user_profile(self, user_id, username, email):
        with self.lock:
            cursor = self.connection.cursor()
            try:
                cursor.execute("""
                UPDATE users
                SET username = ?, email = ?
                WHERE id = ?
                """, (username, email, user_id))
                self.connection.commit()
                return True
            except sqlite3.IntegrityError:
                raise ValueError("Username or email already exists")
            finally:
                cursor.close()


class DatabaseManager:
    """
    Transparent factory wrapper that selects SQLiteManager or PostgreSQLManager
    based on configuration. Routes all method calls automatically.
    """
    def __init__(self):
        import config
        if config.DB_TYPE == "postgres":
            from postgres_manager import PostgreSQLManager
            self._db = PostgreSQLManager(config.DATABASE_URL)
        else:
            self._db = SQLiteManager()

    def __getattr__(self, name):
        return getattr(self._db, name)