# VMS — Vehicle Management System

A full-stack web application for managing a corporate vehicle fleet — bookings, dispatches, driver management, live VTS tracking, fuel & maintenance records, and approval workflows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Ant Design 5 |
| Backend | Spring Boot 3.5, Java 17, Spring Security + JWT |
| Database | MySQL 8+ |
| Maps | Google Maps (Places, Directions, Distance Matrix) |
| Notifications | Firebase Cloud Messaging (FCM) |
| Security | AES-256-GCM end-to-end payload encryption |

---

## Features

- **Single & Multiple Booking** — vehicle request workflow with live Google Maps route planning
- **Manage Trip** — pending approval queue + active dispatch management
- **Approval Authority** — configurable multi-level approval hierarchy
- **Fleet Management** — vehicles, drivers, vendors, parking slots
- **VTS (Vehicle Tracking System)** — live GPS map with playback, geofencing, path history
- **Fuel & Maintenance** — fuel records, maintenance logs, cost tracking
- **HR & Drivers** — driver leave management, trip history, expense claims
- **Finance** — expense reports, fuel cost summaries
- **Notices** — internal notice board with read receipts
- **Audit Logs** — full action trail

---

## Project Structure

```
vms-web/
├── backend/                  # Spring Boot 3.5 API
│   └── src/main/java/com/nexdecade/vms/
│       ├── controller/       # REST endpoints
│       ├── service/          # Business logic
│       ├── repository/       # Spring Data JPA
│       ├── entity/           # JPA entities
│       └── ...               # Security, filters, schedulers
├── frontend/                 # React + Vite SPA
│   └── src/
│       ├── pages/            # Route-level components
│       ├── components/       # Shared UI components
│       ├── services/         # API client wrappers
│       ├── hooks/            # React Query hooks
│       └── utils/            # Helpers, Firebase, encryption
├── vms_schema.sql            # Full database schema
├── sample_data.sql           # Seed data for development
├── full_sample_data.sql      # Extended sample data
└── docker-compose.yml        # Local dev stack
```

---

## Prerequisites

- Java 17+
- Node.js 18+
- MySQL 8+
- Maven 3.9+
- Google Maps API key (Places, Directions, Distance Matrix APIs enabled)

---

## Getting Started

### 1. Database

```bash
mysql -u root -p -e "CREATE DATABASE vms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p vms_db < vms_schema.sql
mysql -u root -p vms_db < sample_data.sql
```

### 2. Backend

```bash
cd backend
cp src/main/resources/application.properties.example src/main/resources/application.properties
# Edit application.properties — set DB password, JWT secret, encryption key
./mvnw spring-boot:run
```

The API starts on `http://localhost:8080`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env — set encryption key (must match backend), Google Maps key, Firebase config
npm install
npm run dev
```

The UI starts on `http://localhost:5173`.

---

## Configuration

### Backend — `application.properties`

Copy `application.properties.example` → `application.properties` and fill in:

| Key | Description |
|---|---|
| `spring.datasource.password` | MySQL password |
| `vms.jwt.secret` | JWT signing secret (min 256 bits) |
| `vms.encryption.secret-key` | AES-256-GCM key (must match frontend) |

### Frontend — `.env`

Copy `.env.example` → `.env` and fill in:

| Key | Description |
|---|---|
| `VITE_ENCRYPTION_KEY` | Must match `vms.encryption.secret-key` |
| `VITE_GOOGLE_MAPS_KEY` | Google Maps API key |
| `VITE_FIREBASE_*` | Firebase project credentials (optional, for push notifications) |

---

## Default Login

| Role | Email | Password |
|---|---|---|
| Admin | admin@nexdecade.com | admin123 |

---

## Docker (optional)

```bash
docker-compose up -d
```

This starts MySQL. Configure `application.properties` to point at `localhost:3306`.

---

## API Security

All API requests are encrypted with AES-256-GCM. The request body is wrapped as:

```json
{ "enc": "<base64-encoded-ciphertext>" }
```

The frontend encrypts outgoing payloads and decrypts responses automatically via `apiClient.js`. The backend's `PayloadEncryptionFilter` handles the inverse.

---

## License

Proprietary — Nexdecade Technology Ltd. All rights reserved.
