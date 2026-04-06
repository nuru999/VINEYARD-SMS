const db = require('../config/database');

exports.findByEmail = async (email) => {
  const result = await db.query(
    `SELECT u.*, s.name as school_name, s.logo_url as school_logo 
     FROM users u 
     LEFT JOIN schools s ON u.school_id = s.id 
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );
  return result.rows[0];
};

exports.findById = async (id) => {
  const result = await db.query(
    `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, 
            u.avatar_url, u.created_at, s.name as school_name
     FROM users u
     LEFT JOIN schools s ON u.school_id = s.id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0];
};

exports.create = async (userData) => {
  const { schoolId, email, passwordHash, role, firstName, lastName } = userData;
  const result = await db.query(
    `INSERT INTO users (school_id, email, password_hash, role, first_name, last_name)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [schoolId, email.toLowerCase(), passwordHash, role, firstName, lastName]
  );
  return result.rows[0];
};

exports.updateLastLogin = async (userId) => {
  await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
};