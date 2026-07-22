# Edge reverse proxy

Nginx fronts the whole stack. It terminates TLS, rate-limits the upload
endpoint, caps request bodies, and routes a single origin to the two app
services on the internal Docker network:

| Path            | Upstream    | Notes                                  |
| --------------- | ----------- | -------------------------------------- |
| `/health`       | `api:3000`  | Liveness — `{ status: ok }`            |
| `/trpc/*`       | `api:3000`  | tRPC queries/mutations                 |
| `/transfer/*`   | `api:3000`  | Chunked upload + streaming download    |
| `/socket.io/*`  | `api:3000`  | Realtime signaling (WebSocket upgrade) |
| everything else | `web:3000`  | SSR app (`/`, `/join`, `/room/*`, assets) |

`api` and `web` are no longer published to the host — the proxy is the only
ingress (ports 80/443).

## Config

`templates/default.conf.template` is rendered at container start by the nginx
image's envsubst step. Three env vars are substituted (compose passes them):

- `MAX_FILE_SIZE_BYTES` — `client_max_body_size` (default 5 GiB)
- `TLS_CERT_PATH` / `TLS_KEY_PATH` — cert + key paths inside the container

`NGINX_ENVSUBST_FILTER` keeps envsubst from touching nginx's own `$variables`.

## Local dev

Generate a self-signed cert once, then bring the stack up:

```sh
sh nginx/certs/generate-dev-cert.sh   # writes nginx/certs/dev.{crt,key} (gitignored)
docker compose up -d --build
```

Then open <https://localhost/> and accept the self-signed cert. `http://` is
redirected to `https://`.

## Production

Real certs come from Let's Encrypt via the `certbot` service in
`deploy/docker-compose.prod.yml`. It runs on demand (no daemon) and writes into
the deploy-owned `nginx/certs` mount, so issuance needs neither root nor
`/etc/letsencrypt` — everything runs as the `deploy` user in the `docker` group.

The http-01 challenge is answered by the `:80` server block, which serves
`/.well-known/acme-challenge/` from a webroot shared with certbot before the
HTTPS redirect.

First issue (from `$DEPLOY_PATH` on the VPS, after the stack is up on the
self-signed cert so `:80` is already serving):

```sh
# nginx must be running the config with the challenge location first
docker compose -f docker-compose.prod.yml up -d nginx

# dry-run against staging to avoid the LE rate limit on a misconfig
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot --staging \
  -d getsynxor.com -d www.getsynxor.com \
  --email <operator-email> --agree-tos --no-eff-email

# real issue — drop --staging (add --force-renewal if staging left a cert)
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d getsynxor.com -d www.getsynxor.com \
  --email <operator-email> --agree-tos --no-eff-email
```

Then point the env vars at the issued cert (in the host `.env`) and reload:

```sh
# .env
TLS_CERT_PATH=/etc/nginx/certs/live/getsynxor.com/fullchain.pem
TLS_KEY_PATH=/etc/nginx/certs/live/getsynxor.com/privkey.pem
```

```sh
docker compose -f docker-compose.prod.yml up -d nginx
```

### Renewal

LE certs last 90 days. Renew weekly from the `deploy` user's crontab (no root):

```cron
0 3 * * 1 cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml run --rm certbot renew --webroot -w /var/www/certbot && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

`renew` is a no-op until a cert is inside its 30-day renewal window, so running
it weekly is safe.
