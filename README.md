
---

## CI/CD

Automated via GitHub Actions (`.github/workflows/deploy.yml`):

| Job | Trigger | What |
|-----|---------|------|
| **build** | push to `main` (app/ changes) | `npm ci` → type check → `vite build` → verify → upload artifact |
| **deploy** | after build | rsync to staging → activate script → health check |

### Secrets required (already configured)
- `DEPLOY_HOST` — Oracle VM IP
- `DEPLOY_USER` — SSH user
- `DEPLOY_SSH_KEY` — Ed25519 deploy key

### Infrastructure
- **Frontend**: Static SPA at `/var/www/winecircle`
- **Backend**: PocketBase at `localhost:8090`
- **Reverse proxy**: Caddy
- **URL**: https://winecircle.melhor.dev
