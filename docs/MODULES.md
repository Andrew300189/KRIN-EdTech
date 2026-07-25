# Project Modules Structure

## Overview

The project is organized by layers and domains:

- `src/core` for shared cross-domain code
- `src/modules` for feature/domain-specific code
- `src/app` for Next.js routing and route handlers

## Target Source Tree

```text
src/
├── app/
├── assets/
├── styles/
├── core/
│   ├── components/
│   ├── hooks/
│   │   ├── browser/
│   │   ├── network/
│   │   └── ui/
│   ├── services/
│   ├── utils/
│   ├── constants/
│   ├── types/
│   ├── layouts/
│   ├── config/
│   ├── providers/
│   └── locales/
└── modules/
    ├── achievements/
    ├── ai/
    ├── analytics/
    ├── auth/
    ├── courses/
    ├── lessons/
    ├── payments/
    ├── profile/
    ├── vocabulary/
    ├── grammar/
    ├── dashboard/
    ├── settings/
    ├── notifications/
    ├── support/
    ├── community/
    ├── cms/
    └── admin/
```

## Module Layer Convention

Each feature module can contain:

```text
module-name/
├── api/
├── services/
├── hooks/
├── constants/
├── utils/
├── types/
└── index.ts
```

## Notes for Current Repository

- Main landing page styles are centralized in `src/styles/main.css`.
- A compatibility re-export is kept at `src/modules/courses/service.ts`.
- Actual course service implementation lives in `src/modules/courses/services/course.service.ts`.
