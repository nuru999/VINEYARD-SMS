const db = require('../config/database');

// Middleware for logging actions
exports.logAction = async (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    if (req.method !== 'GET') {
      logActionToDatabase({
        schoolId: req.user?.school_id,
        userId: req.user?.id,
        action: `${req.method} ${req.path}`,
        resourceType: getResourceType(req.path),
        resourceId: getResourceId(req),
        details: req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: res.statusCode
      }).catch(err => console.error('Error logging action:', err));
    }

    return originalJson.call(this, data);
  };

  next();
};

// Helper functions
function getResourceType(path) {
  if (path.includes('students')) return 'student';
  if (path.includes('grades')) return 'grade';
  if (path.includes('fees')) return 'fee';
  if (path.includes('reports')) return 'report';
  if (path.includes('academic')) return 'academic';
  if (path.includes('subjects')) return 'subject';
  if (path.includes('attendance')) return 'attendance';
  if (path.includes('curriculum')) return 'curriculum';
  if (path.includes('auth')) return 'auth';
  return 'other';
}

function getResourceId(req) {
  const parts = req.path.split('/');
  const lastPart = parts[parts.length - 1];

  // Check if last part looks like an ID (UUID or number)
  if (lastPart && lastPart !== 'set-current' && !isNaN(lastPart.length) && lastPart.length > 3) {
    return lastPart;
  }

  // Try to get ID from body
  return req.body?.id || req.body?.studentId || req.body?.userId || null;
}

async function logActionToDatabase(logData) {
  try {
    await db.query(
      `INSERT INTO audit_logs (school_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        logData.schoolId,
        logData.userId,
        logData.action,
        logData.resourceType,
        logData.resourceId,
        JSON.stringify(logData.details),
        logData.ipAddress,
        logData.userAgent,
        logData.status
      ]
    );
  } catch (error) {
    console.error('Failed to log action to database:', error.message);
  }
}

// Get audit logs
exports.getAuditLogs = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { userId, resourceType, action, startDate, endDate, limit = 500 } = req.query;

    let query = `
      SELECT al.*, u.first_name, u.last_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.school_id = $1
    `;
    const params = [schoolId];

    if (userId) {
      query += ` AND al.user_id = $${params.length + 1}`;
      params.push(userId);
    }

    if (resourceType) {
      query += ` AND al.resource_type = $${params.length + 1}`;
      params.push(resourceType);
    }

    if (action) {
      query += ` AND al.action ILIKE $${params.length + 1}`;
      params.push(`%${action}%`);
    }

    if (startDate) {
      query += ` AND al.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND al.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit) || 500);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAuditSummary = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        DATE(created_at) as date,
        resource_type,
        COUNT(*) as action_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM audit_logs
      WHERE school_id = $1
    `;
    const params = [schoolId];

    if (startDate) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` GROUP BY DATE(created_at), resource_type ORDER BY DATE(created_at) DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUserActivity = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { userId } = req.params;
    const { startDate, endDate, limit = 200 } = req.query;

    let query = `
      SELECT *
      FROM audit_logs
      WHERE school_id = $1 AND user_id = $2
    `;
    const params = [schoolId, userId];

    if (startDate) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit) || 200);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getResourceHistory = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { resourceType, resourceId } = req.query;

    if (!resourceType || !resourceId) {
      return res.status(400).json({ message: 'Resource type and ID are required' });
    }

    const result = await db.query(
      `SELECT al.*, u.first_name, u.last_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.school_id = $1 AND al.resource_type = $2 AND al.resource_id = $3
       ORDER BY al.created_at DESC`,
      [schoolId, resourceType, resourceId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteOldLogs = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const parsedDays = Number(req.body?.daysOld ?? 90);
    const daysOld = Number.isInteger(parsedDays) ? parsedDays : 90;
    if (daysOld < 1 || daysOld > 3650) {
      return res.status(400).json({ message: 'daysOld must be an integer between 1 and 3650' });
    }

    const result = await db.query(
      `DELETE FROM audit_logs
       WHERE school_id = $1
       AND created_at < NOW() - ($2::int * INTERVAL '1 day')
       RETURNING id`,
      [schoolId, daysOld]
    );

    res.json({
      message: `Deleted ${result.rows.length} audit logs older than ${daysOld} days`
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting logs', error: error.message });
  }
};
