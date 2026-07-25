# KRIN-EdTech Structure Map

This file documents the current layered organization under `src/`.

## Root Source Layers

- `src/app` - Next.js App Router pages and API route handlers
- `src/assets` - static source assets used by the app
- `src/styles` - centralized style library and Main landing styles
- `src/core` - shared cross-module code
- `src/modules` - feature/domain modules

## Core Layer

- `src/core/components`
- `src/core/hooks/browser`
- `src/core/hooks/network`
- `src/core/hooks/ui`
- `src/core/services`
- `src/core/utils`
- `src/core/constants`
- `src/core/types`
- `src/core/layouts`
- `src/core/config`
- `src/core/providers`
- `src/core/locales`

## Modules Layer

- `src/modules/achievements`
- `src/modules/ai`
- `src/modules/analytics`
- `src/modules/auth`
- `src/modules/courses`
- `src/modules/lessons`
- `src/modules/payments`
- `src/modules/profile`
- `src/modules/vocabulary`
- `src/modules/grammar`
- `src/modules/dashboard`
- `src/modules/settings`
- `src/modules/notifications`
- `src/modules/support`
- `src/modules/community`
- `src/modules/cms`
- `src/modules/admin`

## Applied Layering Conventions

- Course service moved to module layer path: `src/modules/courses/services/course.service.ts`
- Compatibility export kept at `src/modules/courses/service.ts` to avoid code breakage
- Module layer folders prepared for API/services/hooks/constants/utils/types
