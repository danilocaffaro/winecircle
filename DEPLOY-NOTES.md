# WineCircle Deployment Notes

## Infrastructure (Oracle Cloud)
- **Frontend**: React/Vite SPA at `/var/www/winecircle`
- **Backend**: PocketBase 0.36.8 at `localhost:8090`
- **Reverse Proxy**: Caddy (port 80)
- **DNS/Tunnel**: Cloudflare tunnel → `winecircle.melhor.dev`
- **URL**: https://winecircle.melhor.dev

## Caddy Configuration
Routes:
- `/pb/api/*` → strip `/pb` prefix → `localhost:8090` (PocketBase SDK uses /pb prefix)
- `/api/*` → `localhost:8090` (direct API access)
- `/*` → SPA with `try_files` fallback to `index.html`

## PocketBase Security Rules (2026-04-09)

### Users
- authRule: "" (anyone can authenticate)
- createRule: "" (anyone can register)
- listRule: id = @request.auth.id (own profile only)
- viewRule: id = @request.auth.id
- updateRule: id = @request.auth.id
- deleteRule: id = @request.auth.id

### wc_clubs
- listRule/viewRule: @request.auth.id != "" (discovery)
- createRule/updateRule/deleteRule: @request.auth.id != ""

### wc_events
- listRule/viewRule: club.members.id ?= @request.auth.id (members only)
- createRule/updateRule/deleteRule: @request.auth.id != ""

### wc_ratings
- listRule/viewRule: event.club.members.id ?= @request.auth.id
- createRule/updateRule/deleteRule: @request.auth.id != ""

### wc_expenses
- listRule/viewRule: event.club.members.id ?= @request.auth.id
- createRule/updateRule/deleteRule: @request.auth.id != ""

### wc_payments (PIX key protection)
- listRule/viewRule: @request.auth.id = debtor || @request.auth.id = creditor
- createRule/updateRule/deleteRule: @request.auth.id != ""

### wc_push_subs
- listRule/viewRule: @request.auth.id = user
- createRule/updateRule/deleteRule: @request.auth.id != ""

## Admin Credentials
- Email: admin@winecircle.local
- Password: (in vault)

## Known Issues
- Material Symbols font may show text instead of icons (Cloudflare cache)
- ServiceWorker registration may fail on first load (sw.js caching)
