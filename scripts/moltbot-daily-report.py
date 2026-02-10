#!/usr/bin/env python3
"""
Moltbot Daily Report Generator for PelangiManager
Generates and sends daily operations report at 9 AM Malaysia time
"""

import requests
import json
import schedule
import time
from datetime import datetime
import pytz
from typing import Dict, List, Any, Optional

# Configuration
MCP_URL = "http://localhost:3001/mcp"
MALAYSIA_TZ = pytz.timezone('Asia/Kuala_Lumpur')

# Delivery configuration (choose your method)
TELEGRAM_BOT_TOKEN = ""  # Your Telegram bot token
TELEGRAM_CHAT_ID = ""     # Your Telegram chat ID
WHATSAPP_API_URL = ""     # Your WhatsApp API endpoint
EMAIL_CONFIG = {
    "smtp_server": "",
    "smtp_port": 587,
    "sender": "",
    "password": "",
    "recipient": ""
}

class MCPClient:
    """Client for interacting with PelangiManager MCP Server"""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.request_id = 0

    def call_tool(self, tool_name: str, arguments: Dict = None) -> Dict:
        """Call an MCP tool and return the result"""
        self.request_id += 1

        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments or {}
            },
            "id": self.request_id
        }

        try:
            response = requests.post(
                self.base_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            response.raise_for_status()
            result = response.json()

            if "error" in result:
                raise Exception(f"MCP Error: {result['error']}")

            # Extract text content from MCP response
            if "result" in result and "content" in result["result"]:
                content = result["result"]["content"]
                if content and len(content) > 0:
                    text = content[0].get("text", "{}")
                    try:
                        return json.loads(text)
                    except json.JSONDecodeError:
                        return {"raw": text}

            return result

        except requests.exceptions.RequestException as e:
            print(f"Error calling MCP tool {tool_name}: {e}")
            return {"error": str(e)}

    def health_check(self) -> bool:
        """Check if MCP server is healthy"""
        try:
            health_url = self.base_url.replace('/mcp', '/health')
            response = requests.get(health_url, timeout=5)
            return response.status_code == 200
        except:
            return False


class ReportGenerator:
    """Generates formatted daily reports from MCP data"""

    def __init__(self, mcp_client: MCPClient):
        self.mcp = mcp_client

    def generate_report(self) -> str:
        """Generate complete daily report"""
        timestamp = datetime.now(MALAYSIA_TZ).strftime("%Y-%m-%d %H:%M:%S GMT+8")

        report = []
        report.append("🏨 PELANGI CAPSULE HOSTEL - DAILY OPERATIONS REPORT")
        report.append("═" * 55)
        report.append("")

        # Section 1: Occupancy Statistics
        occupancy_section = self._generate_occupancy_section()
        report.append(occupancy_section)
        report.append("")

        # Section 2: Capsule Status by Section
        capsule_section = self._generate_capsule_section()
        report.append(capsule_section)
        report.append("")

        # Section 3: Guest Information
        guest_section = self._generate_guest_section()
        report.append(guest_section)
        report.append("")

        # Section 4: Overdue Guests
        overdue_section = self._generate_overdue_section()
        report.append(overdue_section)
        report.append("")

        # Section 5: Maintenance Status
        maintenance_section = self._generate_maintenance_section()
        report.append(maintenance_section)
        report.append("")

        # Footer
        report.append("═" * 55)
        report.append(f"📅 Report Generated: {timestamp}")
        report.append("🤖 Automated by Moltbot v1.0")

        return "\n".join(report)

    def _generate_occupancy_section(self) -> str:
        """Generate occupancy statistics section"""
        data = self.mcp.call_tool("pelangi_get_occupancy")

        if "error" in data:
            return "📊 OCCUPANCY STATISTICS\n═══════════════════════\n⚠️ Data unavailable"

        total = data.get("total", 0)
        occupied = data.get("occupied", 0)
        available = data.get("available", 0)
        rate = data.get("occupancyRate", 0)

        return f"""📊 OCCUPANCY STATISTICS
═══════════════════════
Total Capsules: {total}
Occupied: {occupied} capsules
Available: {available} capsules
Occupancy Rate: {rate}%"""

    def _generate_capsule_section(self) -> str:
        """Generate capsule status breakdown by section"""
        capsules = self.mcp.call_tool("pelangi_list_capsules")

        if "error" in capsules or not isinstance(capsules, list):
            return "🛏️ CAPSULE STATUS BY SECTION\n═══════════════════════════\n⚠️ Data unavailable"

        # Organize by section
        sections = {"back": [], "middle": [], "front": []}

        for capsule in capsules:
            section = capsule.get("section", "unknown")
            if section in sections:
                sections[section].append(capsule)

        output = ["🛏️ CAPSULE STATUS BY SECTION", "═══════════════════════════", ""]

        for section_name, capsule_list in sections.items():
            if not capsule_list:
                continue

            occupied = [c["number"] for c in capsule_list if not c.get("isAvailable")]
            available = [c["number"] for c in capsule_list if c.get("isAvailable")]

            section_title = section_name.upper() + " SECTION"
            output.append(f"{section_title} ({len(capsule_list)} capsules):")
            output.append(f"  Occupied: {', '.join(occupied) if occupied else 'None'}")
            output.append(f"  Available: {', '.join(available) if available else 'None'}")
            output.append("")

        return "\n".join(output).rstrip()

    def _generate_guest_section(self) -> str:
        """Generate guest information section"""
        guests = self.mcp.call_tool("pelangi_list_guests", {"page": 1, "limit": 100})

        if "error" in guests:
            return "👥 GUEST INFORMATION\n═══════════════════\n⚠️ Data unavailable"

        # Handle paginated response
        guest_count = 0
        if isinstance(guests, dict) and "data" in guests:
            guest_count = len(guests["data"])
        elif isinstance(guests, list):
            guest_count = len(guests)

        return f"""👥 GUEST INFORMATION
═══════════════════
Checked-in Guests: {guest_count}"""

    def _generate_overdue_section(self) -> str:
        """Generate overdue guests section"""
        overdue = self.mcp.call_tool("pelangi_get_overdue_guests")

        if "error" in overdue:
            return "⚠️ OVERDUE GUESTS\n═══════════════════\n⚠️ Data unavailable"

        if not overdue or len(overdue) == 0:
            return "⚠️ OVERDUE GUESTS\n═══════════════════\n✅ No overdue guests"

        output = ["⚠️ OVERDUE GUESTS", "═══════════════════"]
        output.append(f"⚠️ {len(overdue)} guest(s) past expected checkout:")
        output.append("")

        for guest in overdue:
            name = guest.get("name", "Unknown")
            capsule = guest.get("capsuleNumber", "N/A")
            expected = guest.get("expectedCheckoutDate", "N/A")
            output.append(f"  - {name} (Capsule {capsule}) - Expected: {expected}")

        return "\n".join(output)

    def _generate_maintenance_section(self) -> str:
        """Generate maintenance status section"""
        whatsapp_format = self.mcp.call_tool("pelangi_export_whatsapp_issues")

        if "error" in whatsapp_format:
            return "🔧 MAINTENANCE STATUS\n═══════════════════════\n⚠️ Data unavailable"

        # Extract the raw WhatsApp formatted text
        if isinstance(whatsapp_format, dict) and "raw" in whatsapp_format:
            return whatsapp_format["raw"]
        elif isinstance(whatsapp_format, str):
            return whatsapp_format

        return "🔧 MAINTENANCE STATUS\n═══════════════════════\n✅ No active maintenance issues"


class ReportDelivery:
    """Handles delivery of reports via various channels"""

    @staticmethod
    def send_telegram(report: str, bot_token: str, chat_id: str) -> bool:
        """Send report via Telegram"""
        if not bot_token or not chat_id:
            print("Telegram credentials not configured")
            return False

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": report,
            "parse_mode": "Markdown"
        }

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            print("✅ Report sent via Telegram")
            return True
        except Exception as e:
            print(f"❌ Telegram delivery failed: {e}")
            return False

    @staticmethod
    def send_whatsapp(report: str, api_url: str) -> bool:
        """Send report via WhatsApp API"""
        if not api_url:
            print("WhatsApp API not configured")
            return False

        # Implement based on your WhatsApp API provider
        # Example for Periskope or other providers
        try:
            # Customize this based on your API
            response = requests.post(api_url, json={"message": report})
            response.raise_for_status()
            print("✅ Report sent via WhatsApp")
            return True
        except Exception as e:
            print(f"❌ WhatsApp delivery failed: {e}")
            return False

    @staticmethod
    def send_email(report: str, config: Dict) -> bool:
        """Send report via Email"""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            msg = MIMEMultipart()
            msg['From'] = config['sender']
            msg['To'] = config['recipient']
            msg['Subject'] = f"Pelangi Daily Report - {datetime.now().strftime('%Y-%m-%d')}"
            msg.attach(MIMEText(report, 'plain'))

            with smtplib.SMTP(config['smtp_server'], config['smtp_port']) as server:
                server.starttls()
                server.login(config['sender'], config['password'])
                server.send_message(msg)

            print("✅ Report sent via Email")
            return True
        except Exception as e:
            print(f"❌ Email delivery failed: {e}")
            return False

    @staticmethod
    def save_to_file(report: str, filepath: str = None) -> bool:
        """Save report to file as backup"""
        if not filepath:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = f"pelangi_report_{timestamp}.txt"

        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"✅ Report saved to {filepath}")
            return True
        except Exception as e:
            print(f"❌ File save failed: {e}")
            return False


