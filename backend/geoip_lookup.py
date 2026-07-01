import hashlib
import re

# Deterministic Mock Database of common public endpoints and regions
KNOWN_GEOLOCATIONS = {
    "8.8.8.8": {"country": "United States", "city": "Mountain View", "lat": 37.3860, "lon": -122.0838, "org": "Google LLC"},
    "8.8.4.4": {"country": "United States", "city": "Mountain View", "lat": 37.3860, "lon": -122.0838, "org": "Google LLC"},
    "1.1.1.1": {"country": "Australia", "city": "Sydney", "lat": -33.8688, "lon": 151.2093, "org": "Cloudflare Inc."},
    "1.0.0.1": {"country": "Australia", "city": "Sydney", "lat": -33.8688, "lon": 151.2093, "org": "Cloudflare Inc."},
    "9.9.9.9": {"country": "Switzerland", "city": "Zurich", "lat": 47.3769, "lon": 8.5417, "org": "Quad9"},
    "208.67.222.222": {"country": "United States", "city": "San Francisco", "lat": 37.7749, "lon": -122.4194, "org": "Cisco OpenDNS"},
}

GLOBAL_REGIONS = [
    {"country": "United States", "city": "New York", "lat": 40.7128, "lon": -74.0060, "org": "Amazon AWS"},
    {"country": "United States", "city": "Seattle", "lat": 47.6062, "lon": -122.3321, "org": "Microsoft Azure"},
    {"country": "United Kingdom", "city": "London", "lat": 51.5074, "lon": -0.1278, "org": "DigitalOcean LLC"},
    {"country": "Germany", "city": "Frankfurt", "lat": 50.1109, "lon": 8.6821, "org": "Linode LLC"},
    {"country": "Japan", "city": "Tokyo", "lat": 35.6762, "lon": 139.6503, "org": "Softbank Corp"},
    {"country": "Singapore", "city": "Singapore", "lat": 1.3521, "lon": 103.8198, "org": "Tencent Cloud"},
    {"country": "India", "city": "Mumbai", "lat": 19.0760, "lon": 72.8777, "org": "Tata Communications"},
    {"country": "Brazil", "city": "São Paulo", "lat": -23.5505, "lon": -46.6333, "org": "Equinix Inc."},
]

def is_private_ip(ip):
    """Check if an IP belongs to private subnet ranges."""
    if not ip or not isinstance(ip, str):
        return True
    
    # Check loopback, private ranges
    if ip == "127.0.0.1" or ip == "localhost" or ip.startswith("::"):
        return True
        
    private_regex = re.compile(
        r'^(10\.\d{1,3}\.\d{1,3}\.\d{1,3})|'
        r'(172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})|'
        r'(192\.168\.\d{1,3}\.\d{1,3})$'
    )
    return bool(private_regex.match(ip))

def lookup_ip(ip):
    """
    Looks up IP details locally. Falls back to a deterministic hash function 
    to map unknown public IPs to realistic world regions offline.
    """
    if not ip or not isinstance(ip, str):
        return None
        
    if is_private_ip(ip):
        return {
            "ip": ip,
            "private": True,
            "country": "Local Subnet",
            "city": "Intranet",
            "lat": None,
            "lon": None,
            "org": "Private Network Address"
        }
        
    # Check mock database first
    if ip in KNOWN_GEOLOCATIONS:
        res = KNOWN_GEOLOCATIONS[ip].copy()
        res["ip"] = ip
        res["private"] = False
        return res
        
    # Generate deterministic mock details using MD5 hash of the IP string
    ip_hash = hashlib.md5(ip.encode("utf-8")).hexdigest()
    hash_int = int(ip_hash, 16)
    
    # Route to a deterministic global region
    region = GLOBAL_REGIONS[hash_int % len(GLOBAL_REGIONS)]
    
    # Add slight jitter to lat/lon coordinates so overlapping IPs spread apart
    jitter_lat = ((hash_int % 100) - 50) / 100.0  # -0.5 to 0.5 degrees
    jitter_lon = (((hash_int >> 8) % 100) - 50) / 100.0
    
    return {
        "ip": ip,
        "private": False,
        "country": region["country"],
        "city": region["city"],
        "lat": region["lat"] + jitter_lat,
        "lon": region["lon"] + jitter_lon,
        "org": region["org"]
    }
