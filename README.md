# VINEYARD SMS Backend

A comprehensive School Management System API built for Kenyan schools, supporting both 8-4-4 and CBC curricula.

## Features

- **Single School Deployment**: One school instance with role-based access
- **User Management**: Role-based access (Super Admin, Principal, Teacher, Bursar, etc.)
- **Student Management**: Complete student lifecycle management
- **Academic Management**: Support for both 8-4-4 and CBC curricula
- **Grade Management**: Assessment and grading system
- **Fee Management**: Payment tracking with M-Pesa integration
- **Reporting**: Report cards and class reports
- **SMS Integration**: Automated notifications

## Tech Stack

- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** authentication
- **M-Pesa API** integration
- **Joi** validation

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vineyard-sms/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   - Database credentials
   - JWT secret
   - M-Pesa API keys (for payments)

4. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```
   Then copy the example:
   ```bash
   cp .env.example .env
   ```
   Edit `frontend/.env` if you want to override the backend API URL.

5. **Database Setup**
   ```bash
   # Option 1: Automatic setup (requires PostgreSQL running)
   npm run setup-db

   # Option 2: Manual setup
   # 1. Create database: shule_sms
   # 2. Run the SQL file: psql -d shule_sms -f migrations/database.sql
   ```

   **Manual Database Setup:**
   - Open your PostgreSQL client
   - Create a database named `shule_sms`
   - Execute the SQL in `migrations/database.sql`

5. **Initial Setup**
   Send a POST request to `/api/auth/setup` with:
   ```json
   {
     "schoolName": "Your School Name",
     "adminEmail": "admin@school.com",
     "adminPassword": "securepassword",
     "firstName": "Admin",
     "lastName": "User"
   }
   ```

6. **Start the server**
   ```bash
   npm run dev  # Development mode
   npm start    # Production mode
   ```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/setup` - Initial admin setup
- `GET /api/auth/profile` - Get user profile

### Students
- `GET /api/students` - List students (with filters)
- `GET /api/students/:id` - Get student details
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Grades
- `GET /api/grades/assessment/:assessmentId` - Get assessment grades
- `POST /api/grades/844/:assessmentId` - Enter 8-4-4 grades
- `POST /api/grades/cbc/:assessmentId` - Enter CBC grades

### Fees
- `GET /api/fees/student/:studentId` - Get fee statement
- `GET /api/fees/payments/:studentId` - Get payment history
- `POST /api/fees/payment` - Record manual payment
- `POST /api/fees/mpesa/initiate` - Initiate M-Pesa payment

### Reports
- `GET /api/reports/card/:studentId` - Get report card
- `GET /api/reports/class` - Get class report

### Webhooks
- `POST /api/webhooks/mpesa` - M-Pesa payment callback

## Database Schema

The system uses PostgreSQL with the following main tables:
- `schools` - Single school profile and configuration
- `users` - System users with roles
- `students` - Student information
- `subjects` - Academic subjects
- `assessments` - Tests and exams
- `grades_844` / `grades_cbc` - Grade storage
- `fee_structures` / `fee_payments` - Fee management

## Security

- JWT-based authentication
- Role-based access control
- Input validation with Joi
- Rate limiting
- CORS protection
- Helmet security headers

## M-Pesa Integration

The system integrates with M-Pesa for fee payments:
- STK Push for initiating payments
- Callback handling for payment confirmation
- Transaction tracking and receipts

## Development

### Project Structure
```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Authentication, validation, etc.
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # External services (M-Pesa, SMS)
│   ├── utils/           # Helper functions
│   └── validators/      # Input validation schemas
├── migrations/          # Database schema
├── server.js            # Main application file
├── setup-db.js          # Database setup script
└── package.json
```

### Adding New Features

1. Create controller in `src/controllers/`
2. Add routes in `src/routes/`
3. Add validation schema in `src/validators/`
4. Update database schema if needed
5. Add authentication/authorization as required

## License

This project is licensed under the MIT License.