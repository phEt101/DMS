# Seeders

Place ordered `.sql` or `.ts` seed files in this directory. TypeScript seeders
must export an async `up(connection)` function. Run pending seeders with
`npm run db:seed` from the `server` directory. Applied files are recorded in
the `database_seeders` table.

The access-control seeder creates the system roles, permissions, default
department, and role-permission mappings. The admin seeder contains its
initial account data and bcrypt password hash. It restores or updates an
existing account with the same email instead of creating a duplicate.
