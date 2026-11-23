# Mess Demand Forecasting & Food-Waste Management

INT402-aligned ASP.NET Core MVC application using C#, Razor views, EF Core, SQLite/SQL Server, Identity roles, and REST APIs. It avoids ML and unrelated technologies.

## Safe local run

SQLite is the default so the existing `app.db` and its data are preserved:

```powershell
dotnet restore
dotnet run
```

Demo logins (Development only; startup creates missing accounts, assigns roles, and synchronizes these passwords without deleting data):

- Admin: `admin@mess.local` / `Admin123!`
- Manager: `manager@mess.local` / `Manager123!`
- Kitchen staff: `kitchen@mess.local` / `Kitchen123!`
- Student: `student@mess.local` / `Student123!`
- Mess administrator: `messadmin@mess.local` / `MessAdmin123!`
- Finance officer: `finance@mess.local` / `Finance123!`
- System administrator: `sysadmin@mess.local` / `SysAdmin123!`

After startup: dashboard `/`, operations `/Operations`, admin `/Admin`, Identity login `/Identity/Account/Login`, forecast API `/api/forecast`, and Swagger-free API collection examples in `postman/MessForecast.postman_collection.json`.

Each account is redirected to a separate server-authorized dashboard:

- `/RoleDashboards/Student`
- `/RoleDashboards/KitchenStaff`
- `/RoleDashboards/MessManager`
- `/RoleDashboards/MessAdministrator`
- `/RoleDashboards/FinanceOfficer`
- `/RoleDashboards/SystemAdministrator`

### Role comparison

| Role | Main dashboard responsibility | Distinguishing project capability |
|---|---|---|
| Student | Book meals, view menus, review attendance | Student demand signals feed forecasting |
| Kitchen Staff | Attendance, preparation, service actuals, waste | Tablet-friendly operational capture |
| Mess Manager | Forecast review and preparation planning | Confidence, MAE/MAPE and recipe-driven quantities |
| Mess Administrator | Users, halls, dishes and ingredients | Role-controlled master-data administration |
| Finance Officer | Inventory and waste cost | Measurable waste cost and savings reporting |
| System Administrator | Access, APIs and system activity | Authorized API/database health oversight |

Unlike ordinary mess-management applications, this project combines demand forecasting with confidence/accuracy metrics, recipe-based ingredient planning, measurable waste costing, role-specific workflows, and an offline-ready attendance design path.

In Development, startup adds a repeatable sample dataset only when the marker is absent: 30 days of attendance across two halls, dishes, shared recipes, bookings, events, forecasts, service actuals, waste, and a preparation plan. It never deletes existing rows. The current SQLite sample baseline is approximately 2 halls, 4 dishes, 7 ingredients, 183 attendance rows, 14 forecasts, 180 service actuals, 3 waste rows, 2 bookings, and 1 preparation plan with 4 ingredient lines.

The app never runs `EnsureDeleted`, `database drop`, or a destructive reset. Existing SQLite data is retained; startup only creates missing objects and idempotent indexes.

## SQL Server with Docker Compose

```powershell
docker compose up --build
```

The web container selects SQL Server through `DatabaseProvider=SqlServer`, waits for the SQL Server health check, and applies the repeatable EF migration history. For Visual Studio/LocalDB, set `DatabaseProvider=SqlServer` and configure `ConnectionStrings:SqlServer` in user secrets or environment variables.

## Features

- Identity authentication plus Admin, Manager, and Staff authorization.
- Normalized dishes, ingredients, recipes, attendance, calendar events, forecasts, service actuals, and waste records.
- Unique constraints, non-negative quantity/cost validation, duplicate conflict responses, and safe soft-delete for dishes.
- Statistical forecast using weighted moving average, weekday adjustment, calendar-event adjustment, MAE, MAPE, and confidence.
- Forecasting excludes future attendance and can filter by dining hall; preparation plans aggregate shared recipe ingredients, apply safety margins, compare stock, and record shortages.
- Waste reporting is available through `GET /api/reports/waste` with date range and optional meal filters. It returns summary waste percentage/cost plus dish and meal breakdowns.
- Saved preparation plans can be read through `GET /api/preparation-plans`.
- Responsive dashboard and operations tables designed for tablet service capture.
- Students can book/cancel meals before the 10:00 same-day cutoff and submit feedback through REST endpoints; kitchen staff can capture service data; managers can review forecast metrics; admins can manage users and halls.
- Authorized REST CRUD: `/api/dishes`, `/api/ingredients`, `/api/attendance`, `/api/events`, `/api/actuals`, `/api/waste`; forecast and reporting endpoints are also available.
- Postman examples in `postman/MessForecast.postman_collection.json`.
- Source documentation and syllabus mapping in `docs/`.

## Database migrations

The migration policy is documented in `Data/Migrations/README.md`. SQL Server migrations are:

- `00000000000000_CreateIdentitySchema`
- `202611150001_AddDomainModel`
- `20261115120000_AddPlanningHallAnalyticsSqlServer`

The last migration is additive: it adds halls, hall links, bookings, feedback, preparation plans, and waste meal classification. Before applying migrations to an existing SQL Server database, take a backup and inspect migration history. Do not delete the database to resolve a migration conflict. SQLite remains the active default and is updated through the idempotent bootstrap in `DbInitializer`.

## Validation

```powershell
dotnet build web_ca_3.csproj
dotnet test Tests\Tests.csproj
```

See `docs/ARCHITECTURE.md` and `docs/SYLLABUS-MAPPING.md` for the source map and coverage evidence.
