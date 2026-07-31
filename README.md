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
npm run db:generate
```

Copy `.env.example` to `.env.local`, then set at least `DATABASE_URL` and a
strong `NEXTAUTH_SECRET`. Apply the committed database migrations once the
database is available:

```bash
npm run db:migrate:deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

- `npm run build` - Build for production
- `npm run db:generate` - Generate the Prisma client
- `npm run db:migrate:deploy` - Apply committed Prisma migrations
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:e2e` - Run E2E tests

## Communications and support

The notification queue is stored in PostgreSQL. In local development set
`EMAIL_PROVIDER=log`; emails are recorded as delivery attempts and only a safe
preview is logged. To process queued email and reminder deliveries, call the
protected worker endpoint from your scheduler:

```bash
curl -X POST http://localhost:3000/api/communications/worker \
  -H "Authorization: Bearer $NOTIFICATION_WORKER_SECRET"
```

For live email with Resend, set `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, and a
verified `EMAIL_FROM_*` sender. Configure SPF, DKIM, and DMARC before treating
email delivery as production-ready. Web Push subscriptions are stored but need
a dedicated VAPID transport adapter before live sending is enabled.

## Project Maintenance

- Contribution process: [CONTRIBUTING.md](CONTRIBUTING.md)
- Project map: [docs/maintenance/PROJECT_MAP.md](docs/maintenance/PROJECT_MAP.md)
- Support playbook: [docs/maintenance/SUPPORT_PLAYBOOK.md](docs/maintenance/SUPPORT_PLAYBOOK.md)
- Release checklist: [docs/maintenance/RELEASE_CHECKLIST.md](docs/maintenance/RELEASE_CHECKLIST.md)
- Ownership map: [docs/maintenance/OWNERSHIP.md](docs/maintenance/OWNERSHIP.md)
