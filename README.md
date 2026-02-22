# SKYBATTLE 🚀

> Real-Time 2D Multiplayer Jetpack Shooter — Inspired by Mini Militia (Doodle Army 2)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

SKYBATTLE is a fast-paced 2D multiplayer Android game where players fight with jetpacks and dual-wielded weapons across compact arena maps. Built for India and Southeast Asia with sub-100ms latency.

## Tech Stack

| Component      | Technology                   |
| -------------- | ---------------------------- |
| Game Client    | Unity 2023 LTS (C#, URP)     |
| Game Server    | Go (UDP, goroutines)         |
| Backend        | Node.js 20 + Express         |
| Database       | PostgreSQL 15                |
| Cache          | Redis 7                      |
| Object Storage | MinIO (dev) / AWS S3 (prod)  |
| Orchestration  | Docker + Kubernetes (Agones) |
| CI/CD          | GitHub Actions               |

## Repository Structure

```
skybattle/
  backend/
    auth-service/          # Auth, JWT, registration
    matchmaking-service/   # ELO-based matchmaking
    profile-service/       # Player stats, XP, coins
    store-service/         # Inventory, store, battle pass
    api-gateway/           # Nginx routing config
  game-server/             # Go UDP authoritative game server
  unity-client/            # Unity 2023 LTS game project
  infra/
    docker/                # Docker Compose for local dev
    k8s/                   # Kubernetes manifests
    scripts/               # DB migration + seed scripts
  docs/                    # Documentation copy
```

## Quick Start (Development)

**Prerequisites:** Node.js 20, Go 1.22+, Docker Desktop, Unity 2023 LTS

```bash
# 1. Clone repo
git clone https://github.com/Siddhantkhandelwal18/skybattle.git
cd skybattle

# 2. Set up environment
cp backend/auth-service/.env.example backend/auth-service/.env
# (repeat for other services — see docs/21_Developer_Environment_Setup.md)

# 3. Start infrastructure (PostgreSQL, Redis, MinIO)
cd infra/docker && docker compose up -d

# 4. Run migrations
cd infra/scripts && node migrate.js && node seed.js

# 5. Start backend services (each in own terminal)
cd backend/auth-service && npm install && npm run dev       # :3001
cd backend/matchmaking-service && npm install && npm run dev # :3002
cd backend/profile-service && npm install && npm run dev    # :3003
cd backend/store-service && npm install && npm run dev      # :3004

# 6. Start game server
cd game-server && go mod download && go run cmd/server/main.go

# 7. Open Unity project in unity-client/
```

## Development Phases

| Phase   | Status        | Milestone                            |
| ------- | ------------- | ------------------------------------ |
| Phase 1 | 🚧 In Progress | Offline single-player vs bots        |
| Phase 2 | 📋 Planned     | LAN multiplayer                      |
| Phase 3 | 📋 Planned     | Full online matchmaking + anti-cheat |
| Phase 4 | 📋 Planned     | Monetization + Google Play launch    |

## Documentation

Full documentation in `docs/` folder (27 documents covering every aspect of the project).

## License

MIT License — see LICENSE file.
