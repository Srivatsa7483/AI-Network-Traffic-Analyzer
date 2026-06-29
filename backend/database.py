import sqlite3


class DatabaseManager:

    def __init__(self, db_name="network_analyzer.db"):

        self.connection = sqlite3.connect(
            db_name,
            check_same_thread=False
        )

        self.cursor = self.connection.cursor()

        self.create_tables()

    def create_tables(self):

        # Packets Table
        self.cursor.execute("""

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
        self.cursor.execute("PRAGMA table_info(packets)")
        columns = [row[1] for row in self.cursor.fetchall()]
        if columns and "session_id" not in columns:
            self.cursor.execute("ALTER TABLE packets ADD COLUMN session_id INTEGER")

        # Sessions Table
        self.cursor.execute("""

        CREATE TABLE IF NOT EXISTS sessions(

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            start_time TEXT,

            end_time TEXT,

            total_packets INTEGER,

            status TEXT

        )

        """)

        self.connection.commit()

        # Alerts Table
        self.cursor.execute("""

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

        self.connection.commit()

    # ----------------------------------------------------

    def create_session(self, start_time):

        self.cursor.execute("""

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

        return self.cursor.lastrowid

    # ----------------------------------------------------

    def end_session(self, session_id, end_time, total_packets):

        self.cursor.execute("""

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

    # ----------------------------------------------------

    def insert_packet(self, session_id, packet):

        self.cursor.execute("""

        INSERT INTO packets(

            session_id,

            timestamp,

            source_ip,

            destination_ip,

            protocol,

            source_port,

            destination_port,

            packet_size,

            ip_version

        )

        VALUES(?,?,?,?,?,?,?,?,?)

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

            packet["ip_version"]

        )

        )

        self.connection.commit()

    # ----------------------------------------------------

    def get_recent_packets(self, limit=100):

        self.cursor.execute("""

        SELECT *

        FROM packets

        ORDER BY id DESC

        LIMIT ?

        """, (limit,))

        return self.cursor.fetchall()

    # ----------------------------------------------------

    def get_sessions(self):

        self.cursor.execute("""

        SELECT *

        FROM sessions

        ORDER BY id DESC

        """)

        return self.cursor.fetchall()

    # ----------------------------------------------------

    def close(self):

        self.connection.close()

    def get_packets_by_session(self, session_id):

        self.cursor.execute("""

        SELECT *

        FROM packets

        WHERE session_id=?

        ORDER BY id

        """,

        (session_id,))

        return self.cursor.fetchall()

    # ----------------------------------------------------

    def insert_alert(self, session_id, alert):

        self.cursor.execute("""

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

    # ----------------------------------------------------

    def get_alerts(self):

        self.cursor.execute("""

        SELECT *

        FROM alerts

        ORDER BY id DESC

        """)

        return self.cursor.fetchall()