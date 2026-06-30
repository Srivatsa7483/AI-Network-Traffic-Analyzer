# AI Network Traffic Analyzer

A production-ready, full-stack network traffic sniffer, parser, and anomaly detection console built using React, Flask, and Scapy, backed by a Neon PostgreSQL cloud database and integrated with Isolation Forest machine learning.

---

## 🚀 Key Features

* **Real-time Sniffing & Parsing**: Capable of reading raw socket payloads and extracting protocol metadata (TCP/UDP/ICMP/DNS/HTTP).
* **AI Anomaly Detection**: Integrated unsupervised Isolation Forest model trained on traffic windows to detect network anomalies.
* **Persistent Sessions**: Captures sessions gracefully, saving packet metadata, alert counts, and bandwidth telemetry to a Neon cloud database.
* **Modern Security Console**: Dynamic glassmorphism dashboard built with Tailwind CSS, custom loading skeletons, error states, and responsive metrics.
* **Robust Signal Handling**: Handles container stopping (`SIGINT`/`SIGTERM`) to flush in-memory packets and update status in PostgreSQL.

---

## 🏗️ Architecture

```text
    [ React Frontend ]
           │
           │ (HTTP / JWT auth)
           ▼
    [ Flask Backend ] ──(Sniffer Thread)──► [ Scapy Raw Socket / PCAP ]
           │
           │ (psycopg2 Connection Pool)
           ▼
 [ Neon Cloud PostgreSQL ]
```

---

## 🚦 Deployment Scenarios

Due to security restrictions on raw packet capture (`NET_RAW`) in serverless environments, this project is designed for two deployment configurations:

### Scenario A: Portfolio Demo Mode (Fully Cloud-Hosted)
* **Frontend**: Hosted on **Vercel**
* **Backend**: Hosted on **Render** (via Docker container)
* **Database**: Hosted on **Neon PostgreSQL**
* *Behavior*: The backend starts up cleanly on Render. It detects the lack of raw socket capture permissions, outputs a graceful fallback warning, and runs in **API/Demo Mode**. Users can explore existing sessions, view machine learning models, inspect historical traffic logs, and interact with the console.

### Scenario B: Live Network Monitor (Local Agent Mode)
* **Frontend**: Hosted on **Vercel** or local machine
* **Backend**: Runs locally on the target device being monitored (requires `sudo` or admin privileges for Scapy capture)
* **Database**: Shared **Neon PostgreSQL** cloud instance
* *Behavior*: The backend sniffs target traffic in real-time, extracts features, detects anomalies, writes raw packets locally to a PCAP archive, and pushes statistics to Neon. The remote/local dashboard provides live visualization.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, Vite, Recharts, React Icons, Tailwind CSS, Axios
* **Backend**: Flask, Gunicorn (production WSGI server), Scapy, Scikit-learn (Isolation Forest), Joblib, Psycopg2
* **Database**: Neon PostgreSQL (Cloud), SQLite (local fallback)
* **Deployment**: Docker, Docker Compose, Nginx (local reverse proxy), Vercel, Render

---

## 📦 Local Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Srivatsa7483/AI-Network-Traffic-Analyzer.git
   cd AI-Network-Traffic-Analyzer
   ```

2. **Configure environment secrets**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
   JWT_SECRET_KEY=generate-your-secure-jwt-key-here
   ```

3. **Start the local Docker Compose stack**:
   ```bash
   docker compose up --build -d
   ```
   *Frontend is served on `http://localhost:80` (through Nginx)*
   *Backend API is routed through Nginx on `http://localhost/api` (proxied to port 5000)*

---

## ☁️ Cloud Deployment Guides

### Deploying the Frontend (Vercel)
1. Link your frontend directory or repository to Vercel.
2. The included `frontend/vercel.json` will automatically map `/api/*` requests to your backend Render URL. Update the rewrite URL in `vercel.json` to point to your live Render application.

### Deploying the Backend (Render)
1. Create a new **Web Service** on Render from your repository.
2. Select **Docker** as the environment.
3. In settings, add the environment variables:
   * `DATABASE_URL` (your Neon connection string)
   * `JWT_SECRET_KEY` (a secure secret string)