# gunicorn.conf.py — Production WSGI server configuration
#
# IMPORTANT: This app uses a single global TrafficAnalyzer with a background
# sniffer thread. We MUST use exactly 1 worker to avoid multiple analyzers
# being created. We use threads for concurrency instead.

bind = "0.0.0.0:5000"
workers = 1           # Single worker — required for shared TrafficAnalyzer state
threads = 4           # Handle up to 4 concurrent requests per worker
worker_class = "gthread"
timeout = 120         # Long timeout for packet export endpoints
graceful_timeout = 30 # Allow 30s for graceful shutdown to save session
keepalive = 5
accesslog = "-"       # Log to stdout (visible in docker logs)
errorlog = "-"
loglevel = "warning"
