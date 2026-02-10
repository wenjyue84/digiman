# Moltbot Setup Guide

Quick guide to set up Moltbot for daily PelangiManager reports.

## Prerequisites

1. **Python 3.8+** installed
2. **PelangiManager MCP Server** running (local or deployed)
3. **Notification channel** configured (Telegram/WhatsApp/Email)

## Step 1: Install Dependencies

```bash
cd scripts
pip install -r moltbot-requirements.txt
```

## Step 2: Start MCP Server

### Option A: Local Development
```bash
cd mcp-server
npm run dev
# Server runs on http://localhost:3001
```

### Option B: Use Zeabur Deployment
Update `MCP_URL` in `moltbot-daily-report.py`:
```python
MCP_URL = "https://your-mcp-server.zeabur.app/mcp"
```

## Step 3: Configure Delivery Channels

Edit `moltbot-daily-report.py` and add your credentials:

### For Telegram:
```python
TELEGRAM_BOT_TOKEN = "your-bot-token-here"
TELEGRAM_CHAT_ID = "your-chat-id-here"
```

**How to get Telegram credentials:**
1. Create bot: Talk to [@BotFather](https://t.me/BotFather) → `/newbot`
2. Get chat ID: Talk to [@userinfobot](https://t.me/userinfobot)

### For WhatsApp (via Periskope or other API):
```python
WHATSAPP_API_URL = "your-whatsapp-api-endpoint"
```

### For Email:
```python
EMAIL_CONFIG = {
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "sender": "your-email@gmail.com",
    "password": "your-app-password",
    "recipient": "recipient@example.com"
}
```

## Step 4: Test the Report

Run manually to test:
```bash
python moltbot-daily-report.py
```

To generate immediate report (uncomment in `main()` function):
```python
# generate_and_send_report()  # Remove the # to run immediately
```

## Step 5: Deploy Automation

### Option A: Run as Background Process (Linux/Mac)
```bash
nohup python moltbot-daily-report.py &
```

### Option B: Systemd Service (Linux)
Create `/etc/systemd/system/moltbot.service`:
```ini
[Unit]
Description=Moltbot Daily Report Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/PelangiManager-Zeabur/scripts
ExecStart=/usr/bin/python3 moltbot-daily-report.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable moltbot
sudo systemctl start moltbot
sudo systemctl status moltbot
```

### Option C: Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task: "Moltbot Daily Report"
3. Trigger: Daily at 09:00 AM
4. Action: Start a program
   - Program: `python.exe`
   - Arguments: `C:\path\to\moltbot-daily-report.py`
5. Settings: Run whether user is logged on or not

### Option D: Docker Container
Create `Dockerfile`:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY moltbot-requirements.txt .
RUN pip install -r moltbot-requirements.txt
COPY moltbot-daily-report.py .
CMD ["python", "moltbot-daily-report.py"]
```

Build and run:
```bash
docker build -t moltbot .
docker run -d --name moltbot --restart always moltbot
```

## Step 6: Verify Deployment

Check that:
- ✅ Script is running (check process list)
- ✅ MCP server is accessible
- ✅ Report generated at 9 AM
- ✅ Notification received via configured channel

## Monitoring

### View Logs
```bash
# If using systemd
sudo journalctl -u moltbot -f

# If using Docker
docker logs -f moltbot

# If running as background process
tail -f nohup.out
```

### Check Backup Reports
Reports are automatically saved to files:
```
pelangi_report_20260129_090000.txt
pelangi_report_20260130_090000.txt
...
```

## Troubleshooting

### Report not generating
1. Check MCP server is running: `curl http://localhost:3001/health`
2. Check Python script is running: `ps aux | grep moltbot`
3. Check timezone configuration

### Missing data in report
1. Test MCP tools individually (see main prompt)
2. Check API endpoints are responding
3. Verify authentication tokens

### Notification not received
1. Verify credentials in configuration
2. Test delivery manually
3. Check API rate limits

## Support

For issues, refer to:
- Main prompt: `MOLTBOT-DAILY-REPORT-PROMPT.md`
- PelangiManager docs: `/docs/`
- MCP server: `/mcp-server/README.md`

---

**Version**: 1.0.0
**Last Updated**: 2026-01-29
