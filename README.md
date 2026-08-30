# Bharat Infotechs CRM — Enterprise Architecture Upgrade
###DEMO ::::    https://bharat-infotechs-production.up.railway.app/
This release preserves the existing React/Vite CRM UI and API contracts while upgrading the runtime infrastructure.

## What changed

- PostgreSQL + Prisma replaces SQLite for the operational database.
- Tenant isolation is enforced from JWT -> API queries -> database records.
- Redis + BullMQ provides a durable distributed WhatsApp dispatch queue.
- Dedicated worker process supports horizontal worker scaling.
- Socket.IO + Redis adapter provides realtime inbox/status fanout.
- CSV + XLSX ingestion is supported.
- Meta Cloud API client supports text, templates, interactive, media and read operations.
- Webhook verification, idempotency and status/inbound routing are implemented.
- Existing campaign/contact/inbox/report screens are preserved rather than replaced.
- A SQLite migration utility is included so existing data can be carried forward.

## Local setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `DATABASE_URL` and `REDIS_URL`.
3. If using local PostgreSQL, the example assumes:
   `postgresql://postgres:2703@localhost:5432/bharat_crm`
4. Create the database if needed:
   `CREATE DATABASE bharat_crm;`
5. In `backend`:
   `npm install`
   `npx prisma generate`
   `npx prisma db push`
   `npm run db:seed`
6. Start API:
   `npm run dev`
7. Start worker in another terminal:
   `npm run worker`
8. In `frontend`:
   `npm install`
   `npm run dev`
9. Open `http://localhost:5173`.

Demo:
- admin@bharatinfotechs.com / Admin@123
- client@bharatinfotechs.com / Client@123

## Existing SQLite data

Before changing anything, make a copy of your current `backend/data/bharat_crm.sqlite`.

Then set:
`SQLITE_SOURCE=E:\path\to\bharat_crm.sqlite`

Run:
`npm run migrate:sqlite`

The migration creates a separate tenant `bharat-migrated`; it does not delete or modify the SQLite file.

## Scaling

Run multiple API instances behind a load balancer and multiple `npm run worker` instances. PostgreSQL connection pooling is configured through `DATABASE_URL`; PgBouncer can be placed between the API/worker layer and PostgreSQL for larger deployments.

## Production requirements

- Replace demo secrets.
- Put API behind HTTPS.
- Use a managed PostgreSQL/Redis service or hardened HA deployment.
- Configure Meta App Secret and webhook verify token.
- Use object storage/CDN for campaign media.
- Put Socket.IO behind a load balancer with sticky sessions if required by the deployment topology.
- Keep `.env` out of source control.


## Windows quick start
Read `START-HERE-WINDOWS.md`. The project is intentionally split into three processes: API (`:4000`), BullMQ worker, and Vite frontend (`:5173`). This prevents port/process confusion and lets the worker scale independently.

Helper launchers are in `scripts/`: `start-backend.bat`, `start-worker.bat`, and `start-frontend.bat`.
