# Boswell DMS

Document management system using React/Vite, Node.js/Express and MySQL. Apache serves
the frontend and proxies `/api` to the Node.js process.

## Frontend structure

The React frontend is organized by feature. Each feature owns its page,
components, and API services, while reusable infrastructure stays at the root of
`src`.

```text
src/
├── features/
│   ├── dashboard/
│   │   ├── components/
│   │   ├── services/dashboardService.ts
│   │   └── page.tsx
│   ├── documents/
│   │   ├── components/
│   │   ├── services/documentsService.ts
│   │   └── page.tsx
│   ├── report/
│   ├── trash/
│   └── settings/
│       ├── activity/
│       └── user/
├── services/api.ts
├── routes/
├── layout/
├── hooks/
├── locales/
└── utils/
```

`src/services/api.ts` is the shared HTTP client. Feature-specific requests must
remain inside their feature's `services` directory.

## Backend structure

The Express backend is organized by feature. Each feature owns its routes,
controller, and repository. Shared configuration and middleware remain directly
under `server/src`.

```text
server/
├── src/
│   ├── features/
│   │   ├── activity/
│   │   │   ├── routes/
│   │   │   │   └── activity.routes.js
│   │   │   ├── controllers/
│   │   │   │   └── activity.controller.js
│   │   │   └── repositories/
│   │   │       └── activity.repository.js
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── health/
│   │   ├── reports/
│   │   ├── users/
│   │   └── index.js
│   ├── config/
│   ├── middleware/
│   ├── app.js
│   └── server.js
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
└── scripts/
```

`server/src/features/index.js` registers every backend feature under `/api/v1`. Request
handling follows this flow:

```text
feature route → feature controller → feature repository → MySQL
```

- Routes define HTTP methods and paths.
- Controllers validate requests and create HTTP responses.
- Repositories contain database queries.
- Cross-feature configuration and middleware stay outside individual features.

## Development

```bash
npm install
npm run dev
```

## API and database

```bash
cd server
cp .env.example .env
npm install
cd ..
npm run db:migrate
npm run db:seed
npm run server:dev
```

The migration files live in `server/database/migrations`. The runner creates the `boswell_dms` database when needed, then creates
`users`, `documents`, `document_versions`, `activity_logs`, and
`schema_migrations`. Set the MySQL connection in `server/.env`; never commit that
file. SQL seeders belong in `server/database/seeders`, while development/test
factories belong in `server/database/factories`. The API is mounted under `/api/v1`, with `GET /api/v1/health` available for
a database health check.

For production, build the frontend with `npm run build`, adjust the paths and
hostname in `config/apache/boswell-dms.conf`, enable Apache's `proxy`,
`proxy_http`, and `rewrite` modules, and run the API with a process supervisor.
