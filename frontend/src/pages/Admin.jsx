import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getAcademicYears,
  createAcademicYear,
  setCurrentAcademicYear,
  deleteAcademicYear,
  getTerms,
  createTerm,
  setCurrentTerm,
  deleteTerm,
  getSubjects,
  createSubject,
  deleteSubject
} from '../services/api';

export default function Admin() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('academicYears');
  const [loading, setLoading] = useState(false);

  // Academic Years
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearForm, setAcademicYearForm] = useState({
    name: '',
    startDate: '',
    endDate: ''
  });

  // Terms
  const [terms, setTerms] = useState([]);
  const [termForm, setTermForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    academicYearId: ''
  });

  // Subjects
  const [subjects, setSubjects] = useState([]);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    curriculum: '8-4-4'
  });

  const [curriculumFilter, setCurriculumFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab, curriculumFilter]);

  const formatDate = (date) => {
    return date ? new Date(date).toLocaleDateString() : '-';
  };

  const loadData = async () => {
    setLoading(true);

    try {
      if (activeTab === 'academicYears') {
        const res = await getAcademicYears();
        setAcademicYears(res.data);
      }

      if (activeTab === 'terms') {
        const [termsRes, yearsRes] = await Promise.all([
          getTerms(),
          getAcademicYears()
        ]);

        setTerms(termsRes.data);
        setAcademicYears(yearsRes.data);
      }

      if (activeTab === 'subjects') {
        const res = await getSubjects({
          curriculum: curriculumFilter
        });

        setSubjects(res.data);
      }
    } catch (error) {
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Academic Year Handlers
  const handleAddAcademicYear = async (e) => {
    e.preventDefault();

    try {
      await createAcademicYear(academicYearForm);

      setAcademicYearForm({
        name: '',
        startDate: '',
        endDate: ''
      });

      await loadData();

      alert('Academic year created successfully');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleSetCurrentYear = async (id) => {
    try {
      await setCurrentAcademicYear(id);

      await loadData();

      alert('Current academic year updated');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteYear = async (id) => {
    if (!window.confirm('Are you sure?')) return;

    try {
      await deleteAcademicYear(id);

      await loadData();

      alert('Academic year deleted');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Term Handlers
  const handleAddTerm = async (e) => {
    e.preventDefault();

    try {
      await createTerm(termForm);

      setTermForm({
        name: '',
        startDate: '',
        endDate: '',
        academicYearId: ''
      });

      await loadData();

      alert('Term created successfully');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleSetCurrentTermHandler = async (id) => {
    try {
      const selectedTerm = terms.find((term) => term.id === id);
      await setCurrentTerm(id, {
        academicYearId: selectedTerm?.academic_year_id
      });

      await loadData();

      alert('Current term updated');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteTermHandler = async (id) => {
    if (!window.confirm('Are you sure?')) return;

    try {
      await deleteTerm(id);

      await loadData();

      alert('Term deleted');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Subject Handlers
  const handleAddSubject = async (e) => {
    e.preventDefault();

    try {
      await createSubject(subjectForm);

      setSubjectForm({
        name: '',
        code: '',
        curriculum: '8-4-4'
      });

      await loadData();

      alert('Subject created successfully');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteSubjectHandler = async (id) => {
    if (!window.confirm('Are you sure?')) return;

    try {
      await deleteSubject(id);

      await loadData();

      alert('Subject deleted');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Authorization
  if (!['super_admin', 'principal'].includes(user?.role)) {
    return (
      <div className="p-6 text-center text-red-600">
        You don't have permission to access this page.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        School Administration
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {['academicYears', 'terms', 'subjects'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Academic Years */}
      {activeTab === 'academicYears' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <p className="p-6">Loading...</p>
          ) : (
            <table className="w-full">
              <tbody>
                {academicYears.map((year) => (
                  <tr key={year.id} className="border-t">
                    <td className="px-6 py-3">
                      {year.name}
                    </td>

                    <td className="px-6 py-3">
                      {formatDate(year.start_date)} to{' '}
                      {formatDate(year.end_date)}
                    </td>

                    <td className="px-6 py-3">
                      {!year.is_current && (
                        <button
                          onClick={() =>
                            handleSetCurrentYear(year.id)
                          }
                        >
                          Set Current
                        </button>
                      )}
                    </td>

                    <td className="px-6 py-3">
                      <button
                        onClick={() =>
                          handleDeleteYear(year.id)
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Terms */}
      {activeTab === 'terms' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <p className="p-6">Loading...</p>
          ) : (
            <table className="w-full">
              <tbody>
                {terms.map((term) => (
                  <tr key={term.id}>
                    <td className="px-6 py-3">
                      {term.name}
                    </td>

                    <td className="px-6 py-3">
                      {term.academic_year_name}
                    </td>

                    <td className="px-6 py-3">
                      {formatDate(term.start_date)} to{' '}
                      {formatDate(term.end_date)}
                    </td>

                    <td className="px-6 py-3">
                      {!term.is_current && (
                        <button
                          onClick={() =>
                            handleSetCurrentTermHandler(
                              term.id
                            )
                          }
                        >
                          Set Current
                        </button>
                      )}
                    </td>

                    <td className="px-6 py-3">
                      <button
                        onClick={() =>
                          handleDeleteTermHandler(
                            term.id
                          )
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Subjects */}
      {activeTab === 'subjects' && (
        <div>
          <div className="mb-4">
            <select
              value={curriculumFilter}
              onChange={(e) =>
                setCurriculumFilter(
                  e.target.value
                )
              }
              className="border px-3 py-2 rounded"
            >
              <option value="">
                All Curricula
              </option>
              <option value="8-4-4">
                8-4-4
              </option>
              <option value="cbc">
                CBC
              </option>
            </select>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <p className="p-6">Loading...</p>
            ) : (
              <table className="w-full">
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td className="px-6 py-3">
                        {subject.name}
                      </td>

                      <td className="px-6 py-3">
                        {subject.code}
                      </td>

                      <td className="px-6 py-3">
                        {subject.curriculum}
                      </td>

                      <td className="px-6 py-3">
                        <button
                          onClick={() =>
                            handleDeleteSubjectHandler(
                              subject.id
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}