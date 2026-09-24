# EventOps Architecture Notes

## Monorepo Layout

```
/
├── apps/
│   ├── api/               # Express backend (Modular Monolith)
│   │   ├── prisma/        # Database schema and migrations
│   │   └── src/
│   │       ├── config/    # Environment and service configurations
│   │       ├── core/      # Database (Prisma), Redis, S3/MinIO, Queue, Logger
│   │       ├── middleware/# Auth, RBAC, error handling, rate limiting
│   │       └── modules/   # 10 domain modules with routes/controller/service/repo
│   └── web/               # React + TypeScript + Tailwind CSS (Vite SPA)
├── packages/
│   └── shared-types/      # Enums, interfaces, DTOs shared across apps
├── infra/
│   ├── docker/            # Docker Compose & service Dockerfiles
│   └── terraform/         # Placeholder for future AWS ECS/RDS infra
└── docs/                  # Architecture, ER diagram, API documentation
```

## Backend Modular Monolith Pattern

Modules under `/apps/api/src/modules`:
- `auth`: JWT registration, login, token refresh, multi-role assignment.
- `users`: User profiles, interest tags, account settings.
- `organizations`: Org creation, verification state, membership RBAC.
- `communities`: Community follow/unfollow, member lists (kept private from external callers).
- `events`: Event CRUD, status lifecycle (draft -> published -> completed/cancelled), discovery filters.
- `collaboration`: Cross-org collaboration proposals, negotiation messages, workspace.
- `outreach`: Permission-based outreach requests, approval pipeline, aggregated campaign delivery & stats.
- `sponsorship`: Sponsorship opportunity boards, applications, CRM pipeline.
- `venues`: Venue directory, capacity/facility filters, booking requests.
- `notifications`: Async email dispatch via BullMQ + Redis + Mailhog.

### Boundary Enforcement
- Modules interact via **Services**, not direct cross-module table joins or raw database mutation.
- Outreach recipient records are strictly isolated; an external organizer cannot inspect individual recipient identities at the repository or API layer.

## Services & Ports
| Service | Local Dev Port | Container Port | Purpose |
|---|---|---|---|
| Frontend (Web) | 3000 | 80 / 3000 | React Client UI |
| Backend (API) | 4000 | 4000 | Express Modular Monolith |
| PostgreSQL | 5432 | 5432 | Relational Data Store |
| Redis | 6379 | 6379 | Job Queue & Token/Cache Store |
| MinIO (S3 API) | 9000 | 9000 | S3 Object Storage API |
| MinIO Console | 9001 | 9001 | Web Console for Storage |
| Mailhog SMTP | 1025 | 1025 | Local Dev Email Capture |
| Mailhog Web UI| 8025 | 8025 | Email Inspection Web UI |
