import axios from 'axios';
import { getToken } from './auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth
export const login = (payload) => api.post('/auth/login', payload);
export const signup = (payload) => api.post('/auth/signup', payload);
export const getProfile = () => api.get('/auth/profile');

// Students
export const getStudents = (params) => api.get('/students', { params });
export const getStudentById = (id) => api.get(`/students/${id}`);
export const createStudent = (payload) => api.post('/students', payload);
export const updateStudent = (id, payload) => api.put(`/students/${id}`, payload);
export const deleteStudent = (id) => api.delete(`/students/${id}`);

// Fees
export const getFeeStatement = (studentId) => api.get(`/fees/student/${studentId}`);
export const getFeePayments = (studentId, params) =>
  api.get(`/fees/payments/${studentId}`, { params });
export const recordFeePayment = (payload) => api.post('/fees/payment', payload);
export const initiateSTKPush = (studentId, amount, phoneNumber) =>
  api.post('/fees/mpesa/initiate', { studentId, amount, phoneNumber });

// Grades
export const getAssessments = (params) => api.get('/grades/assessments', { params });
export const createAssessment = (payload) => api.post('/grades/assessments', payload);
export const getAssessmentGrades = (assessmentId, curriculum) =>
  api.get(`/grades/assessment/${assessmentId}`, { params: { curriculum } });
export const submitGrades844 = (assessmentId, grades) =>
  api.post(`/grades/844/${assessmentId}`, { grades });
export const submitGradesCBC = (assessmentId, grades) =>
  api.post(`/grades/cbc/${assessmentId}`, { grades });

// Reports
export const getReportTerms = () => api.get('/reports/terms');
export const generateReportCard = (studentId, params) =>
  api.get(`/reports/card/${studentId}`, { params });
export const getClassReport = (grade, stream, termId) =>
  api.get('/reports/class', { params: { grade, stream, termId } });

// Academic Years
export const getAcademicYears = () => api.get('/academic/years');
export const createAcademicYear = (payload) => api.post('/academic/years', payload);
export const setCurrentAcademicYear = (id) => api.put(`/academic/years/${id}/set-current`);
export const deleteAcademicYear = (id) => api.delete(`/academic/years/${id}`);

// Terms
export const getTerms = (params) => api.get('/academic/terms', { params });
export const createTerm = (payload) => api.post('/academic/terms', payload);
export const updateTerm = (id, payload) => api.put(`/academic/terms/${id}`, payload);
export const setCurrentTerm = (id, payload) => api.put(`/academic/terms/${id}/set-current`, payload);
export const deleteTerm = (id) => api.delete(`/academic/terms/${id}`);

// Subjects
export const getSubjects = (params) => api.get('/subjects', { params });
export const createSubject = (payload) => api.post('/subjects', payload);
export const updateSubject = (id, payload) => api.put(`/subjects/${id}`, payload);
export const deleteSubject = (id) => api.delete(`/subjects/${id}`);

// CBC Curriculum
export const getStrands = (params) => api.get('/curriculum/strands', { params });
export const createStrand = (payload) => api.post('/curriculum/strands', payload);
export const updateStrand = (id, payload) => api.put(`/curriculum/strands/${id}`, payload);
export const deleteStrand = (id) => api.delete(`/curriculum/strands/${id}`);

export const getSubStrands = (params) => api.get('/curriculum/sub-strands', { params });
export const createSubStrand = (payload) => api.post('/curriculum/sub-strands', payload);
export const updateSubStrand = (id, payload) => api.put(`/curriculum/sub-strands/${id}`, payload);
export const deleteSubStrand = (id) => api.delete(`/curriculum/sub-strands/${id}`);

// Teacher Assignments
export const getTeacherAssignments = (params) => api.get('/curriculum/assignments', { params });
export const createTeacherAssignment = (payload) => api.post('/curriculum/assignments', payload);
export const updateTeacherAssignment = (id, payload) => api.put(`/curriculum/assignments/${id}`, payload);
export const deleteTeacherAssignment = (id) => api.delete(`/curriculum/assignments/${id}`);

// Attendance
export const getAttendanceByDate = (params) => api.get('/attendance/by-date', { params });
export const getStudentAttendance = (studentId, params) => api.get(`/attendance/student/${studentId}`, { params });
export const getAttendanceSummary = (params) => api.get('/attendance/summary', { params });
export const markAttendance = (payload) => api.post('/attendance/mark', payload);
export const bulkMarkAttendance = (payload) => api.post('/attendance/bulk-mark', payload);

