# Synxor

> Self-hosted file transfer. No accounts. No ads. Your server, your data.

Send files, text snippets, or links between any two devices over the internet. A Sender creates a Room, shares a 6-character Room Code, and the Receiver joins and downloads — Delivery confirmed in real time.

---

## Why

Every existing tool either requires an account, caps file size behind a paywall, adds ads, or routes your data through a third-party server you don't control. Synxor runs on your own server. The receiver needs only a browser and a Room Code.

## Features

- **No account required** — anonymous Sender and Receiver, authenticated by a signed Room Token
- **Chunked streaming** — Receiver can start downloading before upload finishes
- **Text Snippets and Links** — paste clipboard content or a URL directly into the Room
- **Real-time Delivery confirmation** — Sender sees when the file arrives
- **Short Room Codes** — 6-character codes for easy voice or keyboard sharing
- **Transfer Log** — per-session log of everything sent and received
- **Room Expiry** — 1 hour, 24 hours, or 7 days
- **Dark mode** — follows system preference, with manual override
- **Self-hostable** — single `docker compose up`, S3-compatible storage swap via env vars

## Requirements

- Docker Engine 24+
- Docker Compose v2
- 1 GB RAM minimum
- Ports 80 and 443 available (or configure `HTTP_PORT` / `HTTPS_PORT`)

## Quick start

```bash
git clone https://github.com/izolyte/synxor.git
cd synxor
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and MINIO_ROOT_PASSWORD at minimum
sh nginx/certs/generate-dev-cert.sh   # self-signed cert for local HTTPS
docker compose up -d
```

Open **`https://localhost`** — accept the self-signed certificate warning (local dev only) and you'll land on the app: create a Room, share the code, send a file. The API health probe is at `https://localhost/health`.

Everything is reached through the nginx proxy on ports 80/443; api and web stay internal to the Docker network.

## Environment variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Default | Description |
|---|---|---|
| `HTTP_PORT` / `HTTPS_PORT` | `80` / `443` | Host ports the nginx proxy publishes |
| `VITE_API_URL` | `https://localhost` | The one canonical public origin (the proxy). Baked into the web bundle at build time — include the port if `HTTPS_PORT` isn't 443 |
| `ALLOWED_ORIGINS` | `https://localhost` | HTTP CORS allowlist; must include the public origin |
| `WS_ALLOWED_ORIGINS` | `https://localhost` | Socket.io CORS allowlist; **required in production** (the API refuses to default to `*`) |
| `POSTGRES_PASSWORD` | — | **Required.** PostgreSQL password |
| `POSTGRES_USER` | `synxor` | PostgreSQL user |
| `POSTGRES_DB` | `synxor` | PostgreSQL database name |
| `MINIO_ROOT_USER` | `minioadmin` | MinIO admin username |
| `MINIO_ROOT_PASSWORD` | — | **Required.** MinIO admin password |
| `MAX_FILE_SIZE_BYTES` | `5368709120` | Max file size (default 5 GB) |

## Stack

| Layer | Tech |
|---|---|
| Frontend | TanStack Start + Tailwind CSS + shadcn/ui |
| Backend | NestJS 11 + nestjs-trpc + Socket.io |
| Database | PostgreSQL 17 + Prisma |
| Storage | MinIO (S3-compatible — swap to AWS S3 or R2 via env vars) |
| Infra | Docker Compose + Nginx |

## Deployment

**Self-host** (root `docker-compose.yml`) builds the images locally and fronts them with nginx (TLS, HTTP→HTTPS redirect, rate limiting, body cap) — one box, one `docker compose up`.

**CI/CD.** Every merge to `main` builds and pushes `synxor-api` / `synxor-web` images to GHCR (`.github/workflows/cd.yml`). The deploy job that ships them to a host is gated off by default — enable it with:

1. Repo **variable** `DEPLOY_ENABLED=true` and `VITE_API_URL` set to your public origin (baked into the web bundle).
2. Repo **secrets** `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`.

On merge it SCPs `deploy/docker-compose.prod.yml` and `nginx/templates/` to the host, pulls the commit's images, brings the stack up with `--wait`, and fails unless the nginx ingress actually serves.

Production uses the same nginx-fronted topology as dev — nginx terminates TLS on 80/443, api and web stay internal. On the host, next to the compose file:

- **`nginx/certs/`** — real certificates (Let's Encrypt or your CA); point `TLS_CERT_PATH` / `TLS_KEY_PATH` at them. The deploy fails fast if this is empty.
- **`.env`** — `VITE_API_URL` here **must equal** the repo `VITE_API_URL` variable the web bundle was built with (both are the one public origin, e.g. `https://files.example.com`); a mismatch breaks the HTTP→HTTPS redirect. Also set `ALLOWED_ORIGINS` and `WS_ALLOWED_ORIGINS` to that origin.
- **MinIO console** — published on loopback only; reach it over an SSH tunnel.

## Development

```bash
# Prerequisites: Node 24+, pnpm 10+

pnpm install          # install all workspace dependencies
pnpm typecheck        # type-check all packages
pnpm lint             # lint all packages

# Run API locally (requires postgres + minio running)
cd apps/api
pnpm start:dev
```

## Storage swap

Synxor uses MinIO by default. To use AWS S3 or Cloudflare R2, set:

```env
STORAGE_ENDPOINT=https://s3.amazonaws.com   # or your R2 endpoint
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET=synxor
```

No code changes needed.

## Releasing

Releases are cut from `main` with [release-it](https://github.com/release-it/release-it). The
version bump and `CHANGELOG.md` are derived from Conventional Commits (the same format
commitlint enforces), so there's nothing to bump by hand — merge PRs with conventional titles and
the history does the rest.

```bash
export GITHUB_TOKEN=...   # a token with repo scope, for the GitHub Release
pnpm release              # or: pnpm release --dry-run to preview version + changelog
```

`pnpm release` picks the next semver from the commits since the last `v*` tag, regenerates
`CHANGELOG.md`, commits it with the version bump, tags `vX.Y.Z`, pushes, and opens a GitHub Release
with the same notes. Nothing is published to npm. The first release is `v0.1.0`.

## License

UNLICENSED — self-hosted personal use.
