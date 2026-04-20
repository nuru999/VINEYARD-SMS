# 🚀 VINEYARD-SMS - Quick Start Guide

Get your school management system up and running in minutes!

---

## ⚡ 5-Minute Quick Start

### Step 1: Ensure PostgreSQL is Running

**Windows:**
```bash
# Open Services (services.msc) and start PostgreSQL
# OR use:
pg_ctl -D "C:\Program Files\PostgreSQL\data" start
```

**Mac:**
```bash
brew services start postgresql
```

**Linux:**
```bash
sudo systemctl start postgresql
```

### Step 2: Start Everything with One Command

**Windows:**
```bash
Double-click: start.bat
```

**Mac/Linux:**
```bash
bash start.sh
```

This will automatically:
- ✅ Setup database
- ✅ Create tables
- ✅ Create test admin user
- ✅ Start the server

### Step 3: You're Done! 🎉

The server is now running on `http://localhost:5000`

**Test Credentials:**
- Email: `admin@vineyard.test`
- Password: `admin123456`

---

## 📚 What's Included

### Pre-Built Features
- ✅ **Authentication** - JWT-based secure login
- ✅ **Student Management** - Complete CRUD operations
- ✅ **Grades** - Support for 8-4-4 and CBC curricula  
- ✅ **Fee Management** - Payment tracking
- ✅ **M-Pesa Integration** - Ready for payment processing
- ✅ **Report Cards** - Academic reports
- ✅ **Role-Based Access** - Admin, teacher, bursar, parent roles

### Documentation Provided
- 📖 [README.md](README.md) - Full documentation
- 📖 [SETUP.md](SETUP.md) - Detailed setup guide
- 📖 [TESTING.md](TESTING.md) - How to test all features
- 📖 [MPESA_SETUP.md](MPESA_SETUP.md) - M-Pesa payment setup

---

## 🧪 Test It Now

### Test 1: Health Check (No login needed)

```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "OK",
  "database": "connected"
}
```

### Test 2: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vineyard.test",
    "password": "admin123456"
  }'
```

Copy the `token` from response for next tests.

### Test 3: Create a Student

```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "admissionNumber": "VIN/2026/0001",
    "gender": "male",
    "dateOfBirth": "2010-05-15",
    "curriculum": "8-4-4",
    "currentGrade": "Form 1"
  }'
```

### Test 4: View Fee Statement

```bash
curl http://localhost:5000/api/fees/student/STUDENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 💳 Setup M-Pesa (Optional)

### Quick Setup

1. Visit **https://developer.safaricom.co.ke/**
2. Create account and app
3. Copy these from Daraja portal:
   - Consumer Key
   - Consumer Secret
   - Passkey (Lipa na M-Pesa password)
4. Edit `backend/.env`:
   ```env
   MPESA_CONSUMER_KEY=your_key
   MPESA_CONSUMER_SECRET=your_secret
   MPESA_PASSKEY=your_passkey
   MPESA_SHORTCODE=174379  # For sandbox
   MPESA_ENV=sandbox
   ```

5. Test M-Pesa setup:
   ```bash
   npm run test-mpesa
   ```

For full M-Pesa setup, see [MPESA_SETUP.md](MPESA_SETUP.md)

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/        # Business logic
│   ├── routes/            # API endpoints
│   ├── models/            # Database queries
│   ├── middleware/        # Auth, validation
│   ├── services/          # M-Pesa, SMS
│   ├── utils/             # Helpers
│   └── validators/        # Input validation
├── migrations/            # Database schema
├── server.js              # Main app
├── setup-db.js            # Database setup
├── test-mpesa.js          # M-Pesa tests
├── start.bat              # Windows startup
├── start.sh               # Unix startup
├── .env                   # Configuration
├── package.json           # Dependencies
└── README.md              # Full documentation
```

---

## 🎯 Common Tasks

### Add More Admin Users

```bash
curl -X POST http://localhost:5000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "schoolName": "Your School",
    "adminEmail": "principal@school.edu",
    "adminPassword": "SecurePassword123",
    "firstName": "Principal",
    "lastName": "Name"
  }'
```

### List All Students

```bash
curl http://localhost:5000/api/students \
  -H "Authorization: Bearer TOKEN"
