# AI Network Traffic Analyzer: Developer Guide

Welcome to the Developer Guide for the AI Network Traffic Analyzer platform. This document describes the platform architecture, data ingestion pipelines, machine learning logic, and deployment guidelines.

---

## 🏛️ System Architecture

The application is split into a separated **React Frontend** and a **Flask Backend**, supporting both SQLite and PostgreSQL backends:

```
┌─────────────────────────────────────────────────────────┐
│                    Vite + React UI                      │
│   (Dashboard, Topology, Alerts, Sessions, Settings)     │
└────────────────────────────┬────────────────────────────┘
                             │ (HTTPS / Web API Calls)
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Flask API Gateway                    │
│        (Auth Router, Session Control, Key Manager)      │
└────────────────────────┬────────────────────────┬───────┘
                         │                        │
                         ▼                        ▼
┌──────────────────────────────┐    ┌─────────────────────┐
│    Scapy Packet Sniffer      │    │  Isolation Forest   │
│ (Queue Producer / Consumer)  │    │  Anomaly Detector   │
└──────────────┬───────────────┘    └──────────┬──────────┘
               │                               │
               └───────────────┬───────────────┘
                               ▼
┌─────────────────────────────────────────────────────────┐
│            Unified Database Manager Factory             │
│            (Neon PostgreSQL / SQLite DB)                │
└─────────────────────────────────────────────────────────┘
```

### 1. Frontend Architecture
* **Framework**: React.js powered by Vite for rapid HMR.
* **Styling System**: Tailwind CSS with custom HSL-based neon cyberpunk themes (Cyberpunk, Matrix, Threat Alert, Obsidian Dark).
* **Visualization Layer**:
  * **Topology Map**: Custom HTML Canvas physics engine simulating node coordinates, gateway routings, and packet traversal animations.
  * **GeoIP Radar**: Radar projection canvas mapping target IP addresses to coordinate grids.
  * **Charts**: Recharts graphs rendering protocol ratios, bandwith rates, and frame sizes.

### 2. Backend Services
* **Framework**: Flask (Python 3.12).
* **Ingestion Engine**: Scapy-based socket capture binding directly to network interfaces.
* **Database Factory**: A flexible wrapper interface (`DatabaseManager`) routing queries to SQLite or PostgreSQL depending on the configured `DATABASE_URL` environment parameter.

---

## ⚙️ Data Ingestion Pipeline

To prevent packet drops during heavy network traffic, the system implements a **Producer-Consumer thread queue**:

```
┌──────────────┐      put_nowait()      ┌───────────────┐
│ Scapy Sniff  │ ─────────────────────> │ Thread Queue  │ (Producer - Non-blocking)
└──────────────┘                        └───────┬───────┘
                                                │
                                                │ get()
                                                ▼
                                        ┌───────────────┐
                                        │ Parser Worker │ (Consumer - Thread Isolation)
                                        └───────┬───────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
             ┌──────────────┐                                      ┌──────────────┐
             │ PcapWriter   │                                      │  DB Buffer   │
             │ (Raw PCAP)   │                                      │ (Bulk Insert)│
             └──────────────┘                                      └──────────────┘
```

1. **Queue Ingestion**: Scapy's capture callback thread acts as a **Producer**, adding raw frame data to a thread-safe `queue.Queue` structure instantly with a non-blocking `put_nowait()`.
2. **Parser Thread**: A separate background worker thread acts as a **Consumer**, pulling raw packets, decoding protocol headers (Ethernet, IPv4/IPv6, TCP, UDP, ICMP, DNS, HTTP), and writing the frame to the raw PCAP log.
3. **Database Buffering**: Decoded packet entries are buffered in memory and flushed as a single bulk operation (`insert_packets_bulk`) once 50 packets have accumulated or 2 seconds have elapsed, minimizing database roundtrip latency.

---

## 🤖 Anomaly Detection (AI 2.0)

Unsupervised threat monitoring uses an **Isolation Forest** outlier model:

### 1. Feature Extractor
Decoded packets are grouped inside 5-second windows. The engine constructs a feature array containing:
* Packet Rate (total count per window)
* Byte Volume (total bytes per window)
* Average Frame Size
* Protocol count distribution (TCP, UDP, ICMP)
* Cardinality statistics (unique source/destination IPs and socket ports)

### 2. Calibration & Explainability
* **Continuous Threat Score**: Converted the raw Isolation Forest `decision_function` score (typically `[-0.5, 0.5]`) into a user-friendly continuous score scale from `0%` to `100%`.
* **Explainability Checks**: Evaluates feature values against a running baseline average (constructed dynamically from standard traffic) to list anomaly trigger reasons (e.g. `Packet rate 2.5x normal`, `SYN packets unusually high`).
* **Asynchronous Training Isolation**: Retraining operations (`POST /ai/train`) spawn in a background thread to prevent Flask blocking, and progress can be queried via the `/ai/train/status` endpoint.

---

## 💼 Enterprise Integration Interfaces

### 1. X-API-Key Authentication
External SIEM/SOAR platforms can authenticate requests by passing an API key in the `X-API-Key` header. Keys are cryptographically generated on the settings panel, and endpoints validate the key against database record stores.

### 2. Operator Audit trails
All administrative actions (sniffers starting/stopping, report downloads, ML runs, operator logins) log audit logs containing the username, activity timestamp, descriptive summary, and client IPv4 loopback address.

### 3. Print-Ready Session Reporting
The `report_generator.py` compiler processes session traffic analytics into self-contained HTML reports featuring clean media print CSS rules. Adding `?download=true` automatically compiles the report as a file attachment.

---

## 🛠️ Local Development Setup

### Dependencies
Ensure you have Python 3.12+ and Node.js 18+ installed on your developer machine.

1. **Setup Python Virtual Environment**:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```
2. **Run Flask Backend**:
   ```bash
   python backend/app.py
   ```
3. **Setup React Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. **Environment Variables (`.env`)**:
   Create a `.env` file at the root of the project:
   ```env
   # PostgreSQL Connection string (removes SQLite default)
   DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
   
   # JWT Cryptographic signature secret
   JWT_SECRET_KEY=your_secret_cryptographic_key
   ```
