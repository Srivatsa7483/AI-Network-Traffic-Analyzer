FROM python:3.12-slim

# Install system dependencies (needed for raw packet capturing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpcap-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# Use gunicorn (production WSGI server) with config file
# Falls back to python app.py for debugging if needed
CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
