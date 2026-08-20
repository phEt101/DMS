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

## Docker environment

Docker Compose simulates the DMS application topology. Shared MySQL 5.6 and
phpMyAdmin are managed separately in `/Users/support/Public/Project_web/shared-infrastructure`:

```text
Browser
  └── localhost:8090 (Apache + React)
        └── /api/* → api:3000 (Express, internal)
                        └── shared-mysql:3306 (shared MySQL, internal)

localhost:8081 → shared phpMyAdmin (shared-infrastructure)
localhost:3307 → shared MySQL (shared-infrastructure)
```

Start shared infrastructure first, then create the local Docker environment file
and start DMS:

```bash
cd /Users/support/Public/Project_web/shared-infrastructure
docker compose up -d

cd /Users/support/Public/Project_web/DMS
cp .env.example .env
npm run docker:up
```

Open:

- DMS application: `http://localhost:8090`
- DMS API health through Apache: `http://localhost:8090/api/v1/health`
- phpMyAdmin: `http://localhost:8081`

The API applies pending migrations and then starts Express. Shared infrastructure
uses the `shared-mysql-data` volume and does not use the XAMPP database at
`127.0.0.1:3306`. Host port `3307` is used to avoid that port.
The MySQL service uses the existing `mysql:5.6` AMD64 image through Docker's
platform emulation. Database migrations therefore avoid data types introduced
after MySQL 5.6, such as native `JSON`.

The shared container creates two isolated databases while both applications use
the same credentials from `.env`:

```text
shared-mysql (MySQL 5.6)
├── boswell_dms
└── personal_loan
```

Both application Compose projects join the external network named
`shared-database`. Start shared infrastructure first, then either application.

Useful commands:

```bash
npm run docker:logs
npm run docker:down
docker compose ps
```

`docker:down` now stops only DMS Web/API and does not stop MySQL or phpMyAdmin.
Manage those services from `/Users/support/Public/Project_web/shared-infrastructure`.

## API and database

```bash
docker compose run --rm api npm run db:migrate
docker compose run --rm api npm run db:seed
```

The migration files live in `server/database/migrations`. The runner creates the `boswell_dms` database when needed, then creates
`users`, `documents`, `document_versions`, `activity_logs`, and
`schema_migrations`. Docker injects the MySQL connection from the root `.env`; never commit that
file. SQL seeders belong in `server/database/seeders`, while development/test
factories belong in `server/database/factories`. The API is mounted under `/api/v1`, with `GET /api/v1/health` available for
a database health check.

For production, build the frontend with `npm run build`, adjust the paths and
hostname in `config/apache/boswell-dms.conf`, enable Apache's `proxy`,
`proxy_http`, and `rewrite` modules, and run the API with a process supervisor.
