-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE user_role AS ENUM ('super_admin', 'principal', 'teacher', 'bursar', 'librarian', 'student', 'parent');
CREATE TYPE curriculum_type AS ENUM ('8-4-4', 'cbc');
CREATE TYPE cbc_competency_level AS ENUM ('EE', 'ME', 'AE', 'BE'); -- Exceeding, Meeting, Approaching, Below
CREATE TYPE gender AS ENUM ('male', 'female', 'other');
CREATE TYPE payment_method AS ENUM ('mpesa', 'bank', 'cash', 'cheque');

-- SCHOOLS TABLE (Multi-tenant support)
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    address TEXT,
    county VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USERS TABLE (All roles)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    id_number VARCHAR(50), -- National ID/Passport
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STUDENTS TABLE
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id), -- If student has portal access
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender gender,
    date_of_birth DATE,
    curriculum curriculum_type NOT NULL,
    current_grade VARCHAR(50), -- e.g., "Grade 4", "Form 3"
    stream VARCHAR(50), -- e.g., "East", "West", "Blue"
    boarding_status VARCHAR(20) DEFAULT 'day', -- day, boarding
    admission_date DATE,
    previous_school VARCHAR(255),
    medical_conditions TEXT,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, transferred, graduated, suspended
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PARENTS/GUARDIANS LINKAGE
CREATE TABLE student_guardians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- If registered user
    relationship VARCHAR(50) NOT NULL, -- mother, father, guardian, uncle, etc.
    is_primary BOOLEAN DEFAULT false,
    is_emergency_contact BOOLEAN DEFAULT false,
    occupation VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ACADEMIC YEARS & TERMS (Kenya: 3 terms per year)
CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g., "2026 Academic Year"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- Term 1, Term 2, Term 3
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    opening_date DATE, -- Reporting date
    closing_date DATE
);

-- SUBJECTS & LEARNING AREAS (CBC vs 8-4-4)
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL, -- e.g., "MAT", "ENG", "CRE"
    name VARCHAR(100) NOT NULL,
    curriculum curriculum_type NOT NULL,
    category VARCHAR(50), -- Mathematics, Language, Science, etc.
    is_core BOOLEAN DEFAULT true,
    max_score INTEGER DEFAULT 100, -- For 8-4-4
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, code, curriculum)
);

-- CBC-SPECIFIC: STRANDS & SUB-STRANDS
CREATE TABLE cbc_strands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "Numbers", "Measurement"
    code VARCHAR(20),
    grade_level VARCHAR(20) -- e.g., "Grade 4"
);

CREATE TABLE cbc_sub_strands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strand_id UUID REFERENCES cbc_strands(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    learning_outcomes TEXT,
    suggested_activities TEXT
);

-- TEACHER-SUBJECT ASSIGNMENTS
CREATE TABLE teacher_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    grade VARCHAR(50) NOT NULL, -- Grade/Form they teach
    stream VARCHAR(50),
    academic_year_id UUID REFERENCES academic_years(id),
    is_class_teacher BOOLEAN DEFAULT false
);

-- ASSESSMENTS & GRADES
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id),
    subject_id UUID REFERENCES subjects(id),
    teacher_id UUID REFERENCES users(id),
    term_id UUID REFERENCES terms(id),
    name VARCHAR(100) NOT NULL, -- e.g., "Opener Exam", "Mid-Term", "End Term"
    assessment_type VARCHAR(50), -- opener, midterm, endterm, continuous, project
    curriculum curriculum_type NOT NULL,
    max_score INTEGER DEFAULT 100,
    weight_percentage DECIMAL(5,2) DEFAULT 100.00, -- For weighted calculations
    assessment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8-4-4 GRADES (Percentage-based)
CREATE TABLE grades_844 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL, -- Raw score
    percentage DECIMAL(5,2), -- Calculated percentage
    grade VARCHAR(5), -- A, A-, B+, etc.
    points INTEGER, -- For KCSE calculation (12 points scale)
    remarks TEXT,
    entered_by UUID REFERENCES users(id),
    entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(id),
    modified_at TIMESTAMP,
    UNIQUE(assessment_id, student_id)
);

-- CBC GRADES (Competency-based)
CREATE TABLE grades_cbc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    sub_strand_id UUID REFERENCES cbc_sub_strands(id),
    competency_level cbc_competency_level NOT NULL,
    teacher_observations TEXT,
    learner_activities TEXT, -- Evidence of learning
    portfolio_items JSONB, -- Links to photos/videos
    entered_by UUID REFERENCES users(id),
    entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, student_id, sub_strand_id)
);

-- FEE STRUCTURE
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    grade VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL, -- tuition, boarding, activity, etc.
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    due_date DATE,
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FEE PAYMENTS
CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    transaction_code VARCHAR(100), -- M-Pesa code, cheque number, etc.
    mpesa_receipt VARCHAR(100),
    paid_by VARCHAR(100), -- Name of payer
    phone_number VARCHAR(20),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    academic_year_id UUID REFERENCES academic_years(id),
    term_id UUID REFERENCES terms(id),
    allocated_by VARCHAR(20) DEFAULT 'auto', -- auto, manual, priority
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FEE BALANCES (Auto-calculated view or table)
CREATE TABLE fee_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    term_id UUID REFERENCES terms(id),
    total_charges DECIMAL(10,2) DEFAULT 0,
    total_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ATTENDANCE
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- present, absent, late, excused
    check_in TIME,
    check_out TIME,
    marked_by UUID REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date)
);

-- SMS LOGS
CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id),
    recipient_phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(50), -- fee_reminder, result, emergency, general
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, delivered
    provider VARCHAR(50), -- africastalking, twilio, etc.
    external_id VARCHAR(100), -- Provider's message ID
    cost DECIMAL(8,2),
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT LOG (For grade changes, etc.)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_admission ON students(admission_number);
CREATE INDEX idx_grades_student ON grades_844(student_id);
CREATE INDEX idx_grades_assessment ON grades_844(assessment_id);
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_attendance_date ON attendance(date, student_id);
CREATE INDEX idx_users_school ON users(school_id);