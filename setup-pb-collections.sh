#!/bin/bash
# Create WineCircle collections in PocketBase

TOKEN=$(curl -s http://localhost:8090/api/collections/_superusers/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"admin@winecircle.local","password":"REDACTED_PB_SUPERUSER_PASSWORD"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

API="http://localhost:8090/api/collections"
AUTH="Authorization: Bearer $TOKEN"

create_collection() {
  local name=$1
  local body=$2
  echo -n "Creating $name... "
  RESULT=$(curl -s -X POST "$API" -H "$AUTH" -H "Content-Type: application/json" -d "$body")
  echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name','ERROR: '+d.get('message','unknown')))"
}

# 1. wc_clubs — Wine clubs
create_collection "wc_clubs" '{
  "name": "wc_clubs",
  "type": "base",
  "fields": [
    {"name": "name", "type": "text", "required": true, "options": {"min": 1, "max": 100}},
    {"name": "description", "type": "text", "options": {"max": 500}},
    {"name": "owner", "type": "relation", "required": true, "options": {"collectionId": "_pbc_users_auth_", "cascadeDelete": false, "maxSelect": 1}},
    {"name": "members", "type": "relation", "options": {"collectionId": "_pbc_users_auth_", "cascadeDelete": false, "maxSelect": 50}},
    {"name": "type", "type": "select", "options": {"values": ["open","blind","mixed"]}},
    {"name": "image_url", "type": "url"}
  ]
}'

# 2. wc_events — Tasting events
create_collection "wc_events" '{
  "name": "wc_events",
  "type": "base",
  "fields": [
    {"name": "title", "type": "text", "required": true, "options": {"min": 1, "max": 200}},
    {"name": "club", "type": "relation", "required": true, "options": {"collectionId": "wc_clubs", "cascadeDelete": true, "maxSelect": 1}},
    {"name": "date", "type": "date", "required": true},
    {"name": "type", "type": "select", "required": true, "options": {"values": ["open","blind"]}},
    {"name": "status", "type": "select", "required": true, "options": {"values": ["upcoming","tasting","results","closed"]}},
    {"name": "wines", "type": "json"},
    {"name": "created_by", "type": "relation", "required": true, "options": {"collectionId": "_pbc_users_auth_", "cascadeDelete": false, "maxSelect": 1}}
  ]
}'

# 3. wc_ratings — Individual wine ratings per member
create_collection "wc_ratings" '{
  "name": "wc_ratings",
  "type": "base",
  "fields": [
    {"name": "event", "type": "relation", "required": true, "options": {"collectionId": "wc_events", "cascadeDelete": true, "maxSelect": 1}},
    {"name": "user", "type": "relation", "required": true, "options": {"collectionId": "_pbc_users_auth_", "cascadeDelete": false, "maxSelect": 1}},
    {"name": "wine_index", "type": "number", "required": true},
    {"name": "aroma", "type": "number", "options": {"min": 1, "max": 10}},
    {"name": "taste", "type": "number", "options": {"min": 1, "max": 10}},
    {"name": "finish", "type": "number", "options": {"min": 1, "max": 10}},
    {"name": "overall", "type": "number", "options": {"min": 1, "max": 10}},
    {"name": "notes", "type": "text", "options": {"max": 500}}
  ]
}'

# 4. wc_expenses — Expense records per event
create_collection "wc_expenses" '{
  "name": "wc_expenses",
  "type": "base",
  "fields": [
    {"name": "event", "type": "relation", "required": true, "options": {"collectionId": "wc_events", "cascadeDelete": true, "maxSelect": 1}},
    {"name": "total_amount", "type": "number", "required": true, "options": {"min": 0}},
    {"name": "paid_by", "type": "relation", "required": true, "options": {"collectionId": "_pbc_users_auth_", "cascadeDelete": false, "maxSelect": 1}},
    {"name": "split_type", "type": "select", "required": true, "options": {"values": ["equal","custom"]}},
    {"name": "splits", "type": "json"}
  ]
}'

# 5. wc_payments — Payment status tracking (the key new feature)
create_collection "wc_payments" '{
  "name": "wc_payments",
  "type": "base",
  "fields": [
    {"name": "expense", "type": "relation", "required": true, "options": {"collectionId": "wc_expenses", "cascadeDelete": true, "maxSelect": 1}},
    {"name": "debtor", "type": "relation", "required": true, "options": {"collectionId": "_pbc_users_auth_", "cascadeDelete": false, "maxSelect": 1}},
    {"name": "creditor", "type": "relation", "required": true, "options": {"collectionId": "_pbc_users_auth_", "cascadeDelete": false, "maxSelect": 1}},
    {"name": "amount", "type": "number", "required": true, "options": {"min": 0}},
    {"name": "status", "type": "select", "required": true, "options": {"values": ["pending","paid","confirmed","disputed"]}},
    {"name": "pix_key", "type": "text"},
    {"name": "paid_at", "type": "date"},
    {"name": "confirmed_at", "type": "date"}
  ]
}'

# 6. wc_push_subscriptions — Web Push subscriptions
create_collection "wc_push_subscriptions" '{
  "name": "wc_push_subscriptions",
  "type": "base",
  "fields": [
    {"name": "user", "type": "relation", "required": true, "options": {"collectionId": "_pbc_users_auth_", "cascadeDelete": true, "maxSelect": 1}},
    {"name": "endpoint", "type": "url", "required": true},
    {"name": "keys", "type": "json", "required": true},
    {"name": "user_agent", "type": "text"}
  ]
}'

echo ""
echo "=== Done ==="
