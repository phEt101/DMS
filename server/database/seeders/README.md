# Seeders

Place ordered `.sql` or `.ts` seed files in this directory. TypeScript seeders
must export an async `up(connection)` function. Run pending seeders with
`npm run db:seed` from the `server` directory. Applied files are recorded in
the `database_seeders` table.

The access-control seeder creates the system roles, permissions, default
department, and role-permission mappings. The admin seeder contains its
initial account data and bcrypt password hash. It restores or updates an
existing account with the same email instead of creating a duplicate.

Database commands:

- `npm run db:migrate` applies pending migrations.
- `npm run db:seed` applies pending seeders.
- `npm run db:fresh` drops all tables in the configured database and reruns migrations.
- `npm run db:fresh:seed` drops all tables, reruns migrations, and reruns all seeders.

Fresh commands only affect the database configured by `DB_NAME`; they do not
drop the shared MySQL database volume. They are blocked when `NODE_ENV` is
`production` unless `--force` is passed explicitly.
