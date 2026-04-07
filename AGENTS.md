<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Database schema

`supabase/schema.sql` is the **source of truth** for the database schema — a
full `pg_dump` snapshot of the live Supabase project. There is no
`supabase/migrations/` folder; we use snapshot-based schema management, not
incremental migrations.

**After any schema change (tables, columns, indexes, policies, functions,
triggers, etc.) regenerate the snapshot and commit it in the same PR:**

```bash
supabase db dump -f supabase/schema.sql
```

To apply the schema to a fresh Supabase project, use the Session Pooler
connection string and run:

```bash
psql "<session-pooler-uri>" -f supabase/schema.sql
```
