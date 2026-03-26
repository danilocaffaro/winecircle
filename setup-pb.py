#!/usr/bin/env python3
"""Create WineCircle collections in PocketBase 0.36"""
import requests, json, sys

BASE = "http://localhost:8090"
USERS = "_pb_users_auth_"

# Auth
r = requests.post(f"{BASE}/api/collections/_superusers/auth-with-password",
    json={"identity": "admin@winecircle.local", "password": "REDACTED_PB_SUPERUSER_PASSWORD"})
TOKEN = r.json()["token"]
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

def create(name, fields, **kwargs):
    body = {"name": name, "type": kwargs.get("type", "base"), "fields": fields}
    r = requests.post(f"{BASE}/api/collections", headers=H, json=body)
    if r.status_code == 200:
        print(f"  ✅ {name} → {r.json()['id']}")
        return r.json()["id"]
    else:
        print(f"  ❌ {name}: {r.json().get('message')} | {json.dumps(r.json().get('data',{}))}")
        return None

def rel(name, coll_id, required=False, max_select=1, cascade=False):
    return {"name": name, "type": "relation", "collectionId": coll_id,
            "cascadeDelete": cascade, "maxSelect": max_select, "minSelect": 0,
            "required": required}

def text(name, required=False):
    return {"name": name, "type": "text", "required": required}

def num(name, required=False, min_val=None, max_val=None):
    f = {"name": name, "type": "number", "required": required}
    if min_val is not None: f["min"] = min_val
    if max_val is not None: f["max"] = max_val
    return f

def sel(name, values, required=False):
    return {"name": name, "type": "select", "values": values, "required": required, "maxSelect": 1}

def date(name, required=False):
    return {"name": name, "type": "date", "required": required}

def url(name):
    return {"name": name, "type": "url"}

def js(name):
    return {"name": name, "type": "json"}

print("Creating WineCircle collections...\n")

# 1. Clubs
clubs_id = create("wc_clubs", [
    text("name", required=True),
    text("description"),
    rel("owner", USERS, required=True),
    rel("members", USERS, max_select=50),
    sel("type", ["open", "blind", "mixed"]),
    url("image_url"),
])

# 2. Events
events_id = create("wc_events", [
    text("title", required=True),
    rel("club", clubs_id, required=True, cascade=True),
    date("date", required=True),
    sel("type", ["open", "blind"], required=True),
    sel("status", ["upcoming", "tasting", "results", "closed"], required=True),
    js("wines"),
    rel("created_by", USERS, required=True),
])

# 3. Ratings
create("wc_ratings", [
    rel("event", events_id, required=True, cascade=True),
    rel("user", USERS, required=True),
    num("wine_index", required=True),
    num("aroma", min_val=1, max_val=10),
    num("taste", min_val=1, max_val=10),
    num("finish", min_val=1, max_val=10),
    num("overall", min_val=1, max_val=10),
    text("notes"),
])

# 4. Expenses
expenses_id = create("wc_expenses", [
    rel("event", events_id, required=True, cascade=True),
    num("total_amount", required=True, min_val=0),
    rel("paid_by", USERS, required=True),
    sel("split_type", ["equal", "custom"], required=True),
    js("splits"),
])

# 5. Payments (the key feature!)
create("wc_payments", [
    rel("expense", expenses_id, required=True, cascade=True),
    rel("debtor", USERS, required=True),
    rel("creditor", USERS, required=True),
    num("amount", required=True, min_val=0),
    sel("status", ["pending", "paid", "confirmed", "disputed"], required=True),
    text("pix_key"),
    date("paid_at"),
    date("confirmed_at"),
])

# 6. Push subscriptions
create("wc_push_subs", [
    rel("user", USERS, required=True, cascade=True),
    url("endpoint"),
    js("keys"),
    text("user_agent"),
])

# 7. Add pix_key and display_name to users collection
print("\nAdding pix_key + display_name to users...")
r = requests.get(f"{BASE}/api/collections/{USERS}", headers=H)
user_fields = r.json()["fields"]
existing_names = {f["name"] for f in user_fields}

new_fields = []
if "pix_key" not in existing_names:
    new_fields.append(text("pix_key"))
if "display_name" not in existing_names:
    new_fields.append(text("display_name"))
if "avatar_url" not in existing_names:
    new_fields.append(url("avatar_url"))

if new_fields:
    r = requests.patch(f"{BASE}/api/collections/{USERS}", headers=H,
        json={"fields": user_fields + new_fields})
    if r.status_code == 200:
        print(f"  ✅ Added {[f['name'] for f in new_fields]} to users")
    else:
        print(f"  ❌ {r.json()}")
else:
    print("  (already has pix_key + display_name)")

print("\n✅ All collections created!")
