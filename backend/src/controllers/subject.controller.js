const db = require('../config/database');

exports.getSubjects = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { curriculum } = req.query;

    let query = `
      SELECT id, code, name, curriculum, category, is_core, max_score, created_at
      FROM subjects
      WHERE school_id = $1
    `;
    const params = [schoolId];

    if (curriculum) {
      query += ` AND curriculum = $2`;
      params.push(curriculum);
    }

    query += ` ORDER BY curriculum, code`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { code, name, curriculum, category, isCore, maxScore } = req.body;
    const schoolId = req.user.school_id;

    if (!code || !name || !curriculum) {
      return res.status(400).json({ message: 'Code, name, and curriculum are required' });
    }

    const normalizedCurriculum = curriculum === '8-4-4' ? '8-4-4' : 'cbc';

    const result = await db.query(
      `INSERT INTO subjects (school_id, code, name, curriculum, category, is_core, max_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [schoolId, code.toUpperCase(), name, normalizedCurriculum, category || null, isCore !== false, maxScore || 100]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Subject code already exists for this curriculum' });
    }
    res.status(500).json({ message: 'Error creating subject', error: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, isCore, maxScore } = req.body;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `UPDATE subjects 
       SET name = $1, category = $2, is_core = $3, max_score = $4
       WHERE id = $5 AND school_id = $6
       RETURNING *`,
      [name, category, isCore, maxScore, id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating subject', error: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;

    const result = await db.query(
      `DELETE FROM subjects WHERE id = $1 AND school_id = $2 RETURNING *`,
      [id, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subject', error: error.message });
  }
};
