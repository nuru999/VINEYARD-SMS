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

export default api;
