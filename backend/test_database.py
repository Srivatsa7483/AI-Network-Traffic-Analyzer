from database import DatabaseManager

db = DatabaseManager()

session_id = db.create_session("12:00:00")

packet = {

    "timestamp":"12:00:00",

    "source_ip":"192.168.1.10",

    "destination_ip":"8.8.8.8",

    "protocol":"UDP",

    "source_port":50000,

    "destination_port":53,

    "packet_size":84,

    "ip_version":"IPv4"

}

db.insert_packet(session_id, packet)

print(db.get_recent_packets())