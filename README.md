# StockFlow

Inventory management for small retail stores: a **FastAPI + PostgreSQL** REST API and a **React + TypeScript** web app, designed to work on desktop and on phones.

Built as a hands-on study of full-stack architecture and as a reusable base for store-specific projects.

## Features

- **Authentication** with JWT. Expired sessions send the user back to the login page.
- **Categories and products** with full CRUD. Products have an optional size (`500g`, `M`...), an optional **expiration date** and an optional **photo**.
- **Stock movements** (in/out) with available-balance validation and a searchable history. Stock quantity only changes through movements, which keeps an audit trail.
- **Dashboard** with clickable cards and lists: low stock and products expired or close to expiring. Every card opens the products page already filtered.
- **Search and filters** stored in the URL (shareable links), pagination and confirmation dialogs before deleting.
- **Responsive UI**: tables on desktop, cards on mobile.

## Tech stack

| Layer | Technologies |
|---|---|
| Backend | Python 3.13, FastAPI, SQLAlchemy 2, Alembic, Pydantic, PyJWT, Passlib/bcrypt |
| Database | PostgreSQL 17 |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Axios |
| Infrastructure | Docker and Docker Compose |

## Architecture

The backend is split in layers, and each layer only talks to the next one:

```
Route  ->  Service  ->  Repository  ->  Model
```

- **`routes/`**: HTTP layer. Validates input with schemas and translates errors into HTTP responses.
- **`services/`**: business rules (for example: no stock-out larger than the available balance).
- **`repositories/`**: database access through SQLAlchemy.
- **`models/`**: table definitions.
- **`schemas/`**: input and output validation (Pydantic).
- **`core/`**: settings, security (hashing and JWT), file storage and the app factory.

Database changes are versioned with Alembic migrations.

## Getting started

Requirements: **Docker** with Docker Compose, and **Node.js 20+**.

### 1. Backend

```bash
git clone https://github.com/fernanndev/stockflow-api.git
cd stockflow-api
```

Create the `.env` file from the example and set a strong `SECRET_KEY`:

```bash
cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"
```

Start the API and the database, apply the migrations and create the first user:

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python -m app.scripts.create_user
```

The API is available at `http://localhost:8000` and the interactive documentation (Swagger) at `http://localhost:8000/docs`.

User registration is **not public**: accounts are created by an authenticated user, or by the command above for the first one.

### 2. Frontend

```bash
cd frontend
npm install
```

Create a file named `frontend/.env` with the address of the API:

```
VITE_API_URL=http://localhost:8000
```

Then start the development server:

```bash
npm run dev
```

Open `http://localhost:5173` and sign in.

## Configuration

| Variable | Used by | Description |
|---|---|---|
| `SECRET_KEY` | API | Key used to sign the JWT tokens. Keep it secret. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | API | Session length. Defaults to 480 (8 hours) in Docker Compose. |
| `CORS_ORIGINS` | API | Comma-separated list of frontend addresses allowed to call the API. |
| `DATABASE_URL` | API | PostgreSQL connection string. Docker Compose already sets it. |
| `VITE_API_URL` | Frontend | Address of the API. |

## API overview

Every route requires a Bearer token, except the health check and login. Full details at `/docs`.

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/login` | Login (returns a JWT) |
| `GET` `POST` `DELETE` | `/users/` | List, create and delete users |
| `GET` `POST` | `/categories/` | List and create categories |
| `PUT` `DELETE` | `/categories/{id}` | Update and delete a category |
| `GET` `POST` | `/products/` | List and create products |
| `PUT` `DELETE` | `/products/{id}` | Update and delete a product |
| `POST` `DELETE` | `/products/{id}/image` | Upload or remove the product photo |
| `GET` `POST` | `/stock-movements/` | List history (`?product_id=`) and register in/out movements |
| `GET` | `/reports/dashboard` | Totals for the dashboard |
| `GET` | `/reports/low_stock` | Products at or below the minimum stock |
| `GET` | `/reports/expiring` | Products expired or expiring soon (`?days=30`) |

## Project structure

```
app/
  api/routers/   health check
  auth/          current-user dependency
  core/          settings, security, storage, app factory
  database/      engine and session
  models/        SQLAlchemy models
  repositories/  data access
  routes/        HTTP routes
  schemas/       Pydantic schemas
  scripts/       admin commands (create-user)
  services/      business rules
alembic/         database migrations
frontend/
  src/api/         HTTP calls
  src/components/  shared UI components
  src/pages/       screens
  src/hooks/       custom hooks
  src/utils/       helpers
```

## Design notes

- **Stock changes only through movements.** Editing a product does not change its quantity; this keeps the history trustworthy.
- **Photos** are stored on a Docker volume and only the file name is saved in the database. Uploads are validated by their real content (file signature), not by the name or the type sent by the browser, and limited to 5 MB.
- **Deleting a product** also deletes its movement history, and the interface warns the user about it first.

## Known limitations

- No user roles yet: any signed-in user can create other users.
- Money values are stored and calculated as floating point.
- Lists are loaded in full and paginated in the browser, which is fine for a small store.
- Photos are served without authentication (the file names are unguessable).
- The provided Docker Compose file is meant for development, not for production.
- There is no automated test suite yet.

## Roadmap

- Automated tests and continuous integration
- Production deployment setup and backups
- Reports: profit, best sellers, Excel/PDF export
- User roles

## Author

Fernando Neto - [github.com/fernanndev](https://github.com/fernanndev)
