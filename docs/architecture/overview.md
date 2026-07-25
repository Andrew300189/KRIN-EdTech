# Architecture Documentation

## Project Overview

KRIN EdTech is a comprehensive educational platform built with Next.js, featuring:

- **Modular Architecture**: Each feature is a self-contained module
- **Scalable Design**: Easy to add new features without touching existing code
- **Type-Safe**: Full TypeScript support throughout
- **API-First**: Clean separation between frontend and backend

## Directory Structure

### `/src/app`

Next.js App Router configuration with route groups for different sections:

- `(public)`: Landing pages, home
- `(auth)`: Login, registration, password reset
- `(dashboard)`: Main application dashboard
- `(admin)`: Admin panel (role-gated)
- `/api`: API routes

### `/src/core`

Shared utilities used across the entire application:

- **components**: Reusable UI components (Button, Card, Input, etc.)
- **layouts**: Layout templates (MainLayout, DashboardLayout, etc.)
- **hooks**: Custom React hooks (useAuth, useFetch, etc.)
- **services**: API clients and utility services
- **utils**: Helper functions and utilities
- **types**: TypeScript type definitions
- **constants**: Application-wide constants
- **config**: Configuration files
- **providers**: Context providers and state management

### `/src/modules`

Feature-based modules:

- **auth**: Authentication and authorization
- **courses**: Course management
- **lessons**: Lesson content and delivery
- **ai**: AI tutor features
- **vocabulary**: Vocabulary learning tools
- **payments**: Payment processing
- **analytics**: Usage analytics and reporting
- And 15+ more specialized modules

### `/database`

Database configuration:

- **prisma/schema.prisma**: Data model definition
- **prisma/migrations**: Database migration history
- **backups**: Database backups

### `/docs`

Documentation:

- **architecture**: System design documents
- **api**: API documentation
- **database**: Database schema docs
- **deployment**: Deployment guides
- **design-system**: UI/UX guidelines
- **roadmap**: Product roadmap
- **business**: Business logic and requirements

### `/tests`

Test suites:

- **unit**: Unit tests for functions and components
- **integration**: Integration tests for features
- **e2e**: End-to-end tests
- **performance**: Performance benchmarks

## Development Workflow

1. Create components in `/src/core/components`
2. Build modules in `/src/modules/[module-name]`
3. Connect modules via routes in `/src/app`
4. Write tests in `/tests`
5. Document changes in `/docs`
