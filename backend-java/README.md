# Java microservices backend

This folder contains the Java/Spring Boot–based microservices that will gradually take over responsibilities from the existing Node/Express backend.

## Modules

- `backend-java/pom.xml`: Maven parent project and dependency management.
- `common-lib`: Shared code (DTOs, error models, utilities) used by services.
- `tenant-service`: First microservice providing `/api/tenants` CRUD APIs backed by PostgreSQL.

## Tenant service

- Port: `8081` (configurable via `server.port`).
- Database configuration is controlled by the `TENANT_SERVICE_DB_URL`, `TENANT_SERVICE_DB_USERNAME`, and `TENANT_SERVICE_DB_PASSWORD` environment variables.
- Flyway runs migrations from `classpath:db/migration`, starting with `V1__create_tenants_table.sql`.

## Node backend integration

The existing Node backend (`server/routes.ts`) now conditionally forwards tenant-related routes to the Java `tenant-service` when `TENANT_SERVICE_BASE_URL` is defined:

- `GET /api/tenants`
- `GET /api/tenants/:id`
- `POST /api/tenants`

If `TENANT_SERVICE_BASE_URL` is **not** set, the existing Node implementations continue to run as before. This allows a gradual, feature-by-feature migration of functionality from Node to Java services.

