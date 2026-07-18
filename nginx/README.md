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

Mount real certs and point the env vars at them, e.g. in a compose override:

```yaml
services:
  nginx:
    environment:
      TLS_CERT_PATH: /etc/nginx/certs/live/example.com/fullchain.pem
      TLS_KEY_PATH:  /etc/nginx/certs/live/example.com/privkey.pem
    volumes:
      - /etc/letsencrypt:/etc/nginx/certs:ro
```

Certificate issuance and renewal (Let's Encrypt/ACME or a corporate CA) are an
operator step, not part of this config.
