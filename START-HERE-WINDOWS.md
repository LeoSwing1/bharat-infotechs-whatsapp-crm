# Bharat Infotechs CRM — Start Here (Windows)

## 1. Keep PostgreSQL running
The project expects PostgreSQL on `localhost:5432`, database `bharat_crm`, user `postgres`, password `2703` in the current local setup.

## 2. Redis
Install/run Redis on Windows and verify:

```bat
redis-cli ping
```

Expected: `PONG`.

## 3. Backend terminal
```bat
cd /d D:\CRM\bharat-infotechs-crm-enterprise-upgraded-v1\backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Keep this terminal open. API: `http://localhost:4000`
Health: `http://localhost:4000/health`

## 4. Worker terminal
Open another terminal:

```bat
cd /d D:\CRM\bharat-infotechs-crm-enterprise-upgraded-v1\backend
npm run worker
```

Expected: `WhatsApp worker running: queue=whatsapp-dispatch ...`

## 5. Frontend terminal
Open a third terminal:

```bat
cd /d D:\CRM\bharat-infotechs-crm-enterprise-upgraded-v1\frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Demo login
- Admin: `admin@bharatinfotechs.com` / `Admin@123`
- Client: `client@bharatinfotechs.com` / `Client@123`

## Safe first test
The seeded WhatsApp configuration is `mock`. Create a campaign using the seeded contacts and send it. The worker will process the jobs and simulate sent → delivered → read. No real WhatsApp message is sent in mock mode.

## Live Meta mode
Only switch Settings → Send Mode to `Live` after adding the WABA/business account ID, phone number ID, Meta access token, webhook verify token and Meta app secret. Never commit `.env`.
