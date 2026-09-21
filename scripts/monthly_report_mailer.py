import warnings
warnings.filterwarnings('ignore')
#!/usr/bin/env python3
"""
LifeFlow Automated Monthly Report Generator & Email Dispatcher
Extracts all tracker data into a PDF report and emails it to the user.
"""

import sys
import os
import json
import smtplib
import argparse
from datetime import datetime, date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

try:
    from fpdf import FPDF
except ImportError:
    print("Error: fpdf2 is required. Run: pip3 install fpdf2")
    sys.exit(1)

CONFIG_FILE = os.path.expanduser("~/.lifeflow_report_config.json")
SENT_LOG_FILE = os.path.expanduser("~/.lifeflow_sent_reports.json")

class PDFReport(FPDF):
    def header(self):
        self.set_fill_color(30, 41, 59) # Slate 800
        self.rect(0, 0, 210, 24, 'F')
        self.set_text_color(255, 255, 255)
        self.set_font('Helvetica', 'B', 12)
        self.set_xy(10, 6)
        self.cell(100, 6, "LifeFlow Personal OS", 0, 0, 'L')
        self.set_font('Helvetica', '', 9)
        self.set_xy(10, 12)
        self.cell(100, 6, "Automated Monthly Executive Summary", 0, 0, 'L')
        self.set_xy(110, 8)
        self.set_font('Helvetica', 'B', 10)
        self.cell(90, 8, getattr(self, 'report_month', 'Monthly Report'), 0, 0, 'R')
        self.ln(22)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}} | Confidential & Automated by LifeFlow", 0, 0, 'C')