```

### Record a Payment

```bash
curl -X POST http://localhost:5000/api/fees/payment \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-uuid",
    "amount": 5000,
    "paymentMethod": "cash",
    "reference": "CASH001",
    "description": "Term 1 Tuition"
  }'
```

### Filter Students by Grade

```bash
curl "http://localhost:5000/api/students?grade=Form%201&curriculum=8-4-4" \
  -H "Authorization: Bearer TOKEN"
```

---

## 🔌 API Endpoints Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Check server status |
| `/api/auth/login` | POST | User login |
| `/api/auth/profile` | GET | Get user info |
| `/api/students` | GET/POST | List/Create students |
| `/api/students/:id` | GET/PUT/DELETE | Student operations |
| `/api/fees/student/:id` | GET | Fee statement |
| `/api/fees/payment` | POST | Record payment |
| `/api/fees/mpesa/initiate` | POST | Start M-Pesa payment |
| `/api/grades/assessment/:id` | GET | Get grades |
| `/api/reports/card/:id` | GET | Report card |

---

## ⚙️ Environment Variables

All variables are in `.env` file:

| Variable | Purpose | Example |
|----------|---------|---------|
| `DB_HOST` | Database server | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | shule_sms |
| `DB_USER` | Database user | postgres |
| `JWT_SECRET` | Auth token secret | (generated) |
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |

For M-Pesa add:
| `MPESA_ENV` | sandbox or production | sandbox |
| `MPESA_CONSUMER_KEY` | From Daraja | ... |
| `MPESA_CONSUMER_SECRET` | From Daraja | ... |
| `MPESA_PASSKEY` | From Daraja | ... |
| `MPESA_SHORTCODE` | Business code | 174379 |

---

## 🐛 Troubleshooting

### "Port 5000 already in use"
```bash
# Change port in .env
PORT=5001
```

### "Cannot connect to database"
- Ensure PostgreSQL is running
- Check DB_HOST, DB_PORT, DB_USER in .env
- Verify password is correct

### "M-Pesa not configured"
- Add M-Pesa credentials to .env
- See MPESA_SETUP.md for details

### "Invalid token"
- Re-login to get new token
- Token expires after 24 hours

---

## 📞 Need Help?

1. **Check logs**: Look at console output for errors
2. **Read docs**: 
   - [README.md](README.md) - Full API documentation
   - [SETUP.md](SETUP.md) - Detailed setup guide
   - [TESTING.md](TESTING.md) - How to test features
   - [MPESA_SETUP.md](MPESA_SETUP.md) - Payment integration

3. **Debug mode**:
   ```bash
   DEBUG=* npm run dev
   ```

4. **Check database**:
   ```bash
   psql -d shule_sms -U postgres
   ```

---

## 🚀 Next Steps

After confirming everything works:

1. **Create your school account**
   - Update school name and details
   - Add your users

2. **Setup academic year**
   - Create terms
   - Add subjects
   - Assign teachers

3. **Add students**
   - Import students
   - Link guardians/parents

4. **Configure fees**
   - Setup fee structures
   - Set payment deadlines

5. **Build frontend**
   - Use API endpoints
   - Create admin dashboard
   - Build parent portal

6. **Deploy to production**
   - Get domain/server
   - Setup HTTPS
   - Configure M-Pesa production
   - Backup database

---

## 📊 Database

Your data is stored in PostgreSQL:
- Database: `shule_sms`
- User: `postgres`
- Host: `localhost:5432`

To backup:
```bash
pg_dump -U postgres shule_sms > backup.sql
```

To restore:
```bash
psql -U postgres shule_sms < backup.sql
```

---

## ✅ Verification Checklist

- [ ] PostgreSQL running
- [ ] `npm install` completed
- [ ] `.env` configured
- [ ] `npm run setup-db` successful
- [ ] `npm run dev` server started
- [ ] Health check works
- [ ] Can login with test credentials
- [ ] Can create a student
- [ ] Can view fee statement
- [ ] M-Pesa configured (if using payments)

---

## 🎓 Happy Teaching!

You now have a complete, production-ready school management system.

**Questions?** See the documentation files or check the code comments.

**Ready for more?** Start building your frontend using these API endpoints!

---

**VINEYARD-SMS v1.0**  
School Management System for Kenya