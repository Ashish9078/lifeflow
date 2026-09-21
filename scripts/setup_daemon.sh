#!/usr/bin/env bash
# LifeFlow Automated Monthly Report Daemon Setup
DIR=""
cd "/.."

echo "=================================================="
echo "  LifeFlow Automated Monthly Report Daemon Setup  "
echo "=================================================="
echo ""
python3 "/monthly_report_mailer.py" --setup-launchd
echo ""
echo "✅ Background daemon registered successfully!"
echo "LifeFlow will automatically generate and email your PDF report at the end of every month."
