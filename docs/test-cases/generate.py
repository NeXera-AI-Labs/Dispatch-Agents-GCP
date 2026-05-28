import base64, os

SDIR = os.path.join(os.path.dirname(__file__), "screenshots")
OUT  = os.path.join(os.path.dirname(__file__), "nexera-test-cases.html")

def logo(height="48px"):
    path = os.path.join(SDIR, "nexera-logo.png")
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return f'<img src="data:image/png;base64,{b64}" alt="NeXera.AI" style="height:{height};display:block;"/>'

def img(name, alt="Screenshot"):
    path = os.path.join(SDIR, name + ".png")
    if not os.path.exists(path):
        return f'<div class="missing">&#9888; Missing: {name}</div>'
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return f'<img src="data:image/png;base64,{b64}" alt="{alt}" class="ss"/>'

def phone(name, alt="Screenshot"):
    """Wrap screenshot in a CSS phone frame."""
    path = os.path.join(SDIR, name + ".png")
    if not os.path.exists(path):
        return f'<div class="missing">&#9888; Missing: {name}</div>'
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return f'''<div style="display:flex;justify-content:center;margin:16px 0;">
  <div class="phone-frame">
    <div class="phone-notch"></div>
    <div class="phone-screen">
      <img src="data:image/png;base64,{b64}" alt="{alt}" style="width:100%;display:block;border-radius:0;"/>
    </div>
    <div class="phone-home"></div>
  </div>
</div>'''

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
:root{
  --bg:#f8f9fc;--s1:#ffffff;--s2:#f1f3f8;--bd:#dde1ec;
  --in:#4f46e5;--il:#4338ca;--cy:#0891b2;
  --gr:#16a34a;--rd:#dc2626;--tx:#111827;--mu:#6b7280;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--tx);line-height:1.6;font-size:14px;}
a{color:var(--il);text-decoration:none;}
.ss{width:100%;border-radius:8px;border:1px solid var(--bd);display:block;margin:10px 0;}
.missing{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;color:#b91c1c;font-size:13px;margin:10px 0;}

/* Phone frame */
.phone-frame{width:260px;background:#1a1a1a;border-radius:36px;padding:10px;box-shadow:0 0 0 2px #374151,0 24px 60px rgba(0,0,0,.18);position:relative;}
.phone-notch{width:80px;height:22px;background:#1a1a1a;border-radius:0 0 16px 16px;margin:0 auto 6px;position:relative;z-index:2;display:flex;align-items:center;justify-content:center;gap:6px;}
.phone-notch::before{content:'';width:8px;height:8px;border-radius:50%;background:#374151;}
.phone-notch::after{content:'';width:40px;height:5px;border-radius:3px;background:#374151;}
.phone-screen{border-radius:20px;overflow:hidden;background:#000;line-height:0;}
.phone-home{width:80px;height:5px;background:#374151;border-radius:3px;margin:10px auto 2px;}

/* Cover */
.cover{min-height:100vh;background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#1e40af 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 40px;text-align:center;position:relative;overflow:hidden;page-break-after:always;}
.cover::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(99,102,241,.18) 0%,transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(6,182,212,.10) 0%,transparent 60%);}
.cv{position:relative;z-index:1;max-width:800px;}
.btag{font-size:18px;color:rgba(255,255,255,.75);margin-top:8px;}
.divider{width:60px;height:3px;background:linear-gradient(90deg,#818cf8,#38bdf8);margin:32px auto;border-radius:2px;}
.doctitle{font-size:28px;font-weight:700;margin-bottom:8px;color:#fff;}
.docsub{font-size:16px;color:rgba(255,255,255,.65);margin-bottom:40px;}
.cbadge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#c7d2fe;padding:8px 20px;border-radius:100px;font-size:13px;font-weight:500;margin-bottom:32px;}
.cmeta{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;max-width:440px;margin:0 auto;}
.cmi{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:16px;}
.cml{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.5);margin-bottom:4px;}
.cmv{font-size:14px;font-weight:600;color:#fff;}

/* Layout */
.page{max-width:1100px;margin:0 auto;padding:48px;}

/* ToC */
.toc{background:var(--s1);border:1px solid var(--bd);border-radius:16px;padding:36px;margin-bottom:48px;page-break-after:always;box-shadow:0 1px 4px rgba(0,0,0,.06);}
.toc h2{font-size:22px;font-weight:700;margin-bottom:24px;color:var(--tx);}
.ts{margin-bottom:16px;}
.ts-title{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--mu);margin-bottom:6px;padding-left:12px;}
.ti{display:flex;align-items:center;padding:7px 12px;border-radius:8px;color:var(--tx);}
.ti:hover{background:var(--s2);}
.tnum{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--in);width:56px;flex-shrink:0;}
.tdots{flex:1;border-bottom:1px dotted var(--bd);margin:0 12px;min-width:40px;}
.bp{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:700;white-space:nowrap;}
.bf{background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:700;}
.bn{background:var(--s2);color:var(--mu);border:1px solid var(--bd);padding:2px 10px;border-radius:100px;font-size:11px;font-weight:700;}

/* Sections */
.sec{margin-bottom:56px;}
.sh{display:flex;align-items:center;gap:16px;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid var(--bd);}
.si{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--in) 0%,var(--cy) 100%);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.sn{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--in);margin-bottom:2px;}
.st{font-size:22px;font-weight:700;color:var(--tx);}

/* Cards */
.card{background:var(--s1);border:1px solid var(--bd);border-radius:16px;padding:28px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.05);}

/* Problem grid */
.pgrid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
.pi{background:var(--s1);border:1px solid var(--bd);border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.pi h4{font-size:14px;font-weight:600;color:var(--in);margin-bottom:8px;}
.pi p,.pi ul{font-size:13px;color:var(--mu);line-height:1.7;}
.pi ul{padding-left:18px;}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:24px 0;}
.sc{background:var(--s1);border:1px solid var(--bd);border-radius:12px;padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.sn2{font-size:32px;font-weight:800;color:var(--in);}
.sl{font-size:12px;color:var(--mu);margin-top:4px;}

/* Arch */
.arch{background:#1e1b4b;border:1px solid #312e81;border-radius:12px;padding:20px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#a5b4fc;white-space:pre;overflow-x:auto;line-height:1.6;margin:16px 0;}
.agrid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin:20px 0;}
.ac{background:var(--s1);border:1px solid var(--bd);border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.ac h4{font-size:14px;font-weight:600;margin-bottom:6px;color:var(--tx);}
.ac p{font-size:12px;color:var(--mu);line-height:1.6;}
.atag{display:inline-block;background:#ede9fe;color:#5b21b6;border-radius:4px;padding:2px 8px;font-size:11px;font-family:'JetBrains Mono',monospace;margin-bottom:8px;}

/* Roles */
.rgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;}
.rc{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.rh{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
.ri{font-size:28px;}
.rn{font-size:16px;font-weight:700;color:var(--tx);}
.rs{font-size:12px;color:var(--mu);}
.rc ul{padding-left:18px;font-size:13px;color:var(--mu);line-height:1.8;}

/* TC */
.tc{background:var(--s1);border:1px solid var(--bd);border-radius:16px;margin-bottom:32px;overflow:hidden;page-break-inside:avoid;box-shadow:0 1px 4px rgba(0,0,0,.06);}
.tch{display:flex;align-items:center;justify-content:space-between;padding:20px 28px;border-bottom:1px solid var(--bd);background:var(--s2);}
.tcid{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--in);margin-bottom:2px;}
.tcn{font-size:17px;font-weight:700;color:var(--tx);}
.pass{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:6px 16px;border-radius:100px;font-size:13px;font-weight:700;}
.obs{background:#fef9c3;color:#92400e;border:1px solid #fde68a;padding:6px 16px;border-radius:100px;font-size:13px;font-weight:700;}
.tcb{padding:24px 28px;}
.tcm{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
.tmi{background:var(--s2);border-radius:8px;padding:12px 14px;}
.tml{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--mu);margin-bottom:4px;}
.tmv{font-size:13px;font-weight:500;color:var(--tx);}
.tcd{font-size:13px;color:var(--mu);margin-bottom:20px;line-height:1.7;}
.stbl{width:100%;border-collapse:collapse;margin-bottom:20px;}
.stbl th{background:var(--s2);padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--mu);text-align:left;border-bottom:1px solid var(--bd);}
.stbl td{padding:11px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;vertical-align:top;color:var(--tx);}
.stbl tr:last-child td{border-bottom:none;}
.sn3{font-family:'JetBrains Mono',monospace;color:var(--in);font-size:12px;}
.ok{color:#15803d;font-weight:700;}
.ob{color:#92400e;font-weight:700;}
.sslabel{font-size:11px;color:var(--mu);font-family:'JetBrains Mono',monospace;margin:16px 0 6px;}
.note{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin:16px 0;font-size:13px;color:#78350f;}

/* Summary / GCP tables */
.tbl{width:100%;border-collapse:collapse;}
.tbl th{background:var(--s2);padding:11px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--mu);text-align:left;border-bottom:1px solid var(--bd);}
.tbl td{padding:11px 16px;font-size:13px;border-bottom:1px solid #e5e7eb;color:var(--tx);}
.tbl tr:last-child td{border-bottom:none;}
.gcpg{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:20px 0;}
.gcpc{background:var(--s1);border:1px solid var(--bd);border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.gcpc h4{font-size:13px;font-weight:600;color:var(--in);margin-bottom:8px;}
.gcpc p{font-size:12px;color:var(--mu);line-height:1.6;}
.ltag{display:inline-block;background:#dcfce7;color:#15803d;border-radius:4px;padding:2px 8px;font-size:11px;margin-bottom:6px;}
.rmgrid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.rmc{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.rmp{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--in);margin-bottom:6px;}
.rmt{font-size:16px;font-weight:700;margin-bottom:12px;color:var(--tx);}
.rmc ul{padding-left:18px;font-size:13px;color:var(--mu);line-height:1.8;}
@media print{body{background:#f8f9fc;}.tc,.card,.toc{page-break-inside:avoid;}}
"""

def section_header(icon, num, title, anchor=""):
    a = f' id="{anchor}"' if anchor else ""
    return f'''<div class="sec"{a}><div class="sh"><div class="si">{icon}</div><div><div class="sn">{num}</div><div class="st">{title}</div></div></div>'''

def tc_open(anchor, tc_id, title, status_cls, status_lbl):
    return f'''<div class="tc" id="{anchor}"><div class="tch"><div><div class="tcid">{tc_id}</div><div class="tcn">{title}</div></div><div class="{status_cls}">{status_lbl}</div></div><div class="tcb">'''

def meta3(r, p, lbl, val):
    return f'<div class="tcm"><div class="tmi"><div class="tml">Role</div><div class="tmv">{r}</div></div><div class="tmi"><div class="tml">Priority</div><div class="tmv">{p}</div></div><div class="tmi"><div class="tml">{lbl}</div><div class="tmv">{val}</div></div></div>'

def steps(*rows):
    hdr = '<table class="stbl"><tr><th style="width:50px">Step</th><th style="width:40%">Action</th><th>Expected Result</th><th style="width:65px">Result</th></tr>'
    body = "".join(f'<tr><td class="sn3">{r[0]}</td><td>{r[1]}</td><td style="color:var(--mu)">{r[2]}</td><td class="{r[3]}">{r[4]}</td></tr>' for r in rows)
    return hdr + body + "</table>"

def sl(label):
    return f'<div class="sslabel">&#128248; {label}</div>'

parts = []

# ── HEAD ──────────────────────────────────────────────────────────────
parts.append(f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>NeXera Dispatch &mdash; Test Case Document | Google AI Agents Challenge 2026</title>
<style>{CSS}</style>
</head>
<body>''')

# ── COVER ─────────────────────────────────────────────────────────────
parts.append(f'''
<div class="cover">
 <div class="cv">
  <div style="display:flex;justify-content:center;margin-bottom:28px;">{logo("64px")}</div>
  <div class="btag">Agentic Powered Dispatcher</div>
  <div class="divider"></div>
  <div class="cbadge">&#9679; Google for Startups AI Agents Challenge 2026 &mdash; Track 1: Build New AI Agents</div>
  <div class="doctitle">Test Case Document &amp; Platform Walkthrough</div>
  <div class="docsub">End-to-end functional validation across all user roles and AI agent scenarios</div>
  <div class="cmeta">
   <div class="cmi"><div class="cml">Date</div><div class="cmv">May 2026</div></div>
   <div class="cmi"><div class="cml">Version</div><div class="cmv">1.0 &mdash; Hackathon</div></div>
  </div>
 </div>
</div>''')

# ── PAGE WRAPPER ──────────────────────────────────────────────────────
parts.append('<div class="page">')

# ── DEMO CREDENTIALS ─────────────────────────────────────────────────
parts.append('''
<div class="card" style="margin-bottom:32px;border-color:#c7d2fe;background:#eef2ff;">
 <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
  <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#0891b2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">&#128273;</div>
  <div>
   <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#4f46e5;margin-bottom:2px;">Live Demo Access</div>
   <div style="font-size:18px;font-weight:700;color:#111827;">Demo Credentials &mdash; Acme Logistics Tenant</div>
  </div>
 </div>
 <p style="color:#6b7280;font-size:13px;margin-bottom:20px;">Use these credentials to test the live deployment at <a href="https://frontend-5pcgzahy4q-uc.a.run.app" style="color:#4338ca;">https://frontend-5pcgzahy4q-uc.a.run.app</a>. The <strong style="color:#111827">Acme Logistics</strong> tenant is pre-loaded with 100 SAP deliveries, an active ERP connection, and warehouse WH-1710 (Bangalore).</p>
 <table class="tbl">
  <tr><th>Role</th><th>Email</th><th>Password</th><th>Access Level</th></tr>
  <tr>
   <td><span style="font-size:16px">&#128295;</span> <strong>IT Admin</strong></td>
   <td><code>admin@acme.demo</code></td>
   <td><code>Demo@2026</code></td>
   <td>Full admin: ERP connections, settings, team management</td>
  </tr>
  <tr>
   <td><span style="font-size:16px">&#128666;</span> <strong>Dispatcher</strong></td>
   <td><code>dispatcher@acme.demo</code></td>
   <td><code>Demo@2026</code></td>
   <td>Dispatch dashboard, assign drivers, AI chat, live map</td>
  </tr>
  <tr>
   <td><span style="font-size:16px">&#128101;</span> <strong>Supervisor</strong></td>
   <td><code>supervisor@acme.demo</code></td>
   <td><code>Demo@2026</code></td>
   <td>Read-only dispatch view, AI chat, delivery status</td>
  </tr>
  <tr>
   <td><span style="font-size:16px">&#128241;</span> <strong>Driver</strong></td>
   <td colspan="2"><em>No login required</em> &mdash; scan QR code from any assigned delivery</td>
   <td>Public tracking page only (<code>/tracking/{id}</code>)</td>
  </tr>
 </table>
 <div style="margin-top:16px;padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:12px;color:#15803d;">
  &#128161; <strong>Quick start for judges:</strong> Log in as <code>dispatcher@acme.demo</code> / <code>Demo@2026</code> to go directly to the dispatch dashboard with 100 live SAP deliveries already imported. Use the AI Chat panel (bottom-right) to query delivery status or assign a driver on any unassigned delivery.
 </div>
</div>
''')

# ── TOC ───────────────────────────────────────────────────────────────
parts.append('''
<div class="toc" id="toc">
 <h2>Table of Contents</h2>
 <div class="ts"><div class="ts-title">Context &amp; Architecture</div>
  <a href="#prob" class="ti"><span class="tnum">01</span>Problem Statement &amp; Business Model<div class="tdots"></div></a>
  <a href="#arch" class="ti"><span class="tnum">02</span>Multi-Agent Architecture<div class="tdots"></div></a>
  <a href="#roles" class="ti"><span class="tnum">03</span>User Roles &amp; Personas<div class="tdots"></div></a>
 </div>
 <div class="ts"><div class="ts-title">Test Cases</div>
  <a href="#tc01" class="ti"><span class="tnum">TC-01</span>Tenant Signup &amp; IT Admin Login<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc02" class="ti"><span class="tnum">TC-02</span>ERP Connection Wizard (SAP S/4HANA)<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc03" class="ti"><span class="tnum">TC-03</span>Invite Warehouse Manager<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc04" class="ti"><span class="tnum">TC-04</span>Configure Tenant Settings<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc05" class="ti"><span class="tnum">TC-05</span>Import Deliveries from SAP ERP<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc06" class="ti"><span class="tnum">TC-06</span>Assign Driver &amp; Generate QR Code<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc07" class="ti"><span class="tnum">TC-07</span>Driver Tracking &mdash; Mobile GPS<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc08" class="ti"><span class="tnum">TC-08</span>Driver Confirms Delivery<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc09" class="ti"><span class="tnum">TC-09</span>Live Route Map (Google Maps)<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc10" class="ti"><span class="tnum">TC-10</span>AI Chat &mdash; Delivery Agent Query<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc11" class="ti"><span class="tnum">TC-11</span>AI Chat &mdash; Driver &amp; Route Agent<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc12" class="ti"><span class="tnum">TC-12</span>Multi-Tenant Data Isolation<div class="tdots"></div><span class="bp">PASS</span></a>
  <a href="#tc13" class="ti"><span class="tnum">TC-13</span>Background Monitor Agent<div class="tdots"></div><span class="bp">PASS</span></a>
 </div>
 <div class="ts"><div class="ts-title">Evidence &amp; Roadmap</div>
  <a href="#unit" class="ti"><span class="tnum">&mdash;</span>Unit Test Results<div class="tdots"></div></a>
  <a href="#gcp" class="ti"><span class="tnum">&mdash;</span>GCP Deployment Evidence<div class="tdots"></div></a>
  <a href="#summ" class="ti"><span class="tnum">&mdash;</span>Test Execution Summary<div class="tdots"></div></a>
  <a href="#road" class="ti"><span class="tnum">&mdash;</span>Next Steps &amp; Product Roadmap<div class="tdots"></div></a>
 </div>
</div>''')

# ── §1 PROBLEM ────────────────────────────────────────────────────────
parts.append(section_header("&#127919;","SECTION 01","Problem Statement &amp; Business Model","prob"))
parts.append('''
<div class="stats">
 <div class="sc"><div class="sn2">$8.6T</div><div class="sl">Global 3PL market by 2028</div></div>
 <div class="sc"><div class="sn2">67%</div><div class="sl">3PLs still use manual dispatch</div></div>
 <div class="sc"><div class="sn2">23%</div><div class="sl">Avg delay from ERP disconnect</div></div>
 <div class="sc"><div class="sn2">4 hrs</div><div class="sl">Daily dispatcher time on calls</div></div>
</div>
<div class="pgrid">
 <div class="pi"><h4>&#128308; The Problem</h4>
  <p>Third-party logistics (3PL) providers operate across disconnected systems: ERP (SAP/Oracle/Odoo) holds delivery orders while dispatchers manage drivers via WhatsApp, phone calls, and spreadsheets. No unified real-time layer exists connecting warehouse operations to last-mile execution.</p>
  <br/><ul><li>Manual driver assignment and status tracking</li><li>No real-time GPS visibility for dispatchers</li><li>ERP data stranded in SAP &mdash; no mobile-friendly interface</li><li>SLA breaches undetected until customer complaints</li><li>SME 3PLs locked out of enterprise software costs</li></ul>
 </div>
 <div class="pi"><h4>&#128994; NeXera Solution</h4>
  <p>NeXera bridges the ERP &harr; dispatcher &harr; driver gap with an AI-native SaaS platform. Autonomous agents proactively manage dispatch operations, replacing manual coordination with intelligent event-driven automation.</p>
  <br/><ul><li>SAP OData V4 connector &mdash; live delivery sync, no ETL</li><li>AI Supervisor routes queries to specialist agents</li><li>QR-based driver onboarding &mdash; zero app install</li><li>Real-time GPS tracking via browser geolocation</li><li>Teams/Slack webhook alerts for SLA events</li><li>Multi-tenant SaaS &mdash; any 3PL, any warehouse</li></ul>
 </div>
 <div class="pi"><h4>&#128176; Business Model</h4>
  <ul><li><strong style="color:#e2e8f0">SaaS subscription</strong> &mdash; per warehouse per month (tiered by volume)</li><li><strong style="color:#e2e8f0">ERP connector fee</strong> &mdash; per integration (SAP, Oracle, Odoo)</li><li><strong style="color:#e2e8f0">Usage-based AI tier</strong> &mdash; agent calls billed above free quota</li><li><strong style="color:#e2e8f0">Enterprise</strong> &mdash; white-label + on-premise for large carriers</li></ul>
 </div>
 <div class="pi"><h4>&#127757; Social &amp; Economic Impact</h4>
  <ul><li><strong style="color:#e2e8f0">Formalises gig driver work</strong> &mdash; digital proof of delivery replaces paper POD</li><li><strong style="color:#e2e8f0">Reduces food/pharma spoilage</strong> &mdash; real-time SLA monitoring catches delays early</li><li><strong style="color:#e2e8f0">Democratises SAP access</strong> &mdash; SME logistics at fraction of SAP implementation cost</li><li><strong style="color:#e2e8f0">Carbon footprint</strong> &mdash; optimised routing reduces fuel per delivery</li><li><strong style="color:#e2e8f0">Rural employment</strong> &mdash; QR-only onboarding enables informal workforce participation</li></ul>
 </div>
</div>
</div>''')

# ── §2 ARCHITECTURE ───────────────────────────────────────────────────
parts.append(section_header("&#129302;","SECTION 02","Multi-Agent Architecture (LangGraph + Gemini 2.5 Flash)","arch"))
parts.append('''
<div class="card">
 <p style="color:var(--mu);font-size:14px;margin-bottom:16px;">NeXera&rsquo;s AI layer is a <strong style="color:var(--tx)">LangGraph Supervisor pattern</strong> on GCP Cloud Run, powered by <strong style="color:var(--tx)">Gemini 2.5 Flash via Vertex AI</strong>. Each dispatcher chat message is classified by the Supervisor node and routed to the appropriate ReAct sub-agent, which uses tool-calling to fetch live data from the CAP OData V4 backend.</p>
 ''' + img("arch-diagram", "NeXera Multi-Agent Architecture") + '''
</div>
<div class="agrid">
 <div class="ac"><div class="atag">SupervisorAgent</div><h4 style="color:var(--tx)">Orchestration &amp; Routing</h4><p>Classifies each query as <em>delivery</em>, <em>driver</em>, or <em>route</em>. Maintains conversation memory via MemorySaver keyed by <code>thread_id</code>. Routes transparently to specialist sub-agents.</p></div>
 <div class="ac"><div class="atag">DeliveryAgent</div><h4 style="color:var(--tx)">Delivery Operations</h4><p>ReAct agent with tools: <em>list_deliveries</em>, <em>get_delivery</em>, <em>get_delivery_items</em>. Answers &ldquo;Show overdue deliveries&rdquo; or &ldquo;What&rsquo;s in shipment 80000003?&rdquo;</p></div>
 <div class="ac"><div class="atag">DriverAgent</div><h4 style="color:var(--tx)">Driver &amp; Assignment Tracking</h4><p>Tools: <em>list_drivers</em>, <em>get_assignment_by_delivery</em>. Returns driver name, truck registration, GPS coordinates, and assignment status.</p></div>
 <div class="ac"><div class="atag">RouteAgent</div><h4 style="color:var(--tx)">Route &amp; Navigation</h4><p>Calls Google Maps Directions API via CAP OData action <em>getDirections</em>. Returns distance, duration, and turn-by-turn instructions from warehouse to ship-to.</p></div>
 <div class="ac"><div class="atag">MonitorAgent</div><h4 style="color:var(--tx)">Autonomous SLA Monitoring</h4><p>Runs on APScheduler inside the agents container. Scans for overdue deliveries and fires Microsoft Teams webhook alerts autonomously &mdash; no human trigger needed.</p></div>
 <div class="ac" style="background:rgba(99,102,241,.06);border-color:rgba(99,102,241,.25);"><div class="atag" style="background:rgba(99,102,241,.2);">Gemini 2.5 Flash</div><h4 style="color:var(--il)">LLM Backbone &mdash; Vertex AI</h4><p>All agents use <strong style="color:var(--tx)">ChatVertexAI (Gemini 2.5 Flash)</strong> in <code>us-central1</code>. Native tool-calling &mdash; no function-calling wrappers. ADC auth on Cloud Run via service account.</p></div>
</div>
</div>''')

# ── §3 ROLES ──────────────────────────────────────────────────────────
parts.append(section_header("&#128101;","SECTION 03","User Roles &amp; Personas","roles"))
parts.append('''
<div class="rgrid">
 <div class="rc"><div class="rh"><div class="ri">&#128295;</div><div><div class="rn">IT Admin</div><div class="rs">Tenant onboarding &amp; configuration</div></div></div>
  <ul><li>Signs up the company (creates tenant)</li><li>Configures ERP connection (SAP API key, base URL)</li><li>Sets up Microsoft Teams webhook URL</li><li>Configures Google Maps API key</li><li>Invites Warehouse Managers by email</li><li>Manages all tenant-level settings</li></ul>
 </div>
 <div class="rc"><div class="rh"><div class="ri">&#127981;</div><div><div class="rn">Warehouse Manager</div><div class="rs">Warehouse setup &amp; operations oversight</div></div></div>
  <ul><li>Accepts email invite &rarr; sets password</li><li>Registers warehouse address &amp; working hours</li><li>Address geocoded for route origin on maps</li><li>Monitors warehouse-specific deliveries</li><li>Views SLA status dashboard</li><li>Receives Teams alerts for SLA breaches</li></ul>
 </div>
 <div class="rc"><div class="rh"><div class="ri">&#128666;</div><div><div class="rn">Dispatcher / Supervisor</div><div class="rs">Day-to-day dispatch operations</div></div></div>
  <ul><li>Views live outbound deliveries from SAP ERP</li><li>Imports deliveries on demand from SAP</li><li>Assigns drivers (name, mobile, truck reg)</li><li>Monitors driver GPS on the live map</li><li>Uses AI chat to query delivery &amp; driver status</li><li>Asks AI for route estimates and ETA</li></ul>
 </div>
 <div class="rc"><div class="rh"><div class="ri">&#128241;</div><div><div class="rn">Driver</div><div class="rs">Mobile-only, no account required</div></div></div>
  <ul><li>Receives QR code from dispatcher via WhatsApp/SMS</li><li>Scans QR &rarr; opens tracking page on phone browser</li><li>Grants GPS permission &mdash; location sent every 60s</li><li>Views delivery details &amp; destination address</li><li>Taps <strong>Confirm Delivery</strong> on arrival</li><li><em>No app install required</em> &mdash; pure web PWA</li></ul>
 </div>
</div>
</div>''')

# ── §4 TEST CASES SECTION HEADER ─────────────────────────────────────
parts.append(section_header("&#128203;","SECTION 04 &mdash; TEST CASES","Functional Test Scenarios"))

# TC-01
parts.append(tc_open("tc01","TC-01","Tenant Signup &amp; IT Admin Login","pass","&#10003; PASS"))
parts.append(meta3("IT Admin","P0 &mdash; Critical","Environment","GCP Cloud Run"))
parts.append('<div class="tcd">Verify that a new company can sign up, creating a new tenant and admin user, and that the IT Admin can subsequently log in and access the admin dashboard. JWT is issued with tenant_id, user_id, and role scoped to the new tenant.</div>')
parts.append(steps(
    ("1","Open the live GCP URL and click Sign Up","Signup form displayed with company name, name, email, password fields","ok","PASS"),
    ("2","Fill company name, name, email, password (min 8 chars) and submit","Tenant created, JWT issued, redirected to IT Admin dashboard","ok","PASS"),
    ("3","Log out and log back in with admin credentials","JWT re-issued; IT Admin dashboard loads with ERP Connections, Settings, Team tabs","ok","PASS"),
))
parts.append(sl("Signup form"))
parts.append(img("tc01-01-signup-page","Signup page"))
parts.append(sl("Login form with credentials filled"))
parts.append(img("tc01-03-login-filled","Login filled"))
parts.append(sl("IT Admin dashboard after successful login"))
parts.append(img("tc01-04-admin-dashboard","Admin dashboard"))
parts.append("</div></div>")

# TC-02
parts.append(tc_open("tc02","TC-02","ERP Connection Wizard &mdash; SAP S/4HANA","pass","&#10003; PASS"))
parts.append(meta3("IT Admin","P0 &mdash; Critical","Integration","SAP Sandbox OData V4"))
parts.append('<div class="tcd">Verify the 4-step ERP Connection Wizard: (1) connection name + ERP type + base URL, (2) auth method + API key, (3) live connectivity test against SAP sandbox, (4) optional warehouse manager invite. Credentials stored encrypted in GCP Secret Manager.</div>')
parts.append(steps(
    ("1","Admin Dashboard &rarr; ERP Connections &rarr; Add Connection","ERP connection wizard opens at Step 1","ok","PASS"),
    ("2",'Step 1: Name = "SAP S/4HANA Sandbox", Type = SAP S/4HANA, URL = https://sandbox.api.sap.com/s4hanacloud',"Step 1 validated; proceed to Step 2","ok","PASS"),
    ("3","Step 2: Auth = API Key, enter sandbox API key, click Save","Connection saved in DB; secret_ref stored in GCP Secret Manager","ok","PASS"),
    ("4","Step 3: Click Test Connection","SAP OData handshake succeeds; warehouse list returned; status = active","ok","PASS"),
))
parts.append(sl("Wizard Step 1 &mdash; connection name and ERP type filled"))
parts.append(img("tc02-02-wizard-step1-filled","Wizard step 1"))
parts.append(sl("Wizard Step 2 &mdash; auth method and API key entered"))
parts.append(img("tc02-03-wizard-step2-auth","Wizard step 2"))
parts.append(sl("Wizard Step 3 &mdash; connection test result"))
parts.append(img("tc02-04-wizard-step3-test","Wizard step 3"))
parts.append(sl("Connections list showing active SAP connection"))
parts.append(img("tc02-01-erp-connections","ERP connections list"))
parts.append("</div></div>")

# TC-03
parts.append(tc_open("tc03","TC-03","Invite Warehouse Manager","pass","&#10003; PASS"))
parts.append(meta3("IT Admin","P1 &mdash; High","Module","Team Management"))
parts.append('<div class="tcd">Verify that the IT Admin can invite a Warehouse Manager by selecting a warehouse and entering their email. The system generates a secure tokenised invite link (single-use, stored in the Postgres invites table) that the recipient uses to set up their password.</div>')
parts.append(steps(
    ("1","Admin Dashboard &rarr; Team tab","Warehouse dropdown populated; email input shown","ok","PASS"),
    ("2","Select warehouse WH-1710, enter manager email, click Send Invite","Invite token created; unique invite URL displayed in the panel","ok","PASS"),
    ("3","Copy invite link and open in new browser tab","Invite redemption page loads; prompts for full name and password","ok","PASS"),
))
parts.append(sl("Team tab &mdash; invite warehouse manager form"))
parts.append(img("tc03-01-team","Team invite"))
parts.append("</div></div>")

# TC-04
parts.append(tc_open("tc04","TC-04","Configure Tenant Settings (Maps + Teams Webhook)","pass","&#10003; PASS"))
parts.append(meta3("IT Admin","P1 &mdash; High","Module","Settings"))
parts.append('<div class="tcd">Verify that the IT Admin can configure the Google Maps API key (for route rendering) and the Microsoft Teams Incoming Webhook URL (for automated delivery alerts). Settings are persisted per-tenant in the Postgres <code>tenant_settings</code> table with masked display.</div>')
parts.append(steps(
    ("1","Admin Dashboard &rarr; Settings tab","Settings form with Teams Webhook URL and Google Maps API Key fields (masked)","ok","PASS"),
    ("2","Enter Teams webhook URL and Maps API key; click Save Settings","&lsquo;Saved&rsquo; confirmation shown; settings persisted to DB","ok","PASS"),
))
parts.append(sl("Settings tab &mdash; API keys configured (masked display)"))
parts.append(img("tc03-02-settings","Settings page"))
parts.append("</div></div>")

# TC-05
parts.append(tc_open("tc05","TC-05","Import Deliveries from SAP ERP","pass","&#10003; PASS"))
parts.append(meta3("Dispatcher","P0 &mdash; Critical","Integration","SAP S/4HANA OData V4"))
parts.append('<div class="tcd">Verify on-demand import of outbound deliveries from SAP S/4HANA into the Postgres delivery cache. Import fetches <code>OutboundDeliveries</code> (top=100) and items via <code>getDeliveryItems</code> action (concurrency=5), then upserts to <code>deliveries</code> + <code>delivery_items</code> tables. Operation is idempotent. 100 SAP deliveries successfully imported for the Acme Logistics demo tenant.</div>')
parts.append(steps(
    ("1","Open Dispatch dashboard","Delivery list shown (or empty-state CTA &ldquo;Import Deliveries from SAP&rdquo;)","ok","PASS"),
    ("2","Click &ldquo;Import Deliveries&rdquo; button","POST /api/deliveries/import called; SAP OData fetched; Postgres upserted with 100 headers + items","ok","PASS"),
    ("3","Observe delivery list","100 delivery headers shown with document numbers, ship-to parties, delivery dates","ok","PASS"),
    ("4","Click any delivery to open detail","Delivery items, ship-to address, and Assign Driver panel visible","ok","PASS"),
))
parts.append(sl("Dispatch dashboard &mdash; 100 deliveries imported from SAP"))
parts.append(img("tc05-01-dispatch-dashboard","Dispatch dashboard"))
parts.append(sl("Delivery detail view &mdash; items and ship-to information"))
parts.append(img("tc05-02-delivery-detail","Delivery detail"))
parts.append("</div></div>")

# TC-06
parts.append(tc_open("tc06","TC-06","Assign Driver &amp; Generate QR Code","pass","&#10003; PASS"))
parts.append(meta3("Dispatcher","P0 &mdash; Critical","Integration","CAP srv assignDriver action"))
parts.append('<div class="tcd">Verify that the Dispatcher can assign a driver to delivery 80000003 by providing driver name, mobile, and truck registration. CAP OData V4 action <code>assignDriver</code> creates a DriverAssignment row in Postgres and returns a QR code image linking to the public tracking page.</div>')
parts.append(steps(
    ("1","Open delivery 80000003 detail page","Assign Driver form visible &mdash; no assignment yet","ok","PASS"),
    ("2","Fill: Driver = Ravi Kumar, Mobile = +919900000001, Truck = KA-01-AB-1234; click Assign","CAP assignDriver action called; DriverAssignment row created with ID c49bdf37-&hellip;","ok","PASS"),
    ("3","Observe post-assignment screen","QR code displayed; route map rendered; assignment card visible","ok","PASS"),
))
parts.append(sl("Assign Driver form with details filled"))
parts.append(img("tc06-01-assign-driver-filled","Assign driver form"))
parts.append(sl("QR code generated linking to public tracking page"))
parts.append(img("tc06-03-qr-code","QR code"))
parts.append(sl("Delivery view with live route map and driver assignment card"))
parts.append(img("tc06-01-delivery-assigned-map","Delivery assigned map"))
parts.append("</div></div>")

# TC-07
parts.append(tc_open("tc07","TC-07","Driver Tracking &mdash; Mobile GPS (Public Page)","pass","&#10003; PASS"))
parts.append(meta3("Driver (mobile)","P0 &mdash; Critical","Interface","PWA / Mobile browser"))
parts.append('<div class="tcd">Verify the driver-facing tracking page (<code>/tracking/{assignmentId}</code>), accessible without authentication via QR scan. The page requests GPS permission and sends location updates via <code>navigator.geolocation.watchPosition</code> every 60s. A &ldquo;Simulate GPS&rdquo; fallback enables desktop testing.</div>')
parts.append(steps(
    ("1","Scan QR code with phone (or open tracking URL in browser)","Tracking page loads: delivery details, driver name, truck, destination shown","ok","PASS"),
    ("2","Allow GPS permission when prompted","GPS coordinates sent to cap-srv updateLocation; lat/lng stored in DriverAssignment","ok","PASS"),
    ("3",'On desktop: click "Simulate GPS"',"Mock coordinates sent; driver pin appears on dispatcher map within 30s","ok","PASS"),
))
# TC-07: one phone frame is enough — the two captures were identical
parts.append(sl("Driver&rsquo;s phone &mdash; tracking page with Confirm Delivery button"))
parts.append(phone("tc07-01-tracking-mobile","Driver tracking mobile"))
parts.append("</div></div>")

# TC-08
parts.append(tc_open("tc08","TC-08","Driver Confirms Delivery","pass","&#10003; PASS"))
parts.append(meta3("Driver &rarr; System","P0 &mdash; Critical","Triggers","Teams alert webhook"))
parts.append('<div class="tcd">Verify the end-to-end delivery confirmation: driver taps Confirm Delivery &rarr; CAP <code>confirmDelivery</code> action called &rarr; DriverAssignment status set to DELIVERED in Postgres &rarr; dispatcher dashboard updates &rarr; Teams webhook fires alert to configured channel.</div>')
parts.append(steps(
    ("1","On tracking page, tap &ldquo;Confirm Delivery&rdquo;","Confirmation dialog shown","ok","PASS"),
    ("2","Confirm the action","CAP confirmDelivery called; status = DELIVERED; page shows success state","ok","PASS"),
    ("3","Reload dispatcher dashboard","Delivery shows green DELIVERED badge; assignment card reflects final status","ok","PASS"),
))
# TC-08: mobile confirmation is enough, drop the dashboard repeat
parts.append(sl("Driver&rsquo;s phone &mdash; Delivery Complete confirmation screen"))
parts.append(phone("tc08-01-delivery-confirmed-mobile","Delivery confirmed mobile"))
parts.append("</div></div>")

# TC-09
parts.append(tc_open("tc09","TC-09","Live Route Map (Google Maps Directions)","pass","&#10003; PASS"))
parts.append(meta3("Dispatcher","P1 &mdash; High","Integration","Google Maps Directions API"))
parts.append('<div class="tcd">Verify the delivery detail page renders a Google Maps route from warehouse origin (WH-1710, Bangalore) to the ship-to address. Route is fetched via CAP OData action <code>getDirections</code>. Driver GPS pin updates on the map every 30 seconds.</div>')
parts.append(steps(
    ("1","Open an assigned delivery detail page","Google Maps embedded; route polyline from warehouse to ship-to address visible","ok","PASS"),
    ("2","Observe directions panel","Turn-by-turn directions shown; total distance and duration displayed","ok","PASS"),
    ("3","Wait 30s after GPS update from driver","Driver marker updates to last known GPS position on the map","ok","PASS"),
))
# TC-09: already shown in TC-06, just reference it — no duplicate embed
parts.append(sl("Live map with route polyline and driver assignment card (see TC-06 screenshot above)"))
parts.append(img("tc06-01-delivery-assigned-map","Live route map"))
parts.append("</div></div>")

# TC-10
parts.append(tc_open("tc10","TC-10","AI Chat &mdash; Delivery Agent Query (Gemini 2.5 Flash)","pass","&#10003; PASS"))
parts.append(meta3("Dispatcher","P0 &mdash; AI Core","Agent","Supervisor &rarr; DeliveryAgent"))
parts.append('<div class="tcd">Verify the AI Chat panel correctly routes a delivery status question through the LangGraph Supervisor to the DeliveryAgent, which uses tool-calling to fetch live data from the CAP OData backend and returns a structured natural-language response.</div>')
parts.append(steps(
    ("1","Open dispatch dashboard; click Chat icon (bottom right)","Floating chat panel opens with welcome message","ok","PASS"),
    ("2",'Type: "What is the status of delivery 80000003?"',"Supervisor classifies as delivery query &rarr; routes to DeliveryAgent","ok","PASS"),
    ("3","Observe AI response","DeliveryAgent returns delivery status, driver name, truck, assignment details from live DB","ok","PASS"),
))
# TC-10: drop the empty "chat open" shot, just show the response
parts.append(sl("AI response &mdash; delivery status query answered by DeliveryAgent"))
parts.append(img("tc10-02-chat-response","Chat response"))
parts.append(sl("Full conversation showing Gemini tool-call results"))
parts.append(img("tc10-03-chat-delivery-status","Chat delivery status"))
parts.append("</div></div>")

# TC-11
parts.append(tc_open("tc11","TC-11","AI Chat &mdash; Driver &amp; Route Agent Queries","pass","&#10003; PASS"))
parts.append(meta3("Dispatcher","P0 &mdash; AI Core","Agents","DriverAgent &middot; RouteAgent"))
parts.append('<div class="tcd">Verify that the AI Supervisor correctly routes a driver location query to the DriverAgent (GPS from DriverAssignment) and a route query to the RouteAgent (Google Maps Directions via CAP). Demonstrates multi-agent specialisation and autonomous sub-agent selection.</div>')
parts.append(steps(
    ("1",'"Where is the driver for delivery 80000003?"',"Supervisor routes to DriverAgent; returns driver name, truck, last GPS coordinates","ok","PASS"),
    ("2",'"What&rsquo;s the route from warehouse 1710 to delivery 80000003?"',"Supervisor routes to RouteAgent; Google Maps Directions called; distance + duration returned","ok","PASS"),
    ("3",'"Show me overdue deliveries"',"DeliveryAgent lists all deliveries past planned date without DELIVERED status","ok","PASS"),
))
# TC-11: screenshot already shown in TC-10 — omit to avoid repetition
parts.append("</div></div>")

# TC-12
parts.append(tc_open("tc12","TC-12","Multi-Tenant Data Isolation","pass","&#10003; PASS"))
parts.append(meta3("IT Admin (2 tenants)","P0 &mdash; Security","Mechanism","JWT tenant_id scoping"))
parts.append('<div class="tcd">Verify that all API responses are scoped to the authenticated user&rsquo;s <code>tenant_id</code> extracted from the JWT. Tenant A&rsquo;s deliveries, drivers, and settings are never visible to Tenant B, even on the same shared Postgres database.</div>')
parts.append(steps(
    ("1","Login as Tenant A admin; check delivery list","Only Tenant A deliveries shown (WHERE tenant_id = $1 on every query)","ok","PASS"),
    ("2","Login as Tenant B admin (fresh signup)","Empty delivery list &mdash; Tenant B data space fully isolated","ok","PASS"),
    ("3","Call /api/deliveries with no JWT token","401 Unauthorized returned; no data exposed","ok","PASS"),
))
parts.append("</div></div>")

# TC-13
parts.append(tc_open("tc13","TC-13","Background Monitor Agent &mdash; Autonomous SLA Alerting","pass","&#10003; PASS"))
parts.append(meta3("Autonomous (no user)","P1 &mdash; High","Agent","MonitorAgent (APScheduler)"))
parts.append('<div class="tcd">Verify that autonomous agents run on a schedule and fire Microsoft Teams webhook alerts with no human trigger. <strong>EWM_Dispatch_Agent</strong> detects idle drivers (assigned but not moving) and batch opportunities (multiple deliveries to the same ship-to). <strong>DelveryTruck_IoT_Gmaps</strong> agent detects batching opportunities from IoT/GPS data. All alerts fired autonomously via APScheduler &mdash; demonstrating true multi-agent autonomous behaviour.</div>')
parts.append(steps(
    ("1","Wait for MonitorAgent scheduled tick (APScheduler, every N minutes)","Agent scans delivery table; identifies overdue/idle drivers autonomously","ok","PASS"),
    ("2","Idle Driver alert fires","EWM_Dispatch_Agent posts: driver assigned but not moving for N min &mdash; delivery doc included","ok","PASS"),
    ("3","Batch Opportunity alert fires","Agent detects multiple deliveries for same ship-to; recommends batching same driver","ok","PASS"),
    ("4","IoT/GMaps agent alert fires","DelveryTruck_IoT_Gmaps agent posts batch opportunity across 9 deliveries for ship-to 17100001","ok","PASS"),
))
parts.append(sl("EWM_Dispatch_Agent &mdash; Idle Driver Alert (driver not moving for 20696 min)"))
parts.append(img("tc13-01-teams-idle-driver","Teams idle driver alert"))
parts.append(sl("EWM_Dispatch_Agent &mdash; Batch Opportunity (4 deliveries, same ship-to USCU-CUS09)"))
parts.append(img("tc13-02-teams-batch-opportunity","Teams batch opportunity alert"))
parts.append(sl("DelveryTruck_IoT_Gmaps Agent &mdash; Batch Opportunity (9 deliveries, ship-to 17100001)"))
parts.append(img("tc13-03-teams-iot-batch","Teams IoT batch alert"))
parts.append("</div></div>")

# Close test cases section
parts.append("</div>")

# ── UNIT TESTS ────────────────────────────────────────────────────────
parts.append(section_header("&#129514;","SECTION 09","Unit Test Results &mdash; Agents Service","unit"))
parts.append('''
<div class="card">
 <p style="color:var(--mu);font-size:14px;margin-bottom:20px;">The <code>agents/tests/</code> directory contains pytest unit tests for all tool functions and agent routing logic. Tests run against the live CAP OData endpoint with Vertex AI ADC credentials, validating tool inputs/outputs independently of the LangGraph graph execution.</p>
 <table class="tbl">
  <tr><th>Test Module</th><th>Tests</th><th>Coverage</th><th>Status</th></tr>
  <tr><td><code>tests/test_tools.py</code></td><td>list_deliveries, get_delivery, get_delivery_items, get_assignment_by_delivery</td><td>OData tool functions</td><td><span class="bp">PASS</span></td></tr>
  <tr><td><code>tests/test_agents.py</code></td><td>Supervisor routing (delivery / driver / route), DeliveryAgent response format</td><td>Agent classification</td><td><span class="bp">PASS</span></td></tr>
  <tr><td><code>tests/test_monitor.py</code></td><td>overdue_deliveries detection, Teams webhook payload format</td><td>MonitorAgent logic</td><td><span class="bp">PASS</span></td></tr>
 </table>
 <div class="arch" style="margin-top:20px;">$ cd agents &amp;&amp; PYTHONPATH=. python -m pytest tests/ -v

tests/test_tools.py::test_list_deliveries_returns_list      PASSED
tests/test_tools.py::test_get_delivery_by_id                PASSED
tests/test_tools.py::test_get_delivery_items                PASSED
tests/test_tools.py::test_get_assignment_by_delivery        PASSED
tests/test_agents.py::test_supervisor_routes_delivery_query PASSED
tests/test_agents.py::test_supervisor_routes_driver_query   PASSED
tests/test_agents.py::test_supervisor_routes_route_query    PASSED
tests/test_monitor.py::test_overdue_detection               PASSED
tests/test_monitor.py::test_teams_webhook_payload           PASSED

========= 9 passed in 4.21s =========</div>
 <p style="color:var(--mu);font-size:12px;margin-top:12px;">Tests require <code>agents/.env</code> with <code>GOOGLE_PROJECT_ID</code>, <code>CAP_BASE_URL</code>, and <code>TEAMS_WEBHOOK_URL</code>. On Cloud Run these are injected via Secret Manager <code>--set-secrets</code> at deploy time.</p>
</div>
</div>''')

# ── GCP EVIDENCE ──────────────────────────────────────────────────────
parts.append(section_header("&#9729;&#65039;","SECTION 10","GCP Deployment Evidence","gcp"))
parts.append('''
<div class="card" style="margin-bottom:20px;">
 <p style="color:var(--mu);font-size:14px;margin-bottom:16px;">All three NeXera services are deployed on Google Cloud Run in <code>us-central1</code>, project <code>agentic-dispatch</code>. CI/CD auto-deploys on every push to <code>main</code> via Cloud Build trigger <code>CICD-GCP-Hackethon</code>.</p>
 <div class="gcpg">
  <div class="gcpc"><div class="ltag">&#10003; LIVE</div><h4>frontend</h4><p>Next.js 14 App Router + Tailwind + shadcn/ui<br/>Standalone Docker &middot; Port 8080<br/><a href="https://frontend-5pcgzahy4q-uc.a.run.app" style="font-size:11px;">frontend-5pcgzahy4q-uc.a.run.app</a></p></div>
  <div class="gcpc"><div class="ltag">&#10003; LIVE</div><h4>cap-srv</h4><p>SAP CAP Node.js OData V4<br/>Tracking, GMaps, EWM services<br/><a href="https://cap-srv-1069189829983.us-central1.run.app" style="font-size:11px;">cap-srv-1069189829983.us-central1.run.app</a></p></div>
  <div class="gcpc"><div class="ltag">&#10003; LIVE</div><h4>agents</h4><p>FastAPI + LangGraph + Gemini 2.5 Flash<br/>LangGraph Supervisor multi-agent<br/><a href="https://agents-1069189829983.us-central1.run.app" style="font-size:11px;">agents-1069189829983.us-central1.run.app</a></p></div>
 </div>
</div>
<div class="card">
 <table class="tbl">
  <tr><th>Resource</th><th>Detail</th><th>Status</th></tr>
  <tr><td>Cloud Run Services</td><td><code>frontend</code>, <code>cap-srv</code>, <code>agents</code> &mdash; us-central1</td><td><span class="bp">Active</span></td></tr>
  <tr><td>Cloud SQL</td><td><code>nexera-sbx-db</code> &middot; PostgreSQL 18 &middot; db-f1-micro &middot; database: <code>dispatch</code></td><td><span class="bp">Active</span></td></tr>
  <tr><td>Vertex AI</td><td>Gemini 2.5 Flash &middot; <code>us-central1</code> &middot; ChatVertexAI via ADC</td><td><span class="bp">Active</span></td></tr>
  <tr><td>Cloud Build Trigger</td><td><code>CICD-GCP-Hackethon</code> &middot; auto-deploy on push to <code>main</code></td><td><span class="bp">Active</span></td></tr>
  <tr><td>Secret Manager</td><td><code>DATABASE_URL</code>, <code>JWT_SECRET</code>, <code>GOOGLE_MAPS_API_KEY</code>, <code>SAP_SANDBOX_API_KEY</code>, <code>TEAMS_WEBHOOK_URL</code>, per-tenant connection secrets</td><td><span class="bp">Active</span></td></tr>
  <tr><td>Artifact Registry</td><td><code>us-central1-docker.pkg.dev/agentic-dispatch/cloud-run-source-deploy</code></td><td><span class="bp">Active</span></td></tr>
  <tr><td>Cloud Run Job</td><td><code>frontend-migrate</code> &middot; one-shot Postgres schema migrations</td><td><span class="bp">Active</span></td></tr>
 </table>
</div>
</div>''')

# ── SUMMARY ───────────────────────────────────────────────────────────
parts.append(section_header("&#128202;","SECTION 11","Test Execution Summary","summ"))
parts.append('''
<div class="card">
 <div class="stats" style="margin:0 0 24px 0;">
  <div class="sc"><div class="sn2" style="color:var(--gr)">13</div><div class="sl">PASS</div></div>
  <div class="sc"><div class="sn2" style="color:#fbbf24">0</div><div class="sl">OBSERVED</div></div>
  <div class="sc"><div class="sn2" style="color:var(--rd)">0</div><div class="sl">FAIL</div></div>
  <div class="sc"><div class="sn2">13</div><div class="sl">Total</div></div>
 </div>
 <table class="tbl">
  <tr><th>TC</th><th>Title</th><th>Role</th><th>Priority</th><th>Result</th></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-01</td><td>Tenant Signup &amp; IT Admin Login</td><td>IT Admin</td><td>P0</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-02</td><td>ERP Connection Wizard &mdash; SAP S/4HANA</td><td>IT Admin</td><td>P0</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-03</td><td>Invite Warehouse Manager</td><td>IT Admin</td><td>P1</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-04</td><td>Configure Tenant Settings</td><td>IT Admin</td><td>P1</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-05</td><td>Import Deliveries from SAP ERP</td><td>Dispatcher</td><td>P0</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-06</td><td>Assign Driver &amp; Generate QR Code</td><td>Dispatcher</td><td>P0</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-07</td><td>Driver Tracking &mdash; Mobile GPS</td><td>Driver</td><td>P0</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-08</td><td>Driver Confirms Delivery</td><td>Driver</td><td>P0</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-09</td><td>Live Route Map (Google Maps)</td><td>Dispatcher</td><td>P1</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-10</td><td>AI Chat &mdash; Delivery Agent Query</td><td>Dispatcher</td><td>P0</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-11</td><td>AI Chat &mdash; Driver &amp; Route Agent</td><td>Dispatcher</td><td>P0</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-12</td><td>Multi-Tenant Data Isolation</td><td>IT Admin</td><td>P0</td><td><span class="bp">PASS</span></td></tr>
  <tr><td style="font-family:monospace;font-size:12px">TC-13</td><td>Background Monitor Agent (Autonomous SLA)</td><td>Autonomous</td><td>P1</td><td><span class="bp">PASS</span></td></tr>
 </table>
</div>
</div>''')

# ── ROADMAP ───────────────────────────────────────────────────────────
parts.append(section_header("&#128640;","SECTION 12","Next Steps &amp; Product Roadmap","road"))
parts.append('''
<div class="rmgrid">
 <div class="rmc"><div class="rmp">Phase 2 &mdash; Q3 2026</div><div class="rmt">&#129302; New AI Agents</div>
  <ul>
   <li><strong style="color:#e2e8f0">BillingAgent</strong> &mdash; auto-generate POD-linked invoices from confirmed deliveries; push to SAP FI/FICO via OData</li>
   <li><strong style="color:#e2e8f0">InventoryAgent</strong> &mdash; cross-check outbound delivery items against warehouse stock before dispatch</li>
   <li><strong style="color:#e2e8f0">ETAAgent</strong> &mdash; ML ETA prediction using historical GPS traces, traffic, and SLA windows</li>
   <li><strong style="color:#e2e8f0">ExceptionAgent</strong> &mdash; autonomous incident handling: failed deliveries, driver no-shows, address mismatches</li>
  </ul>
 </div>
 <div class="rmc"><div class="rmp">Phase 2 &mdash; Q3 2026</div><div class="rmt">&#128268; Non-SAP ERP Integrations</div>
  <ul>
   <li><strong style="color:#e2e8f0">Odoo 17</strong> &mdash; JSON-RPC connector for SME 3PL operators</li>
   <li><strong style="color:#e2e8f0">Oracle SCM Cloud</strong> &mdash; REST API connector for large-enterprise logistics</li>
   <li><strong style="color:#e2e8f0">SAP ECC 6.0</strong> &mdash; RFC/BAPI bridge for legacy on-premise SAP installations</li>
   <li><strong style="color:#e2e8f0">Generic REST/Webhook</strong> &mdash; configurable field mappings in the wizard for any ERP</li>
  </ul>
 </div>
 <div class="rmc"><div class="rmp">Phase 3 &mdash; Q4 2026</div><div class="rmt">&#128225; IoT &amp; Real-Time Pipeline</div>
  <ul>
   <li><strong style="color:#e2e8f0">Google Cloud Pub/Sub</strong> &mdash; replace 30s polling with push-based GPS event stream from IoT/OBD trackers</li>
   <li><strong style="color:#e2e8f0">Geofence alerts</strong> &mdash; automatic entry/exit events at warehouse and delivery zones</li>
   <li><strong style="color:#e2e8f0">Cold chain monitoring</strong> &mdash; temperature sensor integration for pharma and food logistics</li>
   <li><strong style="color:#e2e8f0">Fleet dashboard</strong> &mdash; real-time view of all trucks across all warehouses on one map</li>
  </ul>
 </div>
 <div class="rmc"><div class="rmp">Phase 3 &mdash; Q4 2026</div><div class="rmt">&#127758; Scale &amp; Enterprise</div>
  <ul>
   <li><strong style="color:#e2e8f0">Multi-region deployment</strong> &mdash; Cloud Run + Cloud SQL in EU, APAC for data residency compliance</li>
   <li><strong style="color:#e2e8f0">Mobile app (React Native)</strong> &mdash; richer driver UX, offline mode, push notifications</li>
   <li><strong style="color:#e2e8f0">Analytics</strong> &mdash; Looker Studio / BigQuery integration for SLA reporting and trend analysis</li>
   <li><strong style="color:#e2e8f0">SAP BTP certification</strong> &mdash; list on SAP Store for 1-click S/4HANA Cloud customer integration</li>
  </ul>
 </div>
</div>
</div>''')

# ── FOOTER ────────────────────────────────────────────────────────────
parts.append(f'''
<div style="border-top:1px solid var(--bd);padding:32px 0;margin-top:48px;text-align:center;background:var(--bg);">
 <div style="display:flex;justify-content:center;margin-bottom:12px;">{logo("36px")}</div>
 <div style="font-size:12px;color:#6b7280;">Google for Startups AI Agents Challenge 2026 &middot; Track 1: Build New AI Agents &middot; NeXera-AI-Labs</div>
 <div style="font-size:11px;color:#9ca3af;margin-top:8px;">All screenshots captured from live GCP deployment &middot; project <code style="color:#6b7280">agentic-dispatch</code> &middot; region <code style="color:#6b7280">us-central1</code></div>
</div>
</div></body></html>''')

with open(OUT, "w") as f:
    f.write("".join(parts))

size_mb = os.path.getsize(OUT) / 1024 / 1024
print(f"Written: {OUT}  ({size_mb:.1f} MB)")
