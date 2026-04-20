# VINEYARD-SMS - Testing Guide

Complete testing guide to verify all features are working correctly.

## 🚀 Quick Start

### 1. Start the Server

**Windows:**
```bash
Double-click start.bat
```

**Mac/Linux:**
```bash
bash start.sh
```

Or manually:
```bash
npm run dev
```

Expected output:
```
🚀 Server running on port 5000
📚 Environment: development
✅ Database connected: [timestamp]
```

---

## ✅ Tests to Run

### Test 1: Health Check (No Authentication)

```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-04-20T10:30:00.000Z",
  "database": "connected",
  "uptime": 123.456
}
```

✅ **PASS**: If status is "OK" and database is "connected"

---

### Test 2: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vineyard.test",
    "password": "admin123456"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@vineyard.test",
    "role": "super_admin",
    "firstName": "Admin",
    "lastName": "User",
    "schoolId": "660e8400-e29b-41d4-a716-446655440000",
    "schoolName": "Vineyard Test School"
  }
}
```

✅ **PASS**: If you get a valid token

**Save the token** for next tests:
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Test 3: Get Profile

```bash
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "admin@vineyard.test",
  "role": "super_admin",
  "first_name": "Admin",
  "last_name": "User",
  "created_at": "2026-04-20T10:30:00.000Z",
  "school_name": "Vineyard Test School"
}
```

✅ **PASS**: If you get your user profile

---

### Test 4: Create Student

```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Mary",
    "lastName": "Johnson",
    "admissionNumber": "VIN/2026/0002",
    "gender": "female",
    "dateOfBirth": "2010-08-20",
    "curriculum": "8-4-4",
    "currentGrade": "Form 1",
    "stream": "A",
    "boardingStatus": "day"
  }'
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "school_id": "660e8400-e29b-41d4-a716-446655440000",
  "admission_number": "VIN/2026/0002",
  "first_name": "Mary",
  "last_name": "Johnson",
  "gender": "female",
  "date_of_birth": "2010-08-20",
  "curriculum": "8-4-4",
  "current_grade": "Form 1",
  "stream": "A",
  "boarding_status": "day",
  "status": "active"
}
```

✅ **PASS**: If student is created successfully

**Save the student ID**:
```bash
export STUDENT_ID="550e8400-e29b-41d4-a716-446655440001"
```

---

### Test 5: Get All Students

```bash
curl http://localhost:5000/api/students \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "first_name": "Mary",
    "last_name": "Johnson",
    ...
  }
]
```

✅ **PASS**: If you see the created student in the list

---

### Test 6: Get Student by ID

```bash
curl http://localhost:5000/api/students/$STUDENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "first_name": "Mary",
  "last_name": "Johnson",
  "guardians": [null]
}
```

✅ **PASS**: If you can retrieve the specific student

---

### Test 7: Update Student

```bash
curl -X PUT http://localhost:5000/api/students/$STUDENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_grade": "Form 2"
  }'
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "first_name": "Mary",
  "current_grade": "Form 2",
  ...
}
```

✅ **PASS**: If current_grade is updated to "Form 2"

---

### Test 8: Get Fee Statement

```bash
curl http://localhost:5000/api/fees/student/$STUDENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "studentId": "550e8400-e29b-41d4-a716-446655440001",
  "feeStructure": [],
  "payments": [],
  "summary": {
    "totalCharged": 0,
    "totalPaid": 0,
    "balance": 0,
    "status": "paid"
  }
}
```

✅ **PASS**: If you get the fee statement structure

---

### Test 9: Record Payment

```bash
curl -X POST http://localhost:5000/api/fees/payment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT_ID'",
    "amount": 5000,
    "paymentMethod": "cash",
    "reference": "CASH001",
    "description": "Term 1 Tuition"
  }'
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "student_id": "550e8400-e29b-41d4-a716-446655440001",
  "amount": "5000.00",
  "payment_method": "cash",
  "status": "completed"
}
```

✅ **PASS**: If payment is recorded successfully

---

### Test 10: Authorization Check

Try accessing student endpoint with invalid role:

```bash
# This should fail (not authenticated)
curl http://localhost:5000/api/students
```

**Expected Response:**
```json
{
  "message": "Access denied. No token provided."
}
```

✅ **PASS**: If access is denied without token

---

## 📊 Test Summary Checklist

- [ ] **Health Check** - API responds to health endpoint
- [ ] **Authentication** - Login works with correct credentials
- [ ] **Profile** - Can retrieve user profile with token
- [ ] **Student CRUD** - Create, read, update student
- [ ] **Student Filtering** - Can list and filter students
- [ ] **Fee Management** - Can view and record payments
- [ ] **Authorization** - Protected routes require authentication
- [ ] **Database** - All data persists correctly
- [ ] **Error Handling** - Invalid requests return proper errors

---

## 🐛 Common Issues

### Issue: "Cannot POST /api/students"

**Cause**: Routes not properly registered

**Fix**: 
- Check `server.js` for route imports
- Verify `student.routes.js` exists and is correct
- Check console for syntax errors

---

### Issue: "Access denied. No token provided"

**Cause**: Missing Authorization header

**Fix**: Add header to request:
```bash
-H "Authorization: Bearer YOUR_TOKEN"
```

---

### Issue: "Invalid token"

**Cause**: Token expired or malformed

**Fix**: Get a new token by logging in again

---

### Issue: "Student not found" on create

**Cause**: Validation errors

**Fix**: Check request body matches schema:
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "admissionNumber": "string (required)",
  "gender": "male|female|other (required)",
  "dateOfBirth": "ISO date (required)",
  "curriculum": "8-4-4|cbc (required)",
  "currentGrade": "string (required)",
  "stream": "string (optional)",
  "boardingStatus": "day|boarding (optional)"
}
```

---

## 📈 Performance Testing

### Test API Response Time

```bash
time curl http://localhost:5000/api/health
```

Expected: < 50ms for health check

---

## 🔒 Security Testing

### Test 1: SQL Injection Prevention

```bash
curl 'http://localhost:5000/api/students?grade=Form%201%27%20OR%20%271%27=%271' \
  -H "Authorization: Bearer $TOKEN"
```

✅ **PASS**: If no unauthorized data is returned

### Test 2: Invalid Token

```bash
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer invalid_token"
```

✅ **PASS**: If you get "Invalid token" error

---

## 📝 Notes

- All timestamps are in UTC/ISO format
- All IDs are UUIDs
- All monetary amounts are in Kenyan Shillings (KES)
- All responses use proper HTTP status codes

---

## ✅ Ready to Deploy?

Once all tests pass:

1. ✅ Update `.env` for production
2. ✅ Set `NODE_ENV=production`
3. ✅ Use `npm start` instead of `npm run dev`
4. ✅ Setup HTTPS
5. ✅ Configure domain/IP
6. ✅ Setup database backups

---

**All tests passing? 🎉 Backend is ready for development!**