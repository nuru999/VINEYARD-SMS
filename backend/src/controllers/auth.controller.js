const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const result = await db.query(
      `SELECT u.*, s.name as school_name, s.logo_url as school_logo 
       FROM users u 
       LEFT JOIN schools s ON u.school_id = s.id 
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if active
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is disabled' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        schoolId: user.school_id 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    delete user.password_hash;

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        schoolId: user.school_id,
        schoolName: user.school_name,
        schoolLogo: user.school_logo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, 
              u.avatar_url, u.created_at, s.name as school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// For initial setup - Create first admin
exports.setupAdmin = async (req, res) => {
  try {
    const { schoolName, adminEmail, adminPassword, firstName, lastName } = req.body;
    
    // Check if any users exist
    const existingUsers = await db.query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Setup already completed' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create school
    const schoolResult = await db.query(
      'INSERT INTO schools (name) VALUES ($1) RETURNING id',
      [schoolName]
    );
    const schoolId = schoolResult.rows[0].id;

    // Create admin user
    const userResult = await db.query(
      `INSERT INTO users (school_id, email, password_hash, role, first_name, last_name)
       VALUES ($1, $2, $3, 'super_admin', $4, $5) RETURNING id`,
      [schoolId, adminEmail.toLowerCase(), hashedPassword, firstName, lastName]
    );

    res.status(201).json({
      message: 'Setup completed successfully',
      schoolId,
      adminId: userResult.rows[0].id
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};