def create_pdf_report(data, output_path):
    pdf = PDFReport(orientation='P', unit='mm', format='A4')
    pdf.report_month = data.get('monthLabel', 'Monthly Report')
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=18)

    # Title & Metadata
    pdf.set_text_color(15, 23, 42)
    pdf.set_font('Helvetica', 'B', 18)
    pdf.cell(0, 10, f"Monthly Performance Report: {data.get('monthLabel')}", 0, 1, 'L')
    
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(100, 116, 139)
    user_info = data.get('user', {})
    generated_at = data.get('generatedAt', datetime.now().strftime('%Y-%m-%d %H:%M'))
    pdf.cell(0, 5, f"Prepared for: {user_info.get('name', 'User')} ({user_info.get('email', '')}) | Generated: {generated_at}", 0, 1, 'L')
    pdf.ln(5)

    # 1. Executive Summary Cards (2x2 Grid)
    fin = data.get('finance', {})
    study = data.get('study', {})
    habits = data.get('habits', {})
    
    income = fin.get('totalIncome', 0)
    spent = fin.get('totalSpent', 0)
    savings = fin.get('netSavings', 0)
    study_hrs = study.get('totalHours', '0.0')
    habit_rate = habits.get('completionRate', 0)

    # KPI 1: Inflow
    pdf.set_fill_color(240, 253, 244) # emerald-50
    pdf.set_draw_color(187, 247, 208)
    pdf.rect(10, 42, 45, 22, 'DF')
    pdf.set_xy(12, 44)
    pdf.set_font('Helvetica', 'B', 8)
    pdf.set_text_color(22, 101, 52)
    pdf.cell(41, 4, "TOTAL MONEY IN", 0, 1, 'L')
    pdf.set_xy(12, 50)
    pdf.set_font('Helvetica', 'B', 13)
    pdf.cell(41, 7, f"INR {income:,.0f}", 0, 1, 'L')

    # KPI 2: Outflow
    pdf.set_fill_color(254, 242, 242) # rose-50
    pdf.set_draw_color(254, 205, 205)
    pdf.rect(58, 42, 45, 22, 'DF')
    pdf.set_xy(60, 44)
    pdf.set_font('Helvetica', 'B', 8)
    pdf.set_text_color(153, 27, 27)
    pdf.cell(41, 4, "TOTAL EXPENSES", 0, 1, 'L')
    pdf.set_xy(60, 50)
    pdf.set_font('Helvetica', 'B', 13)
    pdf.cell(41, 7, f"INR {spent:,.0f}", 0, 1, 'L')

    # KPI 3: Net Savings
    pdf.set_fill_color(238, 242, 255) # indigo-50
    pdf.set_draw_color(199, 210, 254)
    pdf.rect(106, 42, 45, 22, 'DF')
    pdf.set_xy(108, 44)
    pdf.set_font('Helvetica', 'B', 8)
    pdf.set_text_color(55, 48, 163)
    pdf.cell(41, 4, "NET SAVINGS", 0, 1, 'L')
    pdf.set_xy(108, 50)
    pdf.set_font('Helvetica', 'B', 13)
    prefix = "+" if savings >= 0 else ""
    pdf.cell(41, 7, f"{prefix}INR {savings:,.0f}", 0, 1, 'L')

    # KPI 4: Productivity
    pdf.set_fill_color(254, 243, 199) # amber-50
    pdf.set_draw_color(253, 230, 138)
    pdf.rect(154, 42, 46, 22, 'DF')
    pdf.set_xy(156, 44)
    pdf.set_font('Helvetica', 'B', 8)
    pdf.set_text_color(146, 64, 14)
    pdf.cell(42, 4, "STUDY & HABITS", 0, 1, 'L')
    pdf.set_xy(156, 50)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(42, 7, f"{study_hrs}h | {habit_rate}% done", 0, 1, 'L')

    pdf.set_y(70)

    # 2. FINANCIAL FLOW SECTION
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 8, "1. Financial Cashflow Breakdown", 0, 1, 'L')
    pdf.set_draw_color(226, 232, 240)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    # Income Sources Table
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_text_color(22, 101, 52)
    pdf.cell(90, 6, "Income Sources (Where Money Came From):", 0, 0, 'L')
    pdf.set_text_color(153, 27, 27)
    pdf.cell(90, 6, "Expense Categories:", 0, 1, 'L')

    pdf.set_font('Helvetica', '', 8.5)
    pdf.set_text_color(51, 65, 85)

    inc_sources = fin.get('incomeSources', {})
    exp_cats = fin.get('expenseCategories', {})
    
    inc_items = list(inc_sources.items())
    exp_items = list(exp_cats.items())
    max_rows = max(len(inc_items), len(exp_items), 1)

    for i in range(max_rows):
        # Left: Income Source
        if i < len(inc_items):
            src, amt = inc_items[i]
            pct = (amt / income * 100) if income > 0 else 0
            pdf.cell(60, 5, f"  * {src}", 0, 0, 'L')
            pdf.cell(30, 5, f"INR {amt:,.0f} ({pct:.0f}%)", 0, 0, 'R')
        else:
            pdf.cell(90, 5, "", 0, 0)

        pdf.cell(10, 5, "", 0, 0)

        # Right: Expense Category
        if i < len(exp_items):
            cat, amt = exp_items[i]
            pct = (amt / spent * 100) if spent > 0 else 0
            pdf.cell(55, 5, f"  * {cat}", 0, 0, 'L')
            pdf.cell(35, 5, f"INR {amt:,.0f} ({pct:.0f}%)", 0, 1, 'R')
        else:
            pdf.cell(90, 5, "", 0, 1)

    pdf.ln(5)

    # 3. STUDY SESSIONS & FOCUS
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 8, "2. Study Sessions & Focus Hours", 0, 1, 'L')
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    pdf.set_font('Helvetica', '', 8.5)
    pdf.set_text_color(51, 65, 85)
    pdf.cell(0, 5, f"Total Study Time: {study_hrs} Hours across {study.get('sessionCount', 0)} logged study blocks.", 0, 1, 'L')
    
    subjects = study.get('subjects', {})
    if subjects:
        for subj, mins in subjects.items():
            hrs = mins / 60
            pdf.cell(0, 5, f"  * {subj}: {hrs:.1f} Hours ({mins} mins)", 0, 1, 'L')
    else:
        pdf.cell(0, 5, "  * No subject sessions logged for this month.", 0, 1, 'L')

    pdf.ln(5)

    # 4. FRIENDS LENDING & DEBT (UDHAR KHATA)
    lending = data.get('lending', {})
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 8, "3. Friends Lending & Debt Summary", 0, 1, 'L')
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    pdf.set_font('Helvetica', '', 8.5)
    pdf.set_text_color(51, 65, 85)
    to_get = lending.get('totalToGet', 0)
    to_pay = lending.get('totalToPay', 0)
    net_lend = lending.get('netBalance', 0)
    pdf.cell(0, 5, f"Total You Will Receive (Lent): INR {to_get:,.0f} ({lending.get('pendingGaveCount', 0)} pending)", 0, 1, 'L')
    pdf.cell(0, 5, f"Total You Need to Pay (Borrowed): INR {to_pay:,.0f} ({lending.get('pendingTookCount', 0)} pending)", 0, 1, 'L')
    pdf.cell(0, 5, f"Net Outstanding Balance: INR {net_lend:,.0f} | Settled Transactions: {lending.get('settledCount', 0)}", 0, 1, 'L')

    pdf.ln(5)

    # 5. GOALS & PROGRESS
    goals = data.get('goals', {})
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 8, "4. Goals & Long-Term Milestones", 0, 1, 'L')
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    pdf.set_font('Helvetica', '', 8.5)
    pdf.set_text_color(51, 65, 85)
    pdf.cell(0, 5, f"Active Goals: {goals.get('active', 0)} | Completed Goals: {goals.get('completed', 0)} | Total Tracked: {goals.get('total', 0)}", 0, 1, 'L')

    pdf.output(output_path)
    return output_path

