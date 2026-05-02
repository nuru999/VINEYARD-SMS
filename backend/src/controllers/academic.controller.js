const db = require('../config/database');

// ========== ACADEMIC YEARS ==========

exports.getAcademicYears = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const result = await db.query(
      `SELECT id, name, start_date, end_date, is_current, created_at
       FROM academic_years
       WHERE school_id = $1
       ORDER BY start_date DESC`,
      [schoolId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createAcademicYear = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    const schoolId = req.user.school_id;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: 'Name, start date, and end date are required' });
    }

    const result = await db.query(
      `INSERT INTO academic_years (school_id, name, start_date, end_date, is_current)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [schoolId, name, startDate, endDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error creating academic year', error: error.message });
  }
};

exports.setCurrentAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;

    // Reset all current years
    await db.query(
      `UPDATE academic_years SET is_current = false WHERE school_id = $1`,
      [schoolId]
    );

    // Set the selected year as current
    const result = await db.query(
      `UPDATE academic_years SET is_current = true 
       WHERE id = $1 AND school_id = $2
       RETURNING *`,
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Academic year not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating academic year', error: error.message });
  }
};

exports.deleteAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `DELETE FROM academic_years WHERE id = $1 AND school_id = $2 RETURNING *`,
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Academic year not found' });
    }

    res.json({ message: 'Academic year deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting academic year', error: error.message });
  }
};

// ========== TERMS ==========

exports.getTerms = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { academicYearId } = req.query;

    let query = `
      SELECT t.*, ay.name as academic_year_name
      FROM terms t
      JOIN academic_years ay ON t.academic_year_id = ay.id
      WHERE ay.school_id = $1
    `;
    const params = [schoolId];

    if (academicYearId) {
      query += ` AND t.academic_year_id = $2`;
      params.push(academicYearId);
    }

    query += ` ORDER BY t.start_date DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createTerm = async (req, res) => {
  try {
    const { name, academicYearId, startDate, endDate, openingDate, closingDate } = req.body;
    const schoolId = req.user.school_id;

    if (!name || !academicYearId || !startDate || !endDate) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const yearResult = await db.query(
      `SELECT id FROM academic_years WHERE id = $1 AND school_id = $2`,
      [academicYearId, schoolId]
    );
    if (yearResult.rows.length === 0) {
      return res.status(404).json({ message: 'Academic year not found' });
    }

    const result = await db.query(
      `INSERT INTO terms (academic_year_id, name, start_date, end_date, opening_date, closing_date, is_current)
       VALUES ($1, $2, $3, $4, $5, $6, false)
       RETURNING *`,
      [academicYearId, name, startDate, endDate, openingDate, closingDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error creating term', error: error.message });
  }
};

exports.updateTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, openingDate, closingDate } = req.body;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `UPDATE terms t
       SET name = $1, start_date = $2, end_date = $3, opening_date = $4, closing_date = $5
       FROM academic_years ay
       WHERE t.id = $6
       AND t.academic_year_id = ay.id
       AND ay.school_id = $7
       RETURNING *`,
      [name, startDate, endDate, openingDate, closingDate, id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Term not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating term', error: error.message });
  }
};

exports.setCurrentTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;
    let { academicYearId } = req.body;

    if (!academicYearId) {
      const termLookup = await db.query(
        `SELECT t.academic_year_id
         FROM terms t
         JOIN academic_years ay ON t.academic_year_id = ay.id
         WHERE t.id = $1 AND ay.school_id = $2`,
        [id, schoolId]
      );
      if (termLookup.rows.length === 0) {
        return res.status(404).json({ message: 'Term not found' });
      }
      academicYearId = termLookup.rows[0].academic_year_id;
    } else {
      const yearCheck = await db.query(
        `SELECT id FROM academic_years WHERE id = $1 AND school_id = $2`,
        [academicYearId, schoolId]
      );
      if (yearCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Academic year not found' });
      }
    }

    // Reset all current terms for the academic year
    await db.query(
      `UPDATE terms SET is_current = false WHERE academic_year_id = $1`,
      [academicYearId]
    );

    // Set the selected term as current
    const result = await db.query(
      `UPDATE terms t
       SET is_current = true
       FROM academic_years ay
       WHERE t.id = $1
       AND t.academic_year_id = ay.id
       AND ay.school_id = $2
       RETURNING t.*`,
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Term not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating term', error: error.message });
  }
};

exports.deleteTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `DELETE FROM terms t
       USING academic_years ay
       WHERE t.id = $1
       AND t.academic_year_id = ay.id
       AND ay.school_id = $2
       RETURNING t.*`,
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Term not found' });
    }

    res.json({ message: 'Term deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting term', error: error.message });
  }
};
