# Frontend Quick Start

The frontend is fully connected to the backend API. Here's how to get it running:

## Prerequisites
- Node.js (v16 or higher)
- npm

## Installation

```bash
cd frontend
npm install
```

## Running the Frontend

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## Test Credentials

Use these demo credentials to log in:
- **Email**: admin@vineyard.test
- **Password**: admin123456

## What's Connected

✅ **Login** - Authenticates with the backend  
✅ **Dashboard** - Pulls live user data and student statistics  
✅ **Students** - Fetches actual student records from the database  
✅ **Fees** - Shows real fee payment history  
✅ **Protected Routes** - Token-based authentication  
✅ **API Interceptor** - Automatically includes auth token in all requests  

## API Endpoints

The frontend communicates with these backend endpoints:

### Auth
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile

### Students
- `GET /api/students` - List all students
- `GET /api/students/:id` - Get student details
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Fees
- `GET /api/fees` - Get fee payments
- `POST /api/fees/payments` - Record fee payment
- `POST /api/fees/mpesa/stk-push` - Initiate M-Pesa payment

### Grades
- `GET /api/grades/assessments` - Get assessments
- `POST /api/grades` - Submit grades
- `GET /api/grades/student/:id` - Get student grades

### Reports
- `GET /api/reports/card/:studentId` - Get report card
- `GET /api/reports/class` - Get class report

## Environment Variables

Create a `.env` file in the frontend folder:

```
VITE_API_URL=http://localhost:5000/api
```

## Backend Status

Make sure the backend is running before starting the frontend:

```bash
cd backend
npm run dev
```

Both will run on different ports:
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## Building for Production

```bash
npm run build
npm run preview
```