def generate_and_send_report():
    """Main function to generate and send daily report"""
    print(f"\n{'='*60}")
    print(f"Moltbot Report Generation Started")
    print(f"Time: {datetime.now(MALAYSIA_TZ).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # Initialize MCP client
    mcp = MCPClient(MCP_URL)

    # Health check with retry
    max_retries = 3
    for attempt in range(max_retries):
        if mcp.health_check():
            print(f"✅ MCP server is healthy")
            break
        else:
            print(f"⚠️ MCP server health check failed (attempt {attempt + 1}/{max_retries})")
            if attempt < max_retries - 1:
                time.sleep(5)
            else:
                print("❌ MCP server unavailable after 3 attempts")
                # Send alert notification
                alert = f"""🚨 MOLTBOT ALERT
Failed to connect to PelangiManager MCP server.
Please check if the server is running.
Time: {datetime.now(MALAYSIA_TZ).strftime('%Y-%m-%d %H:%M:%S')}"""
                ReportDelivery.send_telegram(alert, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
                return

    # Generate report
    print("Generating report...")
    generator = ReportGenerator(mcp)
    report = generator.generate_report()

    # Print to console
    print("\n" + report + "\n")

    # Save backup
    ReportDelivery.save_to_file(report)

    # Deliver via configured channels
    delivery_success = False

    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        delivery_success = ReportDelivery.send_telegram(report, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)

    if WHATSAPP_API_URL:
        delivery_success = ReportDelivery.send_whatsapp(report, WHATSAPP_API_URL) or delivery_success

    if EMAIL_CONFIG.get("sender"):
        delivery_success = ReportDelivery.send_email(report, EMAIL_CONFIG) or delivery_success

    if not delivery_success:
        print("⚠️ No delivery channels configured - report saved to file only")

    print(f"\n{'='*60}")
    print(f"Report generation completed")
    print(f"{'='*60}\n")


def main():
    """Main entry point with scheduling"""
    print("""
    ╔════════════════════════════════════════════════════════╗
    ║         MOLTBOT DAILY REPORT SCHEDULER v1.0            ║
    ║         PelangiManager Operations Reporter             ║
    ╚════════════════════════════════════════════════════════╝
    """)

    # Schedule daily report at 9 AM Malaysia time
    schedule.every().day.at("09:00").do(generate_and_send_report)

    print(f"✅ Scheduler initialized")
    print(f"📅 Daily report scheduled for 09:00 AM Malaysia Time")
    print(f"🔄 Waiting for next scheduled run...\n")

    # Optional: Run immediately on startup for testing
    # Uncomment the line below to test
    # generate_and_send_report()

    # Keep running
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Moltbot scheduler stopped by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
