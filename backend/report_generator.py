import time

def generate_html_report(session, metrics, protocol_data, top_ips, alerts):
    """
    Generates a beautiful, print-ready HTML summary report for a capture session.
    """
    session_id = session[0]
    start_time = session[1]
    end_time = session[2] or "Active Session"
    status = session[4]
    
    total_packets = metrics.get("total_packets", 0)
    total_bytes = metrics.get("total_bytes", 0)
    avg_rate = metrics.get("packet_rate", 0)
    avg_size = metrics.get("average_packet_size", 0)
    total_alerts = len(alerts)
    
    # Format bytes to human readable
    def format_bytes(bytes_count):
        if bytes_count < 1024:
            return f"{bytes_count} B"
        elif bytes_count < 1024 * 1024:
            return f"{(bytes_count/1024):.2f} KB"
        else:
            return f"{(bytes_count/(1024*1024)):.2f} MB"

    # Build protocol rows
    proto_rows = ""
    for p, count in protocol_data.items():
        pct = (count / total_packets * 100) if total_packets > 0 else 0
        proto_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">{p}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">{count:,}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">{pct:.1f}%</td>
        </tr>
        """
        
    # Build Top IP rows
    ip_rows = ""
    for ip, count in top_ips.items():
        ip_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{ip}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">{count:,}</td>
        </tr>
        """

    # Build Alert rows
    alert_rows = ""
    if not alerts:
        alert_rows = """
        <tr>
            <td colspan="4" style="padding: 20px; text-align: center; color: #718096; font-style: italic;">
                No security anomalies or threat alerts detected during this session.
            </td>
        </tr>
        """
    else:
        for a in alerts:
            # alert format: [id, session_id, timestamp, severity, threat_type, source_ip, description]
            timestamp = a[2]
            severity = a[3]
            threat_type = a[4]
            desc = a[6]
            
            sev_color = "#e53e3e" if severity in ["CRITICAL", "HIGH"] else "#dd6b20" if severity == "MEDIUM" else "#3182ce"
            
            alert_rows += f"""
            <tr style="vertical-align: top;">
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px; white-space: nowrap;">{timestamp}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; color: white; background-color: {sev_color}; text-transform: uppercase;">
                        {severity}
                    </span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; font-size: 11px;">{threat_type}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #4a5568;">{desc}</td>
            </tr>
            """

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Network Analyzer Report - Session #{session_id}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #2d3748;
            line-height: 1.5;
            background-color: #f7fafc;
            margin: 0;
            padding: 40px;
        }}
        .container {{
            max-width: 850px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02);
            border-top: 6px solid #3182ce;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #edf2f7;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .title {{
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            color: #1a202c;
            letter-spacing: -0.5px;
        }}
        .subtitle {{
            margin: 5px 0 0 0;
            font-size: 12px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 600;
        }}
        .grid-stats {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }}
        .stat-card {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            text-align: center;
        }}
        .stat-val {{
            font-size: 20px;
            font-weight: bold;
            color: #2b6cb0;
            margin-top: 5px;
        }}
        .stat-lbl {{
            font-size: 10px;
            color: #718096;
            text-transform: uppercase;
            font-weight: bold;
            letter-spacing: 0.5px;
        }}
        .section-title {{
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #4a5568;
            border-bottom: 1.5px solid #edf2f7;
            padding-bottom: 8px;
            margin-top: 30px;
            margin-bottom: 15px;
            font-weight: 700;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }}
        th {{
            background-color: #f7fafc;
            color: #4a5568;
            font-weight: bold;
            text-align: left;
            padding: 10px;
            border-bottom: 2px solid #e2e8f0;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
        }}
        .meta-list {{
            list-style: none;
            padding: 0;
            margin: 0;
            font-size: 12px;
        }}
        .meta-list li {{
            margin-bottom: 6px;
            color: #4a5568;
        }}
        .meta-list strong {{
            color: #1a202c;
        }}
        @media print {{
            body {{
                background-color: white;
                padding: 0;
            }}
            .container {{
                box-shadow: none;
                padding: 0;
                border-top: none;
            }}
            .no-print {{
                display: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1 class="title">Security Operations Center</h1>
                <p class="subtitle">Session Transaction Report</p>
            </div>
            <div style="text-align: right;" class="no-print">
                <button onclick="window.print();" style="padding: 8px 16px; font-weight: bold; border-radius: 6px; background-color: #3182ce; color: white; border: none; cursor: pointer; font-size: 12px;">
                    PRINT TO PDF
                </button>
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; gap: 40px;">
            <div style="flex: 1;">
                <h2 class="section-title" style="margin-top: 0;">Session Metadata</h2>
                <ul class="meta-list">
                    <li><strong>Session ID:</strong> #{session_id}</li>
                    <li><strong>Capture Start:</strong> {start_time}</li>
                    <li><strong>Capture End:</strong> {end_time}</li>
                    <li><strong>Current Status:</strong> <span style="font-weight: bold; color: { '#10b981' if status == 'Running' else '#718096' }">{status.upper()}</span></li>
                </ul>
            </div>
            <div style="flex: 1;">
                <h2 class="section-title" style="margin-top: 0;">System Information</h2>
                <ul class="meta-list">
                    <li><strong>Generated At:</strong> {time.strftime('%Y-%m-%d %H:%M:%S')}</li>
                    <li><strong>Report Version:</strong> v1.1.0-SOC</li>
                    <li><strong>Classification:</strong> RESTRICTED / INTERNAL</li>
                </ul>
            </div>
        </div>

        <h2 class="section-title">Traffic Telemetry Summary</h2>
        <div class="grid-stats">
            <div class="stat-card">
                <div class="stat-lbl">Total Packets</div>
                <div class="stat-val">{total_packets:,}</div>
            </div>
            <div class="stat-card">
                <div class="stat-lbl">Data Transferred</div>
                <div class="stat-val">{format_bytes(total_bytes)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-lbl">Avg Packet Size</div>
                <div class="stat-val">{avg_size:.1f} B</div>
            </div>
            <div class="stat-card" style="border-color: {'#feb2b2' if total_alerts > 0 else '#cbd5e0'}; background-color: {'#fff5f5' if total_alerts > 0 else '#f8fafc'}">
                <div class="stat-lbl" style="color: {'#c53030' if total_alerts > 0 else '#718096'}">Threat Detections</div>
                <div class="stat-val" style="color: {'#c53030' if total_alerts > 0 else '#2b6cb0'}">{total_alerts}</div>
            </div>
        </div>

        <div style="display: flex; gap: 30px; margin-bottom: 30px;">
            <div style="flex: 1;">
                <h2 class="section-title">Protocol Distribution</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Protocol</th>
                            <th style="text-align: right;">Packets</th>
                            <th style="text-align: right;">Share</th>
                        </tr>
                    </thead>
                    <tbody>
                        {proto_rows}
                    </tbody>
                </table>
            </div>
            <div style="flex: 1;">
                <h2 class="section-title">Top Stream Talkers</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Endpoint IP Address</th>
                            <th style="text-align: right;">Packets</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ip_rows}
                    </tbody>
                </table>
            </div>
        </div>

        <h2 class="section-title">Security Incidents & AI Anomalies</h2>
        <table>
            <thead>
                <tr>
                    <th style="width: 15%;">Timestamp</th>
                    <th style="width: 10%;">Severity</th>
                    <th style="width: 25%;">Threat Type</th>
                    <th style="width: 50%;">Description / Details</th>
                </tr>
            </thead>
            <tbody>
                {alert_rows}
            </tbody>
        </table>

        <div style="margin-top: 50px; border-t: 1px solid #edf2f7; padding-top: 15px; text-align: center; font-size: 10px; color: #a0aec0; font-family: monospace;">
            AI Network sniffer telemetry validation checksum: {hash(f"{session_id}-{total_packets}")}
        </div>
    </div>
</body>
</html>
"""
    return html
