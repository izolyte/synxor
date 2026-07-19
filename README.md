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
- Ports 80 and 443 available (or configure `API_PORT`)

## Quick start

```bash
git clone https://github.com/izolyte/synxor.git
cd synxor
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and MINIO_ROOT_PASSWORD at minimum
docker compose up -d
```

Visit `http://localhost:3000/health` — you should see `{ "status": "ok" }`.

> **Note:** The UI is not yet available. Phase 1 ships the API and infrastructure only. The full transfer UI ships at v0.1.0.

## Environment variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Default | Description |
|---|---|---|
| `API_PORT` | `3000` | Port the NestJS API listens on |
| `WEB_PORT` | `3001` | Host port for the SSR web container |
| `VITE_API_URL` | `http://localhost:3000` | Public API origin baked into the web client bundle at build time (browser-reachable) |
| `ALLOWED_ORIGINS` | `http://localhost:3001` | HTTP CORS allowlist; must include the web origin |
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
