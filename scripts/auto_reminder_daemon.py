#!/usr/bin/env python3
"""
LifeFlow Automated Payment Reminder Daemon
Checks for pending loans with due dates and alerts/dispatches reminders.
"""

import os
import sys
import json
import urllib.parse
from datetime import datetime, date

def get_due_reminders():
    # In a real environment, loads from local storage or cloud
    sample_dues = [
        {"friend": "Rahul Sharma", "amount": 450, "note": "College canteen lunch", "phone": "9876543210", "days_overdue": 3},
        {"friend": "Amit Patel", "amount": 1200, "note": "Hostel electricity bill", "phone": "9812345678", "days_overdue": 1},
    ]
    return sample_dues

def generate_odlish_message(item):
    return (
        f"Haye {item['friend']} bhai! Kemiti achhu? "
        f"Se dinara ₹{item['amount']} ({item['note']}) baki thila na, "
        f"samaya milile UPI / PhonePe re transfer karidebu bhai. Dhanyabad! 🙏✨"
    )

def notify_macos(title, message):
    try:
        script = f'display notification "{message}" with title "{title}" sound name "Glass"'
        os.system(f"osascript -e '{script}'")
    except Exception as e:
        print(f"Notification error: {e}")

def main():
    print("==================================================")
    print("  LifeFlow Auto Payment Reminder Daemon Check    ")
    print("==================================================")
    dues = get_due_reminders()
    if not dues:
        print("✅ No overdue payments today. All accounts clear!")
        return

    print(f"⚠️ Found {len(dues)} pending payments due:")
    for d in dues:
        msg = generate_odlish_message(d)
        print(f"  • {d['friend']}: ₹{d['amount']} (Overdue by {d['days_overdue']} days)")
        print(f"    Message: {msg}\n")
        
        # Trigger macOS native desktop notification
        notify_macos("LifeFlow Payment Due", f"{d['friend']} owes ₹{d['amount']} for {d['note']}.")

        if "--open-whatsapp" in sys.argv:
            encoded = urllib.parse.quote(msg)
            url = f"https://wa.me/91{d['phone']}?text={encoded}"
            os.system(f'open "{url}"')
            print(f"    -> Opened WhatsApp Web for {d['friend']}")

    print("✅ Daily auto-reminder scan finished.")

if __name__ == "__main__":
    main()
