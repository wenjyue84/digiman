const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname);
const outputPath = path.join('C:', 'Users', 'Jyue', 'Desktop', 'RainbowAI.html');

function img(filename) {
  const b64Path = path.join(screenshotsDir, filename.replace('.png', '.b64'));
  if (fs.existsSync(b64Path)) {
    const data = fs.readFileSync(b64Path, 'utf8').trim();
    return `data:image/png;base64,${data}`;
  }
  return '';
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rainbow AI - User Manual</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  :root {
    --rainbow-1: #FF6B6B;
    --rainbow-2: #FFA94D;
    --rainbow-3: #FFD93D;
    --rainbow-4: #6BCB77;
    --rainbow-5: #4D96FF;
    --rainbow-6: #9B59B6;
    --primary: #0ea5e9;
    --primary-dark: #0284c7;
    --bg: #f8fafc;
    --card: #ffffff;
    --text: #1e293b;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --success: #22c55e;
    --warning: #f59e0b;
    --info: #3b82f6;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.7;
    font-size: 16px;
  }

  /* ===== HERO ===== */
  .hero {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    color: white;
    padding: 80px 40px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 6px;
    background: linear-gradient(90deg, var(--rainbow-1), var(--rainbow-2), var(--rainbow-3), var(--rainbow-4), var(--rainbow-5), var(--rainbow-6));
  }
  .hero::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 6px;
    background: linear-gradient(90deg, var(--rainbow-6), var(--rainbow-5), var(--rainbow-4), var(--rainbow-3), var(--rainbow-2), var(--rainbow-1));
  }
  .hero-rainbow {
    font-size: 80px;
    margin-bottom: 16px;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
  }
  .hero h1 {
    font-size: 52px;
    font-weight: 900;
    letter-spacing: -1.5px;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .hero .subtitle {
    font-size: 22px;
    color: #94a3b8;
    font-weight: 300;
    margin-bottom: 32px;
  }
  .hero .version-badge {
    display: inline-block;
    background: rgba(14, 165, 233, 0.2);
    border: 1px solid rgba(14, 165, 233, 0.4);
    color: #7dd3fc;
    padding: 6px 20px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 500;
  }
  .hero .tagline {
    font-size: 16px;
    color: #64748b;
    margin-top: 24px;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  /* ===== LAYOUT ===== */
  .container {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* ===== TOC ===== */
  .toc {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 40px;
    margin: -40px auto 48px;
    max-width: 960px;
    position: relative;
    z-index: 10;
    box-shadow: 0 20px 60px rgba(0,0,0,0.08);
  }
  .toc h2 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 24px;
    color: var(--text);
  }
  .toc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  .toc-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    text-decoration: none;
    color: var(--text);
    transition: all 0.2s;
    border: 1px solid transparent;
  }
  .toc-item:hover {
    background: #f1f5f9;
    border-color: var(--border);
  }
  .toc-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    color: white;
    flex-shrink: 0;
  }
  .toc-item-text {
    font-size: 15px;
    font-weight: 500;
  }

  /* ===== SECTIONS ===== */
  .section {
    margin-bottom: 64px;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--border);
  }
  .section-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    font-size: 24px;
    color: white;
    flex-shrink: 0;
  }
  .section-header h2 {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }
  .section-header .section-num {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* ===== CONTENT ===== */
  p { margin-bottom: 16px; color: #334155; }

  .screenshot {
    margin: 32px 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    border: 1px solid var(--border);
  }
  .screenshot img {
    width: 100%;
    display: block;
  }
  .screenshot-caption {
    background: #f8fafc;
    padding: 12px 20px;
    font-size: 14px;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    text-align: center;
    font-style: italic;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    margin: 24px 0;
  }
  .feature-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    transition: all 0.2s;
  }
  .feature-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    transform: translateY(-2px);
  }
  .feature-card .icon {
    font-size: 32px;
    margin-bottom: 12px;
  }
  .feature-card h4 {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .feature-card p {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 0;
  }

  .highlight-box {
    background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
    border: 1px solid #bfdbfe;
    border-left: 4px solid var(--info);
    border-radius: 12px;
    padding: 20px 24px;
    margin: 24px 0;
  }
  .highlight-box.success {
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border-color: #bbf7d0;
    border-left-color: var(--success);
  }
  .highlight-box.warning {
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border-color: #fde68a;
    border-left-color: var(--warning);
  }
  .highlight-box h4 {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .highlight-box p, .highlight-box li {
    font-size: 14px;
    margin-bottom: 4px;
  }
  .highlight-box ul {
    padding-left: 20px;
  }

  .steps {
    counter-reset: step;
    list-style: none;
    padding: 0;
    margin: 24px 0;
  }
  .steps li {
    counter-increment: step;
    display: flex;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid #f1f5f9;
    align-items: flex-start;
  }
  .steps li:last-child { border-bottom: none; }
  .steps li::before {
    content: counter(step);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    background: var(--primary);
    color: white;
    border-radius: 50%;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .steps li strong {
    display: block;
    font-size: 15px;
    margin-bottom: 4px;
  }
  .steps li span {
    font-size: 14px;
    color: var(--text-muted);
  }

  .advantage-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin: 32px 0;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  .advantage-item {
    padding: 28px 20px;
    text-align: center;
    color: white;
  }
  .advantage-item .num {
    font-size: 36px;
    font-weight: 900;
    margin-bottom: 4px;
  }
  .advantage-item .label {
    font-size: 13px;
    font-weight: 500;
    opacity: 0.9;
  }

  .mode-table {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .mode-table th {
    background: #1e293b;
    color: white;
    padding: 14px 20px;
    text-align: left;
    font-size: 14px;
    font-weight: 600;
  }
  .mode-table td {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
  }
  .mode-table tr:nth-child(even) td {
    background: #f8fafc;
  }
  .mode-table tr:last-child td {
    border-bottom: none;
  }

  .tier-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin: 12px 0;
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }
  .tier-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    height: 44px;
    border-radius: 10px;
    color: white;
    font-weight: 800;
    font-size: 16px;
    flex-shrink: 0;
  }
  .tier-card h4 { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .tier-card p { font-size: 14px; color: var(--text-muted); margin-bottom: 0; }
  .tier-card .speed { font-size: 12px; font-weight: 600; color: var(--success); }

  /* ===== FAQ ===== */
  .faq-item {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin: 12px 0;
  }
  .faq-item h4 {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 8px;
    color: var(--primary-dark);
  }
  .faq-item p {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 0;
  }

  /* ===== FOOTER ===== */
  .footer {
    background: #0f172a;
    color: #94a3b8;
    padding: 48px 24px;
    text-align: center;
    margin-top: 64px;
  }
  .footer .brand {
    font-size: 24px;
    font-weight: 800;
    color: white;
    margin-bottom: 8px;
  }
  .footer p { color: #64748b; font-size: 14px; }

  /* ===== PRINT ===== */
  @media print {
    .hero { padding: 40px 20px; }
    .section { page-break-inside: avoid; }
    .screenshot { box-shadow: none; border: 1px solid #ccc; }
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .hero h1 { font-size: 32px; }
    .hero .subtitle { font-size: 18px; }
    .advantage-strip { grid-template-columns: repeat(2, 1fr); }
    .toc-grid { grid-template-columns: 1fr; }
    .feature-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<!-- ===== HERO ===== -->
<div class="hero">
  <div class="hero-rainbow">&#127752;</div>
  <h1>Rainbow AI</h1>
  <p class="subtitle">Intelligent WhatsApp Assistant for Hospitality</p>
  <span class="version-badge">User Manual &mdash; v2.0</span>
  <p class="tagline">Your complete guide to setting up, training, and managing your AI-powered WhatsApp concierge that handles guest inquiries 24/7.</p>
</div>

<!-- ===== TABLE OF CONTENTS ===== -->
<div class="toc container">
  <h2>&#128214; Table of Contents</h2>
  <div class="toc-grid">
    <a href="#intro" class="toc-item">
      <span class="toc-num" style="background:var(--rainbow-5)">1</span>
      <span class="toc-item-text">What is Rainbow AI?</span>
    </a>
    <a href="#dashboard" class="toc-item">
      <span class="toc-num" style="background:var(--rainbow-4)">2</span>
      <span class="toc-item-text">Dashboard Overview</span>
    </a>
    <a href="#livechat" class="toc-item">
      <span class="toc-num" style="background:var(--rainbow-4)">3</span>
      <span class="toc-item-text">Live Chat &amp; WhatsApp</span>
    </a>
    <a href="#understanding" class="toc-item">
      <span class="toc-num" style="background:var(--rainbow-3)">4</span>
      <span class="toc-item-text">Training AI Understanding</span>
    </a>
    <a href="#routing" class="toc-item">
      <span class="toc-num" style="background:var(--rainbow-3)">5</span>
      <span class="toc-item-text">Smart Routing</span>
    </a>
    <a href="#responses" class="toc-item">
      <span class="toc-num" style="background:var(--rainbow-3)">6</span>
      <span class="toc-item-text">Responses &amp; Knowledge Base</span>
    </a>
    <a href="#simulator" class="toc-item">
      <span class="toc-num" style="background:var(--rainbow-2)">7</span>
      <span class="toc-item-text">Chat Simulator &amp; Testing</span>
    </a>
    <a href="#performance" class="toc-item">
      <span class="toc-num" style="background:var(--rainbow-1)">8</span>
      <span class="toc-item-text">Performance &amp; Analytics</span>
    </a>
    <a href="#settings" class="toc-item">
      <span class="toc-num" style="background:var(--rainbow-6)">9</span>
      <span class="toc-item-text">Settings &amp; Configuration</span>
    </a>
    <a href="#faq" class="toc-item">
      <span class="toc-num" style="background:#64748b">10</span>
      <span class="toc-item-text">FAQ &amp; Tips</span>
    </a>
  </div>
</div>

<div class="container">

<!-- ===== 1. INTRODUCTION ===== -->
<div class="section" id="intro">
  <div class="section-header">
    <div class="section-icon" style="background:var(--rainbow-5)">&#127752;</div>
    <div>
      <div class="section-num">Section 1</div>
      <h2>What is Rainbow AI?</h2>
    </div>
  </div>

  <p><strong>Rainbow AI</strong> is an intelligent WhatsApp assistant designed specifically for the hospitality industry. It automatically handles guest messages on WhatsApp &mdash; answering questions about rooms, amenities, check-in procedures, pricing, WiFi access, and much more &mdash; in <strong>multiple languages</strong> including English, Malay, and Chinese.</p>

  <p>Think of Rainbow AI as your <strong>24/7 virtual front desk assistant</strong> that never sleeps, never takes a day off, and responds to every guest message within seconds. It understands what guests are asking, provides accurate answers from your knowledge base, and seamlessly escalates complex issues to your human staff when needed.</p>

  <div class="advantage-strip">
    <div class="advantage-item" style="background:var(--rainbow-5)">
      <div class="num">24/7</div>
      <div class="label">Always Available</div>
    </div>
    <div class="advantage-item" style="background:var(--rainbow-4)">
      <div class="num">3+</div>
      <div class="label">Languages Supported</div>
    </div>
    <div class="advantage-item" style="background:var(--rainbow-2)">
      <div class="num">&lt;2s</div>
      <div class="label">Response Time</div>
    </div>
    <div class="advantage-item" style="background:var(--rainbow-6)">
      <div class="num">96%</div>
      <div class="label">Intent Accuracy</div>
    </div>
  </div>

  <div class="feature-grid">
    <div class="feature-card">
      <div class="icon">&#128172;</div>
      <h4>Automatic Guest Replies</h4>
      <p>Instantly answers common questions about WiFi passwords, check-in times, room prices, facilities, and directions &mdash; without staff involvement.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#127760;</div>
      <h4>Multi-Language Support</h4>
      <p>Communicates fluently in English, Bahasa Malaysia, and Chinese. Automatically detects the guest's language and responds accordingly.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#129302;</div>
      <h4>Smart AI Classification</h4>
      <p>Uses a 4-tier intelligence system to understand guest messages with high accuracy. From keyword matching to advanced AI models &mdash; it gets smarter over time.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#128101;</div>
      <h4>Live Chat &amp; Takeover</h4>
      <p>Staff can monitor all conversations in real-time. Switch to manual mode at any time to handle special requests personally.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#9889;</div>
      <h4>Escalation System</h4>
      <p>Automatically routes emergencies, complaints, and complex requests to your staff. Never miss an urgent guest issue.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#128202;</div>
      <h4>Performance Analytics</h4>
      <p>Track response times, satisfaction rates, message volumes, and AI accuracy. Data-driven insights to continuously improve guest experience.</p>
    </div>
  </div>
</div>

<!-- ===== 2. DASHBOARD ===== -->
<div class="section" id="dashboard">
  <div class="section-header">
    <div class="section-icon" style="background:var(--rainbow-4)">&#128200;</div>
    <div>
      <div class="section-num">Section 2</div>
      <h2>Dashboard Overview</h2>
    </div>
  </div>

  <p>The <strong>Dashboard</strong> is your home screen and control center. Every time you open Rainbow AI, this is the first thing you see. It gives you a quick overview of everything that matters: WhatsApp connection status, AI model health, recent messages, and quick shortcuts to common tasks.</p>

  <div class="screenshot">
    <img src="${img('01-dashboard-full.png')}" alt="Rainbow AI Dashboard" loading="lazy">
    <div class="screenshot-caption">Figure 2.1 &mdash; Rainbow AI Dashboard showing WhatsApp status, AI models, quick stats, and server health</div>
  </div>

  <h3 style="margin: 24px 0 16px; font-size: 20px;">What You&rsquo;ll See on the Dashboard</h3>

  <div class="feature-grid">
    <div class="feature-card">
      <div class="icon">&#128640;</div>
      <h4>Quick Setup Checklist</h4>
      <p>When you first start, a guided checklist walks you through connecting WhatsApp, training your first intent, and testing the AI. You can dismiss it once done.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#128241;</div>
      <h4>WhatsApp Instances</h4>
      <p>Shows your connected WhatsApp number(s), their status (online/offline), and when they were last active. Add new numbers or manage existing ones here.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#129302;</div>
      <h4>AI Models Status</h4>
      <p>Displays all configured AI models, their readiness status, and response times. A green indicator means the model is ready; you can click &ldquo;Settings&rdquo; to configure them.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#128202;</div>
      <h4>Quick Stats</h4>
      <p>Four key metrics at a glance: Messages Handled, Intent Accuracy, Average Response Time, and Guest Satisfaction Rate.</p>
    </div>
  </div>

  <div class="highlight-box success">
    <h4>&#9989; Quick Actions</h4>
    <p>The Dashboard provides three shortcut buttons to your most common tasks:</p>
    <ul>
      <li><strong>Pair WhatsApp</strong> &mdash; Opens the QR code scanner to connect a new WhatsApp number</li>
      <li><strong>Train Intent</strong> &mdash; Jumps to the Understanding tab where you can teach the AI new skills</li>
      <li><strong>Test Chat</strong> &mdash; Opens the Chat Simulator so you can test how the AI responds</li>
    </ul>
  </div>

  <p>At the bottom, the <strong>Server Connection</strong> panel shows the health of all three system components (MCP Server, Backend API, and Frontend), while <strong>Recent Activity</strong> provides a live feed of the latest events.</p>
</div>

<!-- ===== 3. LIVE CHAT ===== -->
<div class="section" id="livechat">
  <div class="section-header">
    <div class="section-icon" style="background:var(--rainbow-4)">&#128172;</div>
    <div>
      <div class="section-num">Section 3</div>
      <h2>Live Chat &amp; WhatsApp</h2>
    </div>
  </div>

  <p>The <strong>Live Chat</strong> tab is where you manage all real-time WhatsApp conversations with your guests. It works just like WhatsApp Web, but with powerful AI features built in. You can monitor conversations, take over from the AI, and manage guest information &mdash; all from one screen.</p>

  <div class="screenshot">
    <img src="${img('02-live-chat.png')}" alt="Rainbow AI Live Chat" loading="lazy">
    <div class="screenshot-caption">Figure 3.1 &mdash; Live Chat showing guest conversations with WhatsApp-style message bubbles, search, and filters</div>
  </div>

  <h3 style="margin: 24px 0 16px; font-size: 20px;">Three Response Modes</h3>
  <p>Rainbow AI gives you full control over how it handles conversations. Choose the mode that fits your needs:</p>

  <table class="mode-table">
    <thead>
      <tr>
        <th>Mode</th>
        <th>Icon</th>
        <th>How It Works</th>
        <th>Best For</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Autopilot</strong></td>
        <td>&#9992;&#65039;</td>
        <td>AI reads the guest message and sends a reply automatically. No staff intervention needed.</td>
        <td>After-hours, routine questions (WiFi, directions, pricing)</td>
      </tr>
      <tr>
        <td><strong>Copilot</strong></td>
        <td>&#129309;</td>
        <td>AI drafts a suggested reply, but waits for you to review and approve before sending. You can edit the suggestion.</td>
        <td>Important conversations, complex bookings, new staff training</td>
      </tr>
      <tr>
        <td><strong>Manual</strong></td>
        <td>&#9997;&#65039;</td>
        <td>AI stays silent. You write all replies yourself. A &ldquo;Help me&rdquo; button is available if you need AI assistance.</td>
        <td>Sensitive issues, complaints, VIP guests</td>
      </tr>
    </tbody>
  </table>

  <h3 style="margin: 24px 0 16px; font-size: 20px;">Key Features</h3>

  <div class="feature-grid">
    <div class="feature-card">
      <div class="icon">&#128269;</div>
      <h4>Search &amp; Filters</h4>
      <p>Search conversations by guest name or phone number. Filter by date range, or use quick chips: All, Unread, Favourites, or Groups.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#127760;</div>
      <h4>Translation Mode</h4>
      <p>Toggle the translation icon to automatically translate messages. Choose the target language and see both the original and translated text.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#128100;</div>
      <h4>Contact Details</h4>
      <p>Click a guest&rsquo;s name to open their profile sidebar. View and edit their name, email, check-in/out dates, room assignment, and internal notes.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#128206;</div>
      <h4>File Sharing</h4>
      <p>Send photos, documents, and videos to guests directly from the chat. Perfect for sharing maps, receipts, or promotional materials.</p>
    </div>
  </div>

  <div class="highlight-box">
    <h4>&#128161; How to Switch Response Modes</h4>
    <p>In the chat header (top right area), you&rsquo;ll see the current mode displayed next to the guest&rsquo;s name. Click on it to switch between Autopilot, Copilot, and Manual modes. The change takes effect immediately for that conversation.</p>
  </div>
</div>

<!-- ===== 4. UNDERSTANDING ===== -->
<div class="section" id="understanding">
  <div class="section-header">
    <div class="section-icon" style="background:var(--rainbow-3)">&#129504;</div>
    <div>
      <div class="section-num">Section 4</div>
      <h2>Training AI Understanding</h2>
    </div>
  </div>

  <p>The <strong>Understanding</strong> tab is the brain of Rainbow AI. This is where you teach the AI to recognize what guests are asking about. Rainbow uses a powerful <strong>4-tier classification system</strong> that combines speed with intelligence.</p>

  <div class="screenshot">
    <img src="${img('03-understanding.png')}" alt="Understanding / Intent Detection" loading="lazy">
    <div class="screenshot-caption">Figure 4.1 &mdash; Understanding tab showing the 4-tier intent detection system with test console and configuration templates</div>
  </div>

  <h3 style="margin: 24px 0 16px; font-size: 20px;">The 4-Tier Intelligence System</h3>
  <p>When a guest sends a message, Rainbow processes it through four layers of understanding, from fastest to most intelligent:</p>

  <div class="tier-card">
    <div class="tier-badge" style="background:#ef4444">T1</div>
    <div>
      <h4>&#128680; Priority Keywords (Emergency Patterns)</h4>
      <p>Lightning-fast pattern matching for urgent situations like emergencies, fire, or medical issues. Processes in under 0.1 milliseconds.</p>
      <span class="speed">Speed: ~0.1ms</span>
    </div>
  </div>

  <div class="tier-card">
    <div class="tier-badge" style="background:#f59e0b">T2</div>
    <div>
      <h4>&#128270; Smart Matching (Keywords)</h4>
      <p>Fuzzy keyword matching that catches common guest inquiries like &ldquo;wifi password&rdquo;, &ldquo;check in time&rdquo;, or &ldquo;how much room&rdquo;. Works across English, Malay, and Chinese keywords.</p>
      <span class="speed">Speed: ~1ms</span>
    </div>
  </div>

  <div class="tier-card">
    <div class="tier-badge" style="background:var(--primary)">T3</div>
    <div>
      <h4>&#128218; Learning Examples (Semantic Matching)</h4>
      <p>Uses AI embeddings to understand the meaning behind messages, even if the exact words don&rsquo;t match your keywords. Train it with example phrases and it learns similar ones automatically.</p>
      <span class="speed">Speed: ~50ms</span>
    </div>
  </div>

  <div class="tier-card">
    <div class="tier-badge" style="background:var(--rainbow-6)">T4</div>
    <div>
      <h4>&#129302; AI Fallback (Large Language Model)</h4>
      <p>For complex or ambiguous messages, a full AI model analyzes the conversation context and provides an intelligent response. This is the most powerful tier.</p>
      <span class="speed">Speed: ~100&ndash;500ms</span>
    </div>
  </div>

  <div class="highlight-box success">
    <h4>&#127775; Quick Setup Templates</h4>
    <p>Don&rsquo;t want to configure each tier manually? Choose from <strong>7 pre-optimized templates</strong> that set up the entire system in one click:</p>
    <ul>
      <li><strong>T3 Balanced</strong> (Default &mdash; recommended) &mdash; 92&ndash;95% accuracy, great balance of speed and quality</li>
      <li><strong>T1 Maximum Quality</strong> &mdash; 95&ndash;98% accuracy, uses more AI resources</li>
      <li><strong>T2 High Performance</strong> &mdash; Fastest possible responses, keyword-only</li>
      <li><strong>T5 Tiered-Hybrid</strong> &mdash; Research-backed optimal settings</li>
      <li>&hellip;and more for special cases like emergencies or multi-language focus</li>
    </ul>
  </div>

  <h3 style="margin: 24px 0 16px; font-size: 20px;">Test Console</h3>
  <p>The <strong>Test Console</strong> (always visible on the right side) lets you instantly test how Rainbow classifies any message. Type a phrase like &ldquo;What&rsquo;s the WiFi password?&rdquo; and see exactly which tier caught it, what intent was detected, and with what confidence level. This is invaluable for verifying your training changes.</p>
</div>

<!-- ===== 5. SMART ROUTING ===== -->
<div class="section" id="routing">
  <div class="section-header">
    <div class="section-icon" style="background:var(--rainbow-3)">&#128268;</div>
    <div>
      <div class="section-num">Section 5</div>
      <h2>Smart Routing</h2>
    </div>
  </div>

  <p><strong>Smart Routing</strong> is the decision-making layer that determines what happens <em>after</em> Rainbow understands a guest&rsquo;s message. While the Understanding tab figures out <em>what</em> the guest is asking, Smart Routing decides <em>what action to take</em>.</p>

  <div class="screenshot">
    <img src="${img('04-smart-routing.png')}" alt="Smart Routing" loading="lazy">
    <div class="screenshot-caption">Figure 5.1 &mdash; Smart Routing showing intent-to-action mapping with visual routing configuration</div>
  </div>

  <h3 style="margin: 24px 0 16px; font-size: 20px;">Routing Actions</h3>
  <p>For each recognized intent, you can assign one of these actions:</p>

  <table class="mode-table">
    <thead>
      <tr>
        <th>Action</th>
        <th>Description</th>
        <th>Example Use Case</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Static Reply</strong></td>
        <td>Sends an instant, pre-written message</td>
        <td>&ldquo;What&rsquo;s the WiFi password?&rdquo; &rarr; sends WiFi info immediately</td>
      </tr>
      <tr>
        <td><strong>LLM Reply</strong></td>
        <td>AI generates a personalized response using your knowledge base</td>
        <td>&ldquo;Tell me about nearby restaurants&rdquo; &rarr; AI crafts a helpful answer</td>
      </tr>
      <tr>
        <td><strong>Start Workflow</strong></td>
        <td>Launches a multi-step interactive process</td>
        <td>&ldquo;I want to book a room&rdquo; &rarr; starts booking conversation</td>
      </tr>
      <tr>
        <td><strong>Escalate to Staff</strong></td>
        <td>Forwards the conversation to a human operator</td>
        <td>&ldquo;I have a complaint&rdquo; &rarr; staff notification</td>
      </tr>
    </tbody>
  </table>

  <div class="highlight-box">
    <h4>&#128161; How It Works Together</h4>
    <p>Guest sends &ldquo;I need to book a capsule for tonight&rdquo; &rarr; <strong>Understanding</strong> detects the <em>booking</em> intent &rarr; <strong>Smart Routing</strong> maps this to &ldquo;Start Booking Workflow&rdquo; &rarr; Rainbow begins the multi-step booking conversation automatically.</p>
  </div>
</div>

<!-- ===== 6. RESPONSES & KB ===== -->
<div class="section" id="responses">
  <div class="section-header">
    <div class="section-icon" style="background:var(--rainbow-3)">&#128172;</div>
    <div>
      <div class="section-num">Section 6</div>
      <h2>Responses &amp; Knowledge Base</h2>
    </div>
  </div>

  <p>The <strong>Responses</strong> tab is where you manage everything Rainbow AI says to guests. From quick one-line replies to complex multi-step workflows, this is your content control center.</p>

  <div class="screenshot">
    <img src="${img('05-responses.png')}" alt="Responses & Knowledge Base" loading="lazy">
    <div class="screenshot-caption">Figure 6.1 &mdash; Responses tab with sub-tabs for Quick Replies, System Messages, Workflows, and Knowledge Base</div>
  </div>

  <h3 style="margin: 24px 0 16px; font-size: 20px;">Four Sub-Sections</h3>

  <div class="feature-grid">
    <div class="feature-card">
      <div class="icon">&#9889;</div>
      <h4>Quick Replies</h4>
      <p>Pre-written answers for common questions. Organized by category (General, Pre-arrival, Check-in, During Stay, Check-out, Issues). Each reply supports multiple languages.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#9881;&#65039;</div>
      <h4>System Messages</h4>
      <p>Technical messages like error notices, rate limit warnings, &ldquo;thinking&rdquo; placeholders, and default fallback responses. These ensure smooth communication even in edge cases.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#128736;&#65039;</div>
      <h4>Smart Workflows</h4>
      <p>Multi-step interactive conversations for complex tasks like bookings, check-ins, and complaint handling. Visual workflow builder with conditions and actions.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#128218;</div>
      <h4>Knowledge Base</h4>
      <p>Your property&rsquo;s information library. Edit markdown files covering pricing, facilities, WiFi, rules, location, and more. The AI uses these to generate informed answers.</p>
    </div>
  </div>

  <div class="highlight-box success">
    <h4>&#128218; Knowledge Base &mdash; Your AI&rsquo;s Memory</h4>
    <p>The Knowledge Base uses a <strong>progressive loading system</strong> that only loads relevant topic files when answering a guest&rsquo;s question. This means the AI uses up to <strong>60&ndash;70% fewer tokens</strong> compared to loading everything at once, making it both faster and more cost-effective. You can edit knowledge files directly in the browser with a live preview.</p>
  </div>
</div>

<!-- ===== 7. CHAT SIMULATOR ===== -->
<div class="section" id="simulator">
  <div class="section-header">
    <div class="section-icon" style="background:var(--rainbow-2)">&#129514;</div>
    <div>
      <div class="section-num">Section 7</div>
      <h2>Chat Simulator &amp; Testing</h2>
    </div>
  </div>

  <p>The <strong>Chat Simulator</strong> is your testing playground. Before deploying any changes to production, you can test how Rainbow responds to different guest messages. It offers two modes: <strong>Quick Test</strong> for rapid single-message testing, and <strong>Live Simulation</strong> for monitoring actual WhatsApp conversations.</p>

  <div class="screenshot">
    <img src="${img('06-chat-simulator.png')}" alt="Chat Simulator" loading="lazy">
    <div class="screenshot-caption">Figure 7.1 &mdash; Chat Simulator with Quick Test mode, Autotest suite, and session management</div>
  </div>

  <h3 style="margin: 24px 0 16px; font-size: 20px;">Quick Test Mode</h3>
  <p>Type any guest message and see how Rainbow would respond. The interface shows you:</p>
  <ul style="padding-left: 24px; margin-bottom: 24px;">
    <li>The <strong>AI&rsquo;s response</strong> in a chat bubble format</li>
    <li>Which <strong>intent</strong> was detected (e.g., &ldquo;wifi_inquiry&rdquo;, &ldquo;booking_request&rdquo;)</li>
    <li>The <strong>confidence level</strong> (how sure the AI is about its classification)</li>
    <li>Which <strong>tier</strong> handled it (T1, T2, T3, or T4)</li>
  </ul>

  <h3 style="margin: 24px 0 16px; font-size: 20px;">Automated Testing Suite</h3>
  <p>Click the <strong>&ldquo;Autotest&rdquo;</strong> button to run a comprehensive test suite of <strong>58 scenarios</strong> covering all six guest journey phases &mdash; from pre-arrival inquiries to post-checkout feedback. The test suite runs automatically and reports:</p>

  <div class="feature-grid">
    <div class="feature-card" style="text-align:center; border-color: #22c55e;">
      <div class="icon">&#9989;</div>
      <h4 style="color:#22c55e">Passed</h4>
      <p>AI responded correctly with the expected intent and acceptable response quality.</p>
    </div>
    <div class="feature-card" style="text-align:center; border-color: #f59e0b;">
      <div class="icon">&#9888;&#65039;</div>
      <h4 style="color:#f59e0b">Warning</h4>
      <p>Response was acceptable but might need improvement (e.g., low confidence).</p>
    </div>
    <div class="feature-card" style="text-align:center; border-color: #ef4444;">
      <div class="icon">&#10060;</div>
      <h4 style="color:#ef4444">Failed</h4>
      <p>The AI gave an incorrect or unexpected response. Review and retrain needed.</p>
    </div>
  </div>

  <div class="highlight-box warning">
    <h4>&#128073; Best Practice: Test Before You Deploy</h4>
    <p>After making any changes to intents, keywords, responses, or routing, <strong>always run the Autotest suite</strong> to verify nothing was broken. You can also export test results as reports for record-keeping.</p>
  </div>
</div>

<!-- ===== 8. PERFORMANCE ===== -->
<div class="section" id="performance">
  <div class="section-header">
    <div class="section-icon" style="background:var(--rainbow-1)">&#128202;</div>
    <div>
      <div class="section-num">Section 8</div>
      <h2>Performance &amp; Analytics</h2>
    </div>
  </div>

  <p>The <strong>Performance</strong> tab gives you data-driven insights into how well Rainbow AI is serving your guests. Track satisfaction rates, response times, intent accuracy, and identify areas for improvement.</p>

  <div class="screenshot">
    <img src="${img('07-performance.png')}" alt="Performance Analytics" loading="lazy">
    <div class="screenshot-caption">Figure 8.1 &mdash; Performance dashboard with feedback analytics, intent accuracy, and date range filtering</div>
  </div>

  <h3 style="margin: 24px 0 16px; font-size: 20px;">Key Metrics</h3>

  <div class="feature-grid">
    <div class="feature-card">
      <div class="icon">&#128077;</div>
      <h4>Guest Satisfaction</h4>
      <p>Tracks thumbs-up vs thumbs-down feedback from guests. See overall satisfaction rate and breakdown by intent category.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#127919;</div>
      <h4>Intent Accuracy</h4>
      <p>Shows how accurately Rainbow is classifying guest messages. Identifies which intents are strong and which need more training.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#9889;</div>
      <h4>Response Time</h4>
      <p>Average, P95, and P99 latency metrics. Know exactly how fast your AI is responding and spot any slowdowns.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#128200;</div>
      <h4>Message Volume</h4>
      <p>Hourly and daily message trends, peak hours analysis, and breakdown by intent type. Plan your staffing around real data.</p>
    </div>
  </div>

  <div class="highlight-box">
    <h4>&#128161; Feedback Collection</h4>
    <p>You can configure automatic feedback collection in the Performance tab settings. Set how often to ask guests for feedback, which intents to skip, and customize the feedback prompt in multiple languages. This data flows directly into your satisfaction analytics.</p>
  </div>
</div>

<!-- ===== 9. SETTINGS ===== -->
<div class="section" id="settings">
  <div class="section-header">
    <div class="section-icon" style="background:var(--rainbow-6)">&#9881;&#65039;</div>
    <div>
      <div class="section-num">Section 9</div>
      <h2>Settings &amp; Configuration</h2>
    </div>
  </div>

  <p>The <strong>Settings</strong> tab is where you configure the technical backbone of Rainbow AI. It&rsquo;s organized into three sub-sections for easy management.</p>

  <div class="screenshot">
    <img src="${img('08-settings.png')}" alt="Settings" loading="lazy">
    <div class="screenshot-caption">Figure 9.1 &mdash; Settings showing AI model configuration, notifications, and operator management</div>
  </div>

  <h3 style="margin: 24px 0 16px; font-size: 20px;">Configuration Areas</h3>

  <div class="feature-grid">
    <div class="feature-card">
      <div class="icon">&#129302;</div>
      <h4>AI Models</h4>
      <p>Configure your AI providers (Google Gemini, Groq, Ollama, etc.). Set API keys, choose default models, configure fallback chains, and test connections. Each model shows its status, speed, and readiness.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#128276;</div>
      <h4>Notifications</h4>
      <p>Set up alerts for WhatsApp disconnections, server issues, and critical errors. Configure staff phone numbers and notification frequency.</p>
    </div>
    <div class="feature-card">
      <div class="icon">&#128101;</div>
      <h4>Operators</h4>
      <p>Manage your staff team. Add operators with their phone numbers and roles (Admin, Moderator, Viewer). Configure who receives escalation messages.</p>
    </div>
  </div>

  <div class="highlight-box success">
    <h4>&#128737;&#65039; AI Model Fallback Chain</h4>
    <p>Rainbow AI supports <strong>automatic failover</strong> between AI models. If your primary model (e.g., Google Gemini) is temporarily unavailable or slow, Rainbow automatically switches to the next model in your fallback chain. This ensures your guests always get a response, even if one provider has issues. You can configure the order of fallback models in the AI Models settings.</p>
  </div>
</div>

<!-- ===== 10. FAQ ===== -->
<div class="section" id="faq">
  <div class="section-header">
    <div class="section-icon" style="background:#64748b">&#10067;</div>
    <div>
      <div class="section-num">Section 10</div>
      <h2>Frequently Asked Questions</h2>
    </div>
  </div>

  <div class="faq-item">
    <h4>How do I connect my WhatsApp number?</h4>
    <p>Go to the <strong>Dashboard</strong>, click <strong>&ldquo;+ Add Number&rdquo;</strong>, enter your phone number and a label, then scan the QR code with your phone&rsquo;s WhatsApp app (Linked Devices &rarr; Link a Device). The connection is established within seconds.</p>
  </div>

  <div class="faq-item">
    <h4>Can Rainbow AI handle multiple languages in the same conversation?</h4>
    <p>Yes! Rainbow automatically detects the language of each incoming message and responds in the same language. It supports English, Bahasa Malaysia, Chinese, and more. You can also manually translate messages using the translation toggle in Live Chat.</p>
  </div>

  <div class="faq-item">
    <h4>What happens when Rainbow doesn&rsquo;t understand a message?</h4>
    <p>If the AI&rsquo;s confidence is too low across all four tiers, it either sends a polite fallback message asking the guest to rephrase, or automatically escalates to a staff member. You can configure these thresholds in the Understanding tab.</p>
  </div>

  <div class="faq-item">
    <h4>How do I improve the AI&rsquo;s accuracy?</h4>
    <p>Go to <strong>Understanding</strong> and add more keywords (T2) and training examples (T3) for the intents that need improvement. Use the <strong>Test Console</strong> to verify your changes, then run the <strong>Autotest suite</strong> in the Chat Simulator to confirm nothing else was affected.</p>
  </div>

  <div class="faq-item">
    <h4>Can I take over a conversation from the AI?</h4>
    <p>Absolutely. In <strong>Live Chat</strong>, simply switch the response mode from &ldquo;Autopilot&rdquo; to &ldquo;Manual&rdquo; or &ldquo;Copilot&rdquo;. You can take over at any point and the AI will stop responding for that conversation until you switch it back.</p>
  </div>

  <div class="faq-item">
    <h4>Is my data secure?</h4>
    <p>Rainbow AI runs on your own infrastructure. Conversations, guest data, and configuration stay on your servers. AI model API calls send only the necessary message context to generate responses &mdash; no bulk data sharing.</p>
  </div>

  <div class="faq-item">
    <h4>What if an AI model provider goes down?</h4>
    <p>Rainbow AI&rsquo;s <strong>automatic fallback chain</strong> handles this seamlessly. If your primary model is unavailable, it automatically tries the next model in your configured chain. You can set up multiple fallback models in Settings &rarr; AI Models.</p>
  </div>

  <div class="faq-item">
    <h4>How do I add information about my property?</h4>
    <p>Go to <strong>Responses &rarr; Knowledge Base</strong>. Here you can edit markdown files covering topics like pricing, facilities, WiFi, house rules, nearby attractions, and more. The AI references these files when generating responses.</p>
  </div>

  <h3 style="margin: 32px 0 16px; font-size: 20px;">&#128161; Tips for Getting the Most Out of Rainbow AI</h3>

  <ol class="steps">
    <li>
      <div>
        <strong>Start with the T3 Balanced template</strong>
        <span>It provides the best balance of accuracy and speed for most properties. You can fine-tune later.</span>
      </div>
    </li>
    <li>
      <div>
        <strong>Add keywords in all three languages</strong>
        <span>For each intent, add keywords in English, Malay, and Chinese. This dramatically improves detection for multilingual guests.</span>
      </div>
    </li>
    <li>
      <div>
        <strong>Test after every change</strong>
        <span>Use the Chat Simulator&rsquo;s Autotest to verify your changes work correctly before they affect real guests.</span>
      </div>
    </li>
    <li>
      <div>
        <strong>Review Performance weekly</strong>
        <span>Check the Performance tab regularly to spot trends, identify weak intents, and track satisfaction improvements.</span>
      </div>
    </li>
    <li>
      <div>
        <strong>Keep your Knowledge Base updated</strong>
        <span>When prices change, new facilities open, or policies update, edit the Knowledge Base files so the AI gives accurate information.</span>
      </div>
    </li>
    <li>
      <div>
        <strong>Use Copilot mode for training new staff</strong>
        <span>New team members can see the AI&rsquo;s suggested responses and learn the correct way to handle different guest inquiries.</span>
      </div>
    </li>
  </ol>
</div>

</div><!-- /container -->

<!-- ===== FOOTER ===== -->
<div class="footer">
  <div class="brand">&#127752; Rainbow AI</div>
  <p>Intelligent WhatsApp Assistant for Hospitality</p>
  <p style="margin-top: 16px; font-size: 12px; color: #475569;">User Manual v2.0 &mdash; Generated February 2026</p>
  <p style="font-size: 12px; color: #475569;">Designed for Pelangi Capsule Hostel</p>
</div>

</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf8');
console.log('Manual generated successfully!');
console.log('Output:', outputPath);
console.log('Size:', (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2), 'MB');
