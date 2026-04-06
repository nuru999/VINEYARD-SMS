const db = require('../config/database');

exports.findBySchool = async (schoolId, filters = {}) => {
  let query = `SELECT * FROM students WHERE school_id = $1`;
  const params = [schoolId];
  
  if (filters.grade) {
    query += ` AND current_grade = $${params.length + 1}`;
    params.push(filters.grade);
  }
  
  if (filters.curriculum) {
    query += ` AND curriculum = $${params.length + 1}`;
    params.push(filters.curriculum);
  }
  
  query += ` ORDER BY last_name, first_name`;
  
  const result = await db.query(query, params);
  return result.rows;
};

exports.findById = async (id) => {
  const result = await db.query(
    `SELECT s.*, 
            json_agg(json_build_object(
              'id', sg.id,
              'userId', sg.user_id,
              'relationship', sg.relationship,
              'isPrimary', sg.is_primary
            )) as guardians
     FROM students s
     LEFT JOIN student_guardians sg ON s.id = sg.student_id
     WHERE s.id = $1
     GROUP BY s.id`,
    [id]
  );
  return result.rows[0];
};

exports.create = async (studentData) => {
  const {
    schoolId, admissionNumber, firstName, lastName, gender,
    dateOfBirth, curriculum, currentGrade, stream, boardingStatus
  } = studentData;
  
  const result = await db.query(
    `INSERT INTO students 
     (school_id, admission_number, first_name, last_name, gender, date_of_birth, 
      curriculum, current_grade, stream, boarding_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [schoolId, admissionNumber, firstName, lastName, gender, dateOfBirth,
     curriculum, currentGrade, stream, boardingStatus]
  );
  return result.rows[0];
};