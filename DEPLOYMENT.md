# Deployment Guide

This project is ready to deploy as:

- Frontend: Vercel
- Backend: Render
- Database: Supabase Postgres

## 1. Backend Deploy

Backend files live in [backend](/C:/Users/chara/OneDrive/Documents/COH/backend).

Use [render.yaml](/C:/Users/chara/OneDrive/Documents/COH/backend/render.yaml) or create a Render web service manually.

Set these environment variables on the backend:

- `NODE_ENV=production`
- `PORT=10000`
- `DATABASE_URL=<your supabase pooled connection string>`
- `JWT_SECRET=<strong random secret>`
- `JWT_EXPIRES_IN=8h`
- `CLIENT_ORIGIN=<your frontend domain>`

After first deploy, run:

```bash
npm run migrate
npm run seed
```

If you already synced your facility catalog locally, you can also run:

```bash
npm run sync:facilities
```

## 2. Frontend Deploy

Frontend files live at the project root:

- [uch.html](/C:/Users/chara/OneDrive/Documents/COH/uch.html)
- [app.js](/C:/Users/chara/OneDrive/Documents/COH/app.js)
- [app.config.js](/C:/Users/chara/OneDrive/Documents/COH/app.config.js)

Before deploying, update [app.config.js](/C:/Users/chara/OneDrive/Documents/COH/app.config.js):

```js
window.CAMPUSBOOK_CONFIG = {
  apiBase: "https://your-backend-domain.example.com/api"
};
```

Then deploy the project root to Vercel. [vercel.json](/C:/Users/chara/OneDrive/Documents/COH/vercel.json) already rewrites the root path to [uch.html](/C:/Users/chara/OneDrive/Documents/COH/uch.html).

## 3. Final Checklist

- Backend domain is live on Render
- Frontend `apiBase` points to backend `/api`
- Backend `CLIENT_ORIGIN` matches frontend domain
- Supabase database is reachable from backend
- Migrations completed
- Seed or sync script completed

## 4. Local URLs

- Frontend: `http://localhost:8080/uch.html`
- Backend: `http://localhost:5002`
