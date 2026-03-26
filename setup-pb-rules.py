#!/usr/bin/env python3
"""Set API rules for WineCircle collections — auth-based access control"""
import requests, json

BASE = "http://localhost:8090"

r = requests.post(f"{BASE}/api/collections/_superusers/auth-with-password",
    json={"identity": "admin@winecircle.local", "password": "REDACTED_PB_SUPERUSER_PASSWORD"})
TOKEN = r.json()["token"]
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# Rules use PocketBase filter syntax
# @request.auth.id = current authenticated user
# Empty string "" = any authenticated user
# null = admin only (default)

RULES = {
    "wc_clubs": {
        "listRule": "",     # Any authed user can list clubs
        "viewRule": "",     # Any authed user can view
        "createRule": "",   # Any authed user can create
        "updateRule": "owner = @request.auth.id",  # Only owner can update
        "deleteRule": "owner = @request.auth.id",  # Only owner can delete
    },
    "wc_events": {
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": "created_by = @request.auth.id",
        "deleteRule": "created_by = @request.auth.id",
    },
    "wc_ratings": {
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": "user = @request.auth.id",
        "deleteRule": "user = @request.auth.id",
    },
    "wc_expenses": {
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": "paid_by = @request.auth.id",
        "deleteRule": "paid_by = @request.auth.id",
    },
    "wc_payments": {
        "listRule": "debtor = @request.auth.id || creditor = @request.auth.id",
        "viewRule": "debtor = @request.auth.id || creditor = @request.auth.id",
        "createRule": "",
        # Debtor can mark as paid, creditor can confirm
        "updateRule": "debtor = @request.auth.id || creditor = @request.auth.id",
        "deleteRule": None,  # No one can delete payments
    },
    "wc_push_subs": {
        "listRule": "user = @request.auth.id",
        "viewRule": "user = @request.auth.id",
        "createRule": "",
        "updateRule": "user = @request.auth.id",
        "deleteRule": "user = @request.auth.id",
    },
}

print("Setting API rules...\n")
for name, rules in RULES.items():
    r = requests.patch(f"{BASE}/api/collections/{name}", headers=H, json=rules)
    if r.status_code == 200:
        print(f"  ✅ {name}")
    else:
        print(f"  ❌ {name}: {r.json()}")

print("\n✅ All rules set!")
