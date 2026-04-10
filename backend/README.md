# Campus Facility Management and Booking System Backend

Production-ready backend scaffold for managing campus facilities, bookings, recurring reservations, live availability, and waiting list promotion.

## 1. Folder Structure

```text
backend/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env.example
├── README.md
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    │   ├── db.js
    │   ├── env.js
    │   └── socket.js
    ├── constants/
    │   └── roles.js
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── booking.controller.js
    │   ├── facility.controller.js
    │   └── user.controller.js
    ├── db/
    │   └── migrations/
    │       └── 001_initial_schema.sql
    ├── middlewares/
    │   ├── authenticate.js
    │   ├── authorize.js
    │   ├── errorHandler.js
    │   ├── notFound.js
    │   └── validate.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── booking.routes.js
    │   ├── facility.routes.js
    │   ├── index.js
    │   └── user.routes.js
    ├── scripts/
    │   ├── generateRecurringBookings.js
    │   ├── runMigrations.js
    │   └── seed.js
    ├── services/
    │   ├── auth.service.js
    │   ├── availability.service.js
    │   ├── booking.service.js
    │   ├── facility.service.js
    │   ├── notification.service.js
    │   ├── recurringBooking.service.js
    │   ├── user.service.js
    │   └── waitingList.service.js
    ├── sockets/
    │   └── registerSocketHandlers.js
    ├── utils/
    │   ├── ApiError.js
    │   ├── asyncHandler.js
    │   ├── jwt.js
    │   └── time.js
    └── validators/
        ├── authValidators.js
        ├── bookingValidators.js
        ├── commonValidators.js
        ├── facilityValidators.js
        ├── queryValidators.js
        ├── statusValidators.js
        └── userValidators.js
```

## 2. Database Schema

Core tables:

- `roles`: RBAC role catalog (`admin`, `faculty`, `student`)
- `users`: identity, department, role, active state
- `facilities`: facility master data, capacity, amenities, active state
- `bookings`: booking transactions, time range, status, recurrence linkage
- `recurring_bookings`: recurrence rule definitions and generation cursor
- `waiting_list`: queued requests for occupied slots
- `notifications`: in-app notifications and delivery payloads

Key design details:

- `bookings.time_slot` is a generated `tstzrange` column.
- `bookings_no_overlap` uses a PostgreSQL `EXCLUDE USING gist` constraint to prevent double booking on active slots.
- `pg_advisory_xact_lock(facilityId)` is used during booking creation to reduce race windows under concurrency.
- Indexes optimize availability checks, date-range calendar queries, user booking history, and waiting list promotion.

See full SQL in [001_initial_schema.sql](/C:/Users/chara/OneDrive/Documents/COH/backend/src/db/migrations/001_initial_schema.sql).

## 3. REST API Routes

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Users

- `GET /api/users/me`
- `GET /api/users` `admin`
- `PATCH /api/users/:id/status` `admin`

### Facilities

- `GET /api/facilities`
- `GET /api/facilities/:id`
- `POST /api/facilities` `admin`
- `PUT /api/facilities/:id` `admin`
- `DELETE /api/facilities/:id` `admin`

### Bookings and Calendar

- `GET /api/bookings`
- `GET /api/bookings/:id`
- `POST /api/bookings`
- `PATCH /api/bookings/:id/status` `admin`
- `DELETE /api/bookings/:id`
- `GET /api/bookings/availability?start=...&end=...&facilityId=...`

### Waiting List

- `POST /api/bookings/waiting-list`
- `GET /api/bookings/waiting-list` `admin, faculty`
- `DELETE /api/bookings/waiting-list/:id`

## 4. Sample API Responses

### Register

```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "user": {
      "id": 9,
      "name": "Aanya Shah",
      "email": "aanya@campus.edu",
      "department": "Computer Science",
      "created_at": "2026-04-10T07:18:43.092Z",
      "role": "student"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Create Booking

```json
{
  "success": true,
  "message": "Booking created successfully.",
  "data": {
    "booking": {
      "id": 41,
      "user_id": 9,
      "facility_id": 2,
      "recurring_booking_id": 7,
      "start_time": "2026-04-14T10:00:00.000Z",
      "end_time": "2026-04-14T11:00:00.000Z",
      "status": "confirmed",
      "purpose": "Robotics club meeting",
      "notes": ""
    },
    "recurringRule": {
      "id": 7,
      "frequency": "weekly",
      "interval_value": 1,
      "recurrence_end_date": "2026-06-30T23:59:59.000Z"
    }
  }
}
```

### Availability

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "name": "Innovation Lab",
      "code": "LAB-101",
      "type": "lab",
      "location": "Engineering Block A",
      "is_available": false
    }
  ]
}
```

## 5. Sample Controller Logic

The main transactional flow lives in [booking.service.js](/C:/Users/chara/OneDrive/Documents/COH/backend/src/services/booking.service.js), where booking creation:

- acquires a facility-scoped advisory lock
- validates facility state
- inserts the booking under the PostgreSQL overlap constraint
- creates the recurrence rule when requested
- writes a notification
- emits Socket.io events after commit

Waiting list promotion runs during cancellation in [waitingList.service.js](/C:/Users/chara/OneDrive/Documents/COH/backend/src/services/waitingList.service.js) and promotes users by `created_at` order for first-come-first-serve assignment.

## 6. Real-Time Implementation Approach

Socket.io rooms are used for:

- `facility:{facilityId}` for live availability refreshes
- `user:{userId}` for personal notifications
- `calendar` for shared booking timeline updates

Emitted events:

- `booking:created`
- `booking:updated`
- `booking:cancelled`
- `booking:promoted`
- `facility:availability-updated`
- `calendar:booking-updated`
- `notification:new`

## 7. Architecture Summary

- Express provides a modular REST API surface.
- PostgreSQL handles relational integrity, conflict detection, and fast date-range querying.
- JWT secures stateless authentication, while RBAC middleware enforces permissions.
- Recurring bookings are stored as rules and materialized ahead of time by a generation script or scheduler.
- Waiting list promotion is transaction-safe and deterministic.
- Docker assets and `.env.example` make the project deployment-ready.

## 8. Run Locally

```bash
npm install
cp .env.example .env
npm run migrate
npm run seed
npm run dev
```

## 9. Production Notes

- Add a job runner or cron to invoke `npm run generate:recurring`.
- Replace the placeholder SMTP config with a real provider for email delivery.
- Put the API behind TLS and an API gateway or reverse proxy.
- Consider Redis-backed Socket.io scaling for multi-instance deployments.
