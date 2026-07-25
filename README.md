# KRIN EdTech Platform

Comprehensive educational technology platform for language learning with AI tutoring, interactive lessons, and personalized learning paths.

## Project Structure

```
KRIN-EdTech/
├── .github/          # GitHub Actions & CI/CD
├── docs/             # Project documentation
├── database/         # Prisma schema & migrations
├── public/           # Static assets
├── tests/            # Unit, integration, E2E tests
├── src/
│   ├── app/          # Next.js App Router
│   ├── assets/       # Media files
│   ├── core/         # Shared utilities, components, services
│   └── modules/      # Feature modules
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Features

- 🎓 Interactive lesson types (Reading, Listening, Speaking, Writing, Grammar, Vocabulary)
- 🤖 AI-powered tutoring and essay checking
- 📊 Progress analytics and achievements
- 💳 Payment integration
- 🌍 Multi-language support
- 🎨 Responsive design with theme support

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:e2e` - Run E2E tests

## Project Maintenance

- Contribution process: [CONTRIBUTING.md](CONTRIBUTING.md)
- Project map: [docs/maintenance/PROJECT_MAP.md](docs/maintenance/PROJECT_MAP.md)
- Support playbook: [docs/maintenance/SUPPORT_PLAYBOOK.md](docs/maintenance/SUPPORT_PLAYBOOK.md)
- Release checklist: [docs/maintenance/RELEASE_CHECKLIST.md](docs/maintenance/RELEASE_CHECKLIST.md)
- Ownership map: [docs/maintenance/OWNERSHIP.md](docs/maintenance/OWNERSHIP.md)
