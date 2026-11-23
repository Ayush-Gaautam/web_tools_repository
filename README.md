# MessForecast

MessForecast is a mess-demand, meal-booking and food-waste application. The repository contains a complete ASP.NET Core MVC implementation and a Vercel-compatible serverless web entrypoint.

## Root cause

The previously uploaded project was an ASP.NET Core application with no Vercel build/deployment entrypoint. Vercel cannot start `Program.cs` or the ASP.NET runtime directly; it must receive a supported static/serverless project or a separate container platform. The original repository also referenced missing `Controllers`, `Models`, `Data`, `Views`, and `Services` files, so it could not compile.

This repository now provides:

- A working ASP.NET Core app for local use and containers.
- A Vercel static UI plus Node.js serverless API at `/api`.
- PostgreSQL persistence for Vercel.
- In-memory demo fallback for local preview only; it is not persistent on Vercel.

## Local ASP.NET run

```powershell
dotnet restore
dotnet run --project web_ca_3.csproj
```

SQLite uses `app.db` and startup creates missing tables and demo data. Open `http://localhost:5100` if that is the URL shown in the terminal.

## Docker + SQL Server

```powershell
docker compose up --build
```

Open `http://localhost:8080`. This mode uses SQL Server for persistent application data.

## Vercel deployment

The Vercel entrypoint is included as `api/index.js`, `public/index.html`, `package.json`, and `vercel.json`.

In the Vercel project:

1. Import `Ayush-Gaautam/web_tools_repository` and select this branch.
2. Set the framework preset to **Other**.
3. Set these environment variables:
   - `DATABASE_URL` (or `POSTGRES_URL`) — PostgreSQL/Neon connection string.
   - `JWT_SECRET` — a long random secret.
4. Redeploy.

The live project URL should become functional after a PostgreSQL database and environment variables are attached. A database URL is the external configuration blocker if the Vercel project has none.

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@mess.local` | `Admin123!` |
| Manager | `manager@mess.local` | `Manager123!` |
| Kitchen | `kitchen@mess.local` | `Kitchen123!` |
| Student | `student@mess.local` | `Student123!` |

Demo users are inserted on startup/first login. Set `JWT_SECRET` in production. Passwords are hashes in PostgreSQL or ASP.NET Identity stores; do not commit production secrets.

## Core routes

- ASP.NET dashboard: `/`
- ASP.NET operations: `/Operations`
- ASP.NET admin: `/Admin`
- ASP.NET forecast API: `/api/forecast`
- Vercel UI: `/`
- Vercel health: `/api/health`
- Vercel login: `POST /api/login`
- Vercel dashboard: `GET /api/dashboard`
- Vercel bookings: `POST /api/bookings`
- Vercel waste: `GET /api/waste`, `POST /api/waste`

## Build and test

```powershell
dotnet build web_ca_3.csproj
npm install
npm run build
npm test
```
