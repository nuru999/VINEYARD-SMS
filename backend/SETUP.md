# VINEYARD-SMS Backend - Setup Guide

Complete setup guide for the School Management System Backend.

## Prerequisites

Before starting, ensure you have:
- **Node.js** (v16+) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12+) - [Download](https://www.postgresql.org/download/)

## Quick Setup (Windows)

1. **Ensure PostgreSQL is running**
   - Start PostgreSQL service
   - Default connection: `localhost:5432`

2. **Double-click `start.bat`**
   - This will automatically:
     - Setup database
     - Create test admin user
     - Start the server

3. **See your test credentials in the console**
   - Email: `admin@vineyard.test`
   - Password: `admin123456`

## Manual Setup

### Step 1: Configure Environment

Open `backend/.env` and verify:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shule_sms
DB_USER=postgres
DB_PASSWORD=          # Leave empty if PostgreSQL uses no password
JWT_SECRET=vineyard-sms-dev-key-2024-change-in-production
PORT=5000
```

### Step 2: Setup Database

Run the database setup script:

```bash
cd backend
node setup-db.js
```

This will:
- ✅ Create `shule_sms` database
- ✅ Create all tables and indexes
- ✅ Create test admin user
- ✅ Display test credentials

### Step 3: Start Server

```bash
npm run dev
```

Expected output:
```
🚀 Server running on port 5000
✅ Database connected: [timestamp]
```

The API is now ready at: `http://localhost:5000/api`

## Testing the API

### Option 1: Using cURL

**Login with test credentials:**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vineyard.test",
    "password": "admin123456"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@vineyard.test",
    "role": "super_admin",
    "firstName": "Admin",
    "lastName": "User",
    "schoolId": "uuid",
    "schoolName": "Vineyard Test School"
  }
}
```

### Option 2: Using Postman

1. Import the Postman collection from `VINEYARD-SMS.postman_collection.json`
2. Set the environment variable `token` from login response
3. Run requests using the token

### Option 3: Using VS Code REST Client

Create `test.http` file:

```http
### Login
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@vineyard.test",
  "password": "admin123456"
}

### Get Profile (requires token from login)
GET http://localhost:5000/api/auth/profile
Authorization: Bearer YOUR_TOKEN_HERE
```

## Health Check

Check if server is running:

```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2026-04-20T10:30:00.000Z",
  "database": "connected",
  "uptime": 123.456
}
```

## Troubleshooting

### ❌ "Error: connect ECONNREFUSED 127.0.0.1:5432"

**PostgreSQL is not running**

**Solution:**
- Start PostgreSQL service
- On Windows: Open Services → PostgreSQL → Start
- On Mac: `brew services start postgresql`
- On Linux: `sudo systemctl start postgresql`

### ❌ "Error: role 'postgres' does not exist"

**Incorrect database user**

**Solution:**
- Check your PostgreSQL username (default: `postgres`)
- Update `DB_USER` in `.env`
- Or create the user: `createuser postgres`

### ❌ "Error: database 'shule_sms' does not exist"

**Database wasn't created**

**Solution:**
```bash
node setup-db.js
```

### ❌ "Port 5000 is already in use"

**Another service is using port 5000**

**Solution:**
- Change `PORT` in `.env` to another value (e.g., 5001)
- Or kill the process using port 5000

## Environment Variables Explained

| Variable | Value | Description |
|----------|-------|-------------|
| `DB_HOST` | localhost | PostgreSQL server address |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | shule_sms | Database name |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | (empty) | Database password |
| `JWT_SECRET` | dev-key | Secret for JWT signing |
| `PORT` | 5000 | API server port |
| `NODE_ENV` | development | Environment (dev/prod) |
| `MPESA_*` | test_* | M-Pesa credentials (for testing) |

## API Routes

All routes require authentication (except `/api/auth/login` and `/api/health`)

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Students
- `GET /api/students` - List students
- `POST /api/students` - Create student
- `GET /api/students/:id` - Get student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Grades
- `GET /api/grades/assessment/:assessmentId` - Get grades
- `POST /api/grades/844/:assessmentId` - Enter 8-4-4 grades
- `POST /api/grades/cbc/:assessmentId` - Enter CBC grades

### Fees
- `GET /api/fees/student/:studentId` - Get fee statement
- `POST /api/fees/payment` - Record payment
- `POST /api/fees/mpesa/initiate` - Initiate M-Pesa payment

### Reports
- `GET /api/reports/card/:studentId` - Get report card

## Next Steps

1. **Create your school**
   - Use the admin credentials to access the system
   - Create your actual school info

2. **Add users**
   - Teachers
   - Bursars
   - Other staff

3. **Add students**
   - Import or add manually
   - Link guardians

4. **Setup academic year**
   - Create terms
   - Add subjects
   - Assign teachers

5. **Build frontend**
   - Use the API endpoints
   - Create web dashboard
   - Mobile app

## Support

- Check logs for errors
- Enable debug mode: `NODE_ENV=debug`
- Review database schema: `migrations/database.sql`
- Read API documentation: `README.md`

---

**Happy Teaching! 🎓**