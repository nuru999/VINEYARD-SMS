import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getStudents,
  getAttendanceByDate,
  markAttendance,
  bulkMarkAttendance,
  getAttendanceSummary
} from '../services/api';

export default function Attendance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('mark');
  const [loading, setLoading] = useState(false);

  // Mark Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [gradeFilter, setGradeFilter] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});

  // Attendance Summary State
  const [summaryTab, setSummaryTab] = useState('bySummary');
  const [summaryStartDate, setSummaryStartDate] = useState('');
  const [summaryEndDate, setSummaryEndDate] = useState('');
  const [attendanceSummary, setAttendanceSummary] = useState([]);

  // Load students on mount or filter change
  useEffect(() => {
    if (activeTab === 'mark') {
      loadStudents();
    }
  }, [activeTab, attendanceDate, gradeFilter, streamFilter]);

  // Load summary on date change
  useEffect(() => {
    if (activeTab === 'summary' && summaryStartDate && summaryEndDate) {
      loadSummary();
    }
  }, [summaryStartDate, summaryEndDate]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await getStudents({ grade: gradeFilter, stream: streamFilter, status: 'active' });
      setStudents(res.data);
      
      // Load today's attendance
      const attendanceRes = await getAttendanceByDate({
        date: attendanceDate,
        grade: gradeFilter,
        stream: streamFilter
      });

      const attendanceMap = {};
      attendanceRes.data.forEach((record) => {
        attendanceMap[record.student_id] = {
          status: record.status,
          checkIn: record.check_in,
          checkOut: record.check_out,
          remarks: record.remarks
        };
      });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Error loading students:', error);
      alert('Error loading students: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await getAttendanceSummary({
        startDate: summaryStartDate,
        endDate: summaryEndDate,
        grade: gradeFilter,
        stream: streamFilter
      });
      setAttendanceSummary(res.data);
    } catch (error) {
      alert('Error loading summary: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance({
      ...attendance,
      [studentId]: {
        ...attendance[studentId],
        status
      }
    });
  };

  const handleCheckInChange = (studentId, checkIn) => {
    setAttendance({
      ...attendance,
      [studentId]: {
        ...attendance[studentId],
        checkIn
      }
    });
  };

  const handleCheckOutChange = (studentId, checkOut) => {
    setAttendance({
      ...attendance,
      [studentId]: {
        ...attendance[studentId],
        checkOut
      }
    });
  };

  const handleRemarksChange = (studentId, remarks) => {
    setAttendance({
      ...attendance,
      [studentId]: {
        ...attendance[studentId],
        remarks
      }
    });
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const records = students
        .filter((s) => attendance[s.id])
        .map((s) => ({
          studentId: s.id,
          ...attendance[s.id]
        }));

      if (records.length === 0) {
        alert('No attendance records to save');
        return;
      }

      await bulkMarkAttendance({
        date: attendanceDate,
        records
      });
      alert('Attendance saved successfully');
      loadStudents();
    } catch (error) {
      alert('Error saving attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMark = async (studentId, status) => {
    try {
      await markAttendance({
        studentId,
        date: attendanceDate,
        status
      });
      const newAttendance = { ...attendance };
      newAttendance[studentId] = { status };
      setAttendance(newAttendance);
    } catch (error) {
      alert('Error marking attendance: ' + error.message);
    }
  };

  const handleMarkAll = (status) => {
    const newAttendance = { ...attendance };
    students.forEach((s) => {
      newAttendance[s.id] = { status };
    });
    setAttendance(newAttendance);
  };

  // Check authorization
  if (!['super_admin', 'principal', 'teacher'].includes(user?.role)) {
    return (
      <div className="p-6 text-center text-red-600">
        You don't have permission to access this page.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Attendance Management</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('mark')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'mark'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Mark Attendance
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'summary'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Attendance Summary
        </button>
      </div>

      {/* Mark Attendance Tab */}
      {activeTab === 'mark' && (
        <div>
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Grade</label>
              <input
                type="text"
                placeholder="e.g., Form 1"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Stream</label>
              <input
                type="text"
                placeholder="e.g., A"
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => handleMarkAll('present')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Mark All Present
            </button>
            <button
              onClick={() => handleMarkAll('absent')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Mark All Absent
            </button>
            <button
              onClick={() => handleMarkAll('late')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            >
              Mark All Late
            </button>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <p className="p-6">Loading...</p>
            ) : students.length === 0 ? (
              <p className="p-6 text-gray-500">No students found</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Admission #</th>
                        <th className="px-4 py-3 text-left">Grade/Stream</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Check In</th>
                        <th className="px-4 py-3 text-left">Check Out</th>
                        <th className="px-4 py-3 text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {student.first_name} {student.last_name}
                          </td>
                          <td className="px-4 py-3">{student.admission_number}</td>
                          <td className="px-4 py-3">
                            {student.current_grade}
                            {student.stream && ` - ${student.stream}`}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={attendance[student.id]?.status || ''}
                              onChange={(e) =>
                                handleStatusChange(student.id, e.target.value)
                              }
                              className="px-3 py-1 border rounded text-sm"
                            >
                              <option value="">Select Status</option>
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="late">Late</option>
                              <option value="excused">Excused</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              value={attendance[student.id]?.checkIn || ''}
                              onChange={(e) =>
                                handleCheckInChange(student.id, e.target.value)
                              }
                              className="px-3 py-1 border rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              value={attendance[student.id]?.checkOut || ''}
                              onChange={(e) =>
                                handleCheckOutChange(student.id, e.target.value)
                              }
                              className="px-3 py-1 border rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Notes"
                              value={attendance[student.id]?.remarks || ''}
                              onChange={(e) =>
                                handleRemarksChange(student.id, e.target.value)
                              }
                              className="px-3 py-1 border rounded text-sm w-32"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 border-t">
                  <button
                    onClick={handleSaveAll}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Attendance Summary Tab */}
      {activeTab === 'summary' && (
        <div>
          {/* Summary Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={summaryStartDate}
                onChange={(e) => setSummaryStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={summaryEndDate}
                onChange={(e) => setSummaryEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Grade</label>
              <input
                type="text"
                placeholder="e.g., Form 1"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Stream</label>
              <input
                type="text"
                placeholder="e.g., A"
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Summary Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <p className="p-6">Loading...</p>
            ) : attendanceSummary.length === 0 ? (
              <p className="p-6 text-gray-500">No data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Admission #</th>
                      <th className="px-4 py-3 text-center">Total Days</th>
                      <th className="px-4 py-3 text-center">Present</th>
                      <th className="px-4 py-3 text-center">Absent</th>
                      <th className="px-4 py-3 text-center">Late</th>
                      <th className="px-4 py-3 text-center">Excused</th>
                      <th className="px-4 py-3 text-center">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceSummary.map((record) => (
                      <tr key={record.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {record.first_name} {record.last_name}
                        </td>
                        <td className="px-4 py-3">{record.admission_number}</td>
                        <td className="px-4 py-3 text-center">{record.total_days || 0}</td>
                        <td className="px-4 py-3 text-center text-green-600 font-medium">
                          {record.present_days || 0}
                        </td>
                        <td className="px-4 py-3 text-center text-red-600 font-medium">
                          {record.absent_days || 0}
                        </td>
                        <td className="px-4 py-3 text-center text-yellow-600 font-medium">
                          {record.late_days || 0}
                        </td>
                        <td className="px-4 py-3 text-center text-blue-600 font-medium">
                          {record.excused_days || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              record.attendance_percentage >= 80
                                ? 'bg-green-100 text-green-800'
                                : record.attendance_percentage >= 70
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {record.attendance_percentage || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
