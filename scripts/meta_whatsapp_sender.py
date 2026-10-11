#!/usr/bin/env python3
"""
LifeFlow — Meta WhatsApp Cloud Business API Dispatcher
Sends automated WhatsApp reminders directly via Meta's Official Graph API.
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error

CONFIG_PATH = os.path.expanduser("~/.lifeflow_meta_config.json")

def load_meta_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "access_token": "",
        "phone_number_id": "",
        "waba_id": ""
    }

def save_meta_config(cfg):
    try:
        with open(CONFIG_PATH, 'w') as f:
            json.dump(cfg, f, indent=2)
        print(f"✅ Meta config saved to {CONFIG_PATH}")
    except Exception as e:
        print(f"Error saving config: {e}")

def send_meta_whatsapp_message(access_token, phone_number_id, to_number, message_text):
    """
    Sends message via Meta WhatsApp Cloud API v20.0
    Endpoint: https://graph.facebook.com/v20.0/{phone_number_id}/messages
    """
    url = f"https://graph.facebook.com/v20.0/{phone_number_id}/messages"
    
    clean_to = to_number.replace("+", "").replace(" ", "").replace("-", "")
    if len(clean_to) == 10:
        clean_to = "91" + clean_to

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_to,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": message_text
        }
    }

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode('utf-8')
            res_json = json.loads(body)
            print("🚀 Successfully sent via Meta Cloud API!")
            print(f"Message ID: {res_json.get('messages', [{}])[0].get('id', 'N/A')}")
            return {"success": True, "data": res_json}
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode('utf-8')
        print(f"❌ Meta Cloud API HTTP Error {e.code}: {error_msg}")
        return {"success": False, "error": error_msg, "code": e.code}
    except Exception as e:
        print(f"❌ Network / Unexpected Error: {e}")
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="LifeFlow Meta WhatsApp Cloud API Dispatcher")
    parser.add_argument("--token", help="Meta Graph API User/System Access Token")
    parser.add_argument("--phone-id", help="Meta Phone Number ID from WhatsApp App Dashboard")
    parser.add_argument("--to", help="Recipient phone number (e.g. 919876543210)")
    parser.add_argument("--message", help="Reminder text to send")
    parser.add_argument("--save-config", action="store_true", help="Save provided token & phone-id for future automated calls")
    parser.add_argument("--test", action="store_true", help="Send a test ping message")

    args = parser.parse_args()
    cfg = load_meta_config()

    token = args.token or cfg.get("access_token")
    phone_id = args.phone_id or cfg.get("phone_number_id")

    if args.save_config:
        if args.token: cfg["access_token"] = args.token
        if args.phone_id: cfg["phone_number_id"] = args.phone_id
        save_meta_config(cfg)
        return

    if not token or not phone_id:
        print("❌ Error: Meta Access Token and Phone Number ID are required.")
        print("Run with: python3 scripts/meta_whatsapp_sender.py --token <TOKEN> --phone-id <PHONE_ID> --save-config")
        print("\nGet your free credentials at: https://developers.facebook.com")
        sys.exit(1)

    to_number = args.to or "919876543210"
    message = args.message or "LifeFlow Payment Reminder Test via Meta Cloud API ⚡"

    print(f"Sending message to {to_number}...")
    res = send_meta_whatsapp_message(token, phone_id, to_number, message)
    if not res["success"]:
        sys.exit(1)

if __name__ == "__main__":
    main()