def send_email_report(cfg, data, pdf_path):
    receiver = cfg.get('receiverEmail') or cfg.get('gmailUser')
    sender = cfg.get('gmailUser')
    password = cfg.get('gmailAppPassword')
    host = cfg.get('smtpHost', 'smtp.gmail.com')
    port = int(cfg.get('smtpPort', 465))

    if not sender or not password:
        raise ValueError("Sender email and Google App Password must be configured in settings.")

    month_label = data.get('monthLabel', 'Monthly Report')
    subject = f"LifeFlow Monthly Digest & Tracker Report - {month_label}"

    msg = MIMEMultipart()
    msg['From'] = f"LifeFlow Personal OS <{sender}>"
    msg['To'] = receiver
    msg['Subject'] = subject

    # HTML Body
    fin = data.get('finance', {})
    study = data.get('study', {})
    habits = data.get('habits', {})

    body_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4f46e5, #06b6d4); padding: 24px; border-radius: 12px; color: white; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 22px;">LifeFlow Monthly Summary</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">{month_label} Executive Overview</p>
      </div>

      <p>Hello <strong>{data.get('user', {}).get('name', 'there')}</strong>,</p>
      <p>Your automated LifeFlow Tracker report for <strong>{month_label}</strong> has been extracted and attached as a PDF.</p>

      <div style="display: flex; gap: 10px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 10px;">Metric</th>
            <th style="padding: 10px;">Result</th>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">Total Inflow (Income)</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #16a34a;">INR {fin.get('totalIncome', 0):,.0f}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">Total Outflow (Expenses)</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #dc2626;">INR {fin.get('totalSpent', 0):,.0f}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">Net Savings</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #4f46e5;">INR {fin.get('netSavings', 0):,.0f}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">Study Focus Hours</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">{study.get('totalHours', '0.0')} Hours</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">Habit Completion Rate</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">{habits.get('completionRate', 0)}%</td>
          </tr>
        </table>
      </div>

      <p>The detailed multi-page PDF breakdown is attached below.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
      <p style="font-size: 12px; color: #94a3b8;">Sent automatically by LifeFlow Personal OS at month-end.</p>
    </body>
    </html>
    """

    msg.attach(MIMEText(body_html, 'html'))

    # Attach PDF
    with open(pdf_path, 'rb') as f:
        part = MIMEBase('application', 'pdf')
        part.set_payload(f.read())
    encoders.encode_base64(part)
    filename = os.path.basename(pdf_path)
    part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
    msg.attach(part)

    # Dispatch via SMTP SSL
    print(f"Connecting to {host}:{port}...")
    if port == 465:
        server = smtplib.SMTP_SSL(host, port, timeout=20)
    else:
        server = smtplib.SMTP(host, port, timeout=20)
        server.starttls()
    
    server.login(sender, password)
    server.sendmail(sender, receiver, msg.as_string())
    server.quit()
    print(f"SUCCESS: Email successfully dispatched to {receiver}!")
    return True

def main():
    parser = argparse.ArgumentParser(description="LifeFlow Monthly Report Mailer")
    parser.add_argument("--test", action="store_true", help="Send a test report immediately")
    parser.add_argument("--cron", action="store_true", help="Run in cron mode (checks month-end)")
    parser.add_argument("--data", type=str, help="JSON file or string containing tracker report data")
    parser.add_argument("--config", type=str, help="JSON file or string containing email config")
    parser.add_argument("--setup-launchd", action="store_true", help="Register macOS background LaunchAgent")
    args = parser.parse_args()

    # LaunchAgent setup on macOS
    if args.setup_launchd:
        plist_path = os.path.expanduser("~/Library/LaunchAgents/com.lifeflow.monthlyreport.plist")
        os.makedirs(os.path.dirname(plist_path), exist_ok=True)
        py_path = sys.executable
        script_path = os.path.abspath(__file__)
        
        plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.lifeflow.monthlyreport</string>
    <key>ProgramArguments</key>
    <array>
        <string>{py_path}</string>
        <string>{script_path}</string>
        <string>--cron</string>
    </array>
    <key>StartCalendarInterval</key>
    <array>
        <dict><key>Day</key><integer>28</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>55</integer></dict>
        <dict><key>Day</key><integer>29</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>55</integer></dict>
        <dict><key>Day</key><integer>30</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>55</integer></dict>
        <dict><key>Day</key><integer>31</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>55</integer></dict>
        <dict><key>Day</key><integer>1</integer><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>
    </array>
    <key>StandardOutPath</key>
    <string>{os.path.expanduser("~/.lifeflow_report.log")}</string>
    <key>StandardErrorPath</key>
    <string>{os.path.expanduser("~/.lifeflow_report_err.log")}</string>
</dict>
</plist>
"""
        with open(plist_path, 'w') as f:
            f.write(plist_content)
        os.system(f"launchctl unload '{plist_path}' 2>/dev/null")
        os.system(f"launchctl load '{plist_path}'")
        print(f"SUCCESS: Registered macOS LaunchAgent at {plist_path}!")
        print("LifeFlow will now automatically check and email your monthly report at month-end.")
        return

    # Load config
    cfg = {}
    if args.config:
        try:
            if os.path.exists(args.config):
                with open(args.config, 'r') as f: cfg = json.load(f)
            else:
                cfg = json.loads(args.config)
        except Exception as e:
            print("Error reading config:", e)

    if not cfg and os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f: cfg = json.load(f)
        except: pass

    # Load data
    data = None
    if args.data:
        try:
            if os.path.exists(args.data):
                with open(args.data, 'r') as f: data = json.load(f)
            else:
                data = json.loads(args.data)
        except Exception as e:
            print("Error reading data:", e)

    # Fallback sample data if standalone test
    if not data:
        now = datetime.now()
        data = {
            "monthLabel": now.strftime("%B %Y"),
            "year": now.year,
            "month": now.month - 1,
            "generatedAt": now.strftime("%Y-%m-%d %H:%M"),
            "user": {"name": "LifeFlow User", "email": cfg.get("receiverEmail", "")},
            "finance": {
                "totalIncome": 13550,
                "totalSpent": 3200,
                "netSavings": 10350,
                "incomeSources": {"Parents / Pocket Money": 8000, "Freelance / Projects": 3500, "Tuition / Teaching": 1200, "Gift": 500, "Refund": 350},
                "expenseCategories": {"Food": 1100, "Study Material": 850, "Travel": 450, "Bills": 500, "Entertainment": 300}
            },
            "study": {
                "totalHours": "18.5",
                "sessionCount": 14,
                "subjects": {"Mathematics": 360, "Computer Science": 420, "Physics": 330}
            },
            "habits": {
                "completionRate": 86,
                "streak": 7
            },
            "lending": {
                "totalToGet": 1650,
                "totalToPay": 200,
                "netBalance": 1450,
                "pendingGaveCount": 2,
                "pendingTookCount": 1,
                "settledCount": 2
            },
            "goals": {"total": 5, "active": 4, "completed": 1}
        }

    # Generate PDF
    pdf_filename = f"LifeFlow_Monthly_Report_{data.get('year', 2026)}_{data.get('month', 9)+1}.pdf"
    output_pdf = os.path.join(os.path.dirname(os.path.abspath(__file__)), pdf_filename)
    create_pdf_report(data, output_pdf)
    print(f"Generated PDF report at: {output_pdf}")

    if args.test or args.cron:
        if not cfg.get("gmailUser") or not cfg.get("gmailAppPassword"):
            print("ERROR: Gmail sender and App Password not provided.")
            print("Please configure your Gmail address and 16-character App Password in LifeFlow settings.")
            sys.exit(2)
        send_email_report(cfg, data, output_pdf)

if __name__ == "__main__":
    main()
