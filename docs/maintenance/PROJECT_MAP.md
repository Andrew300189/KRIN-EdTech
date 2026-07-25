# Project Map (Support-Oriented)

This map helps quickly find the right area during support and maintenance.

## Runtime App

- `src/app/` - Next.js routes, layouts, error/loading pages
- `src/core/` - shared building blocks (components/hooks/services/types/utils)
- `src/modules/` - feature modules by domain

## Legacy/Static UI Areas

- `index.html` - static landing variant
- `Main/` - static landing variant with split CSS/JS

## Domain Folders (root-level)

- `ai/` - AI widgets/services/pages
- `authentication/` - auth views and utilities
- `courses/` - courses views/data
- `lessons/` - lesson views/data
- `layouts/` - layout components
- `components/` - reusable UI components

## Data Layer

- `database/prisma/schema.prisma` - source of truth for DB models
- `database/prisma/migrations/` - migration history
- `database/backups/` - backups

## Public Assets

- `public/images/`, `public/icons/`, `public/videos/`, `public/audio/`

## Testing

- `tests/unit/`
- `tests/integration/`
- `tests/e2e/`
- `tests/performance/`

## Configuration

- `package.json` - scripts and dependencies
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `.github/workflows/ci.yml` - CI pipeline

## Documentation

- `README.md` - project entrypoint
- `docs/ROUTING.md` - route map
- `docs/MODULES.md` - module structure
- `docs/architecture/overview.md` - architecture overview
- `docs/api/endpoints.md` - API docs
- `docs/maintenance/` - support process docs
