const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg'); // or your existing db connection

// OTP store (use Redis in production; for now, in-memory with expiry)
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP (replace with your email service or SMS)
const sendOTP = async (email, otp) => {
  console.log(`🔐 OTP for ${email}: ${otp}`); // For testing. In production, use Nodemailer or SMS API
  // Example with Nodemailer:
  // await transporter.sendMail({ to: email, subject: 'VINEYARD-SMS Verification', text: `Your code: ${otp}` });
};

// STEP 1: Initiate signup
router.post('/auth/register-init', async (req, res) => {
  try {
    const { email, phone, firstName, lastName, password, role, schoolId } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if email exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Password strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password must be 8+ chars with uppercase, lowercase, number and special character' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Hash password temporarily with OTP record
    const hashedPassword = await bcrypt.hash(password, 12);

    // Store in memory (or temp DB table)
    otpStore.set(email, {
      otp,
      expiresAt,
      payload: { email, phone, firstName, lastName, password: hashedPassword, role, schoolId }
    });

    // Send OTP
    await sendOTP(email, otp);

    res.json({ message: 'OTP sent to your email', email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to initiate registration' });
  }
});

// STEP 2: Verify OTP & create account
router.post('/auth/register-verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = otpStore.get(email);
    if (!record) {
      return res.status(400).json({ message: 'No pending registration found' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP expired. Please start again.' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const { payload } = record;

    // Insert user into DB
    const result = await pool.query(
      `INSERT INTO users (email, phone, first_name, last_name, password_hash, role, school_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
       RETURNING id, email, first_name, last_name, role, school_id`,
      [payload.email, payload.phone, payload.firstName, payload.lastName, payload.password, payload.role || 'teacher', payload.schoolId]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, schoolId: user.school_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h', issuer: 'vineyard-sms' }
    );

    // Clear OTP
    otpStore.delete(email);

    res.json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        schoolId: user.school_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to verify registration' });
  }
});

// Resend OTP
router.post('/auth/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const record = otpStore.get(email);
    
    if (!record) {
      return res.status(400).json({ message: 'No pending registration' });
    }

    const otp = generateOTP();
    record.otp = otp;
    record.expiresAt = Date.now() + 10 * 60 * 1000;
    
    await sendOTP(email, otp);
    res.json({ message: 'New OTP sent' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
});