# Sundara Travels – Backend API

Production-ready Node.js/Express/MongoDB backend for the Sundara Travels taxi booking website.

---

## Quick Start

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- `MONGO_URI` – your MongoDB Atlas connection string
- `JWT_SECRET` – any long random string
- `SMTP_*` – Gmail SMTP credentials (use an App Password)
- `ADMIN_NOTIFY_EMAIL` – email to receive booking alerts

### 3. Seed the admin account (first time only)
Start the server, then call:
```
POST http://localhost:5000/api/admin/seed
```
This creates the admin using `ADMIN_EMAIL` + `ADMIN_PASSWORD` from `.env`.
**Comment out the seed route in `routes/adminRoutes.js` after use.**

### 4. Run development server
```bash
npm run dev
```

### 5. Run production
```bash
npm start
```

---

## MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free M0 cluster
3. Add a database user (username + password)
4. Whitelist your IP (or `0.0.0.0/0` for dev)
5. Click **Connect → Drivers** and copy the connection string
6. Paste into `MONGO_URI` in `.env`, replacing `<password>` and `<dbname>`

Collections created automatically by Mongoose:
- `admins`
- `bookings`

---

## API Endpoints

### Health Check
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | None | Check server status |

### Bookings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/bookings` | None | Create new booking |
| GET | `/api/bookings` | JWT | List all bookings |
| GET | `/api/bookings/:id` | JWT | Get single booking |
| PATCH | `/api/bookings/:id` | JWT | Update status/note |
| DELETE | `/api/bookings/:id` | JWT | Delete booking |

**Query params for GET /api/bookings:**
- `status` – filter by `Pending | Confirmed | Cancelled | Completed`
- `page` – page number (default: 1)
- `limit` – results per page (default: 20)

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/login` | None | Login, returns JWT |
| GET | `/api/admin/me` | JWT | Logged-in admin profile |
| POST | `/api/admin/seed` | None | Create first admin ⚠️ |

---

## Postman Testing

### 1. Create Booking (Public)
```
POST http://localhost:5000/api/bookings
Content-Type: application/json

{
  "name": "Ravi Kumar",
  "mobile": "9876543210",
  "pickup": "Chennai",
  "drop": "Bangalore",
  "journeyDate": "2026-08-15",
  "pickupTime": "06:00",
  "vehicleType": "Sedan (Toyota Etios / Dzire)"
}
```

### 2. Admin Login
```
POST http://localhost:5000/api/admin/login
Content-Type: application/json

{
  "email": "admin@sundaratravels.in",
  "password": "Admin@1234"
}
```
Copy the `token` from the response.

### 3. List All Bookings (Protected)
```
GET http://localhost:5000/api/bookings?status=Pending&page=1&limit=10
Authorization: Bearer <token>
```

### 4. Update Booking Status
```
PATCH http://localhost:5000/api/bookings/<booking_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "Confirmed",
  "adminNote": "Driver assigned: Muthu - 9444567890"
}
```

### 5. Delete Booking
```
DELETE http://localhost:5000/api/bookings/<booking_id>
Authorization: Bearer <token>
```

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| HTTP Headers | `helmet` |
| CORS | `cors` (origin-restricted) |
| Rate Limiting | `express-rate-limit` (100 req/15min; 10 bookings/15min) |
| NoSQL Injection | `express-mongo-sanitize` |
| Input Validation | `express-validator` |
| Password Hashing | `bcryptjs` (salt rounds: 12) |
| Authentication | JWT (`jsonwebtoken`) |
| Body size limit | 10kb max |

---

## Folder Structure

```
backend/
├── server.js              # Entry point
├── package.json
├── .env.example
├── config/
│   └── db.js              # MongoDB connection
├── models/
│   ├── Booking.js         # Booking schema
│   └── Admin.js           # Admin schema + bcrypt
├── controllers/
│   ├── bookingController.js
│   └── adminController.js
├── routes/
│   ├── bookingRoutes.js
│   └── adminRoutes.js
├── middleware/
│   ├── auth.js            # JWT protect middleware
│   ├── validate.js        # express-validator rules
│   └── errorHandler.js    # Global error handler
└── utils/
    └── mailer.js          # Nodemailer email helpers
```
