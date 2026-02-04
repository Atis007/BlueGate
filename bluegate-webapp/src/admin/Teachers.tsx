import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Students.css';
import { supabase } from '../lib/supabase';

interface Teacher {
  id: string;
  nev: string;
  email: string;
  jelszo: string;
}

interface Subject {
  id: number;
  nev: string;
}

export default function Teachers() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<Record<string, number[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const [{ data: teachersData, error: teachersError }, { data: subjectsData, error: subjectsError }, { data: linksData, error: linksError }] =
        await Promise.all([
          supabase.from('teacher').select('*').order('nev', { ascending: true }),
          supabase.from('courses').select('id, nev').order('nev', { ascending: true }),
          supabase.from('teacher_courses').select('teacher_id, course_id'),
        ]);

      if (teachersError) {
        console.error('Hiba történt:', teachersError);
        alert('Hiba történt az adatok betöltése során');
        return;
      }

      if (subjectsError) {
        console.error('Hiba történt:', subjectsError);
        // Tantárgyak hiányában is működjön a tanár lista
      }

      if (linksError) {
        console.error('Hiba történt:', linksError);
        // Kapcsolótábla hiányában is működjön a tanár lista
      }

      setTeachers((teachersData as Teacher[]) || []);
      setSubjects((subjectsData as Subject[]) || []);

      const map: Record<string, number[]> = {};
      (linksData as Array<{ teacher_id: string; course_id: number }> | null)?.forEach((row) => {
        if (!map[row.teacher_id]) {
          map[row.teacher_id] = [];
        }
        map[row.teacher_id].push(row.course_id);
      });
      setTeacherSubjects(map);
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt az adatok betöltése során');
    } finally {
      setIsLoading(false);
    }
  };

  const getSubjectNamesForTeacher = (teacherId: string) => {
    const ids = teacherSubjects[teacherId] ?? [];
    if (ids.length === 0) {
      return [] as string[];
    }

    const byId = new Map(subjects.map((s) => [s.id, s.nev] as const));
    return ids.map((id) => byId.get(id)).filter((name): name is string => Boolean(name));
  };

  const getSubjectsSummary = (teacherId: string) => {
    const names = getSubjectNamesForTeacher(teacherId);
    if (names.length === 0) {
      return { summary: '', full: '' };
    }
    const visible = names.slice(0, 2);
    const remaining = names.length - visible.length;
    const summary = remaining > 0 ? `${visible.join(', ')} +${remaining}` : visible.join(', ');
    return { summary, full: names.join(', ') };
  };

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.nev.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination számítások
  const totalItems = filteredTeachers.length;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
  
  // Aktuális oldal reset ha túlindexelne
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Megjelenített tanárok
  const displayedTeachers = itemsPerPage === 'all' 
    ? filteredTeachers 
    : filteredTeachers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleItemsPerPageChange = (value: number | 'all') => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a tanárt?')) {
      return;
    }

    try {
      const { error } = await supabase.from('teacher').delete().eq('id', id);

      if (error) {
        console.error('Hiba történt:', error);
        alert('Hiba történt a törlés során');
        return;
      }

      setTeachers(teachers.filter((t) => t.id !== id));
      alert('A tanár sikeresen törölve!');
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt a törlés során');
    }
  };

  const handleEditTeacher = (id: string) => {
    navigate(`/admin/edit-teacher/${id}`);
  };


  return (
    <div className="students-container">
      <div className="students-header">
        <h1>Tanárok Kezelése</h1>

        <div className="stats-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {filteredTeachers.length} {filteredTeachers.length === 1 ? 'tanár' : 'tanár'}
        </div>

        <div className="header-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Tanár keresése név vagy email alapján..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="header-actions">
            <Link to="/admin/add-teacher" className="add-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Új Tanár
            </Link>
            <Link to="/admin/add-course" className="add-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Új Tantárgy
            </Link>
          </div>
        </div>
      </div>

      {!isLoading && filteredTeachers.length > 0 && (
        <div className="table-controls">
          <div className="items-per-page">
            <label>Megjelenítés:</label>
            <select value={itemsPerPage} onChange={(e) => handleItemsPerPageChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value="all">Összes</option>
            </select>
            <span className="items-info">
              {itemsPerPage === 'all' 
                ? `Összes tanár (${totalItems})` 
                : `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} / ${totalItems}`
              }
            </span>
          </div>
        </div>
      )}

      <div className="students-list">
        {isLoading ? (
          <div className="loading-state">
            <svg className="spinner" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2">
              <circle cx="12" cy="12" r="10" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
            </svg>
            <p>Betöltés...</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="empty-state">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ margin: '0 auto 1rem', opacity: 0.3 }}
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>{searchQuery ? 'Nincs találat a keresésre' : 'Még nincs hozzáadott tanár'}</p>
          </div>
        ) : (
          <>
            <div className="list-table-wrapper">
              <div className="list-table teachers-table">
                <div className="list-row list-header" role="row">
                  <div className="list-cell" role="columnheader">Név</div>
                  <div className="list-cell" role="columnheader">Email</div>
                  <div className="list-cell" role="columnheader">Tantárgyak</div>
                  <div className="list-cell actions" role="columnheader">Műveletek</div>
                </div>
                {displayedTeachers.map((teacher) => (
              <div key={teacher.id} className="list-row" role="row">
                <div className="list-cell" role="cell">
                  <div className="row-title">{teacher.nev}</div>
                </div>
                <div className="list-cell" role="cell">
                  <div className="row-sub">{teacher.email}</div>
                </div>
                <div className="list-cell" role="cell">
                  <div className="subjects-cell">
                    <div className="subjects-hover">
                      <button type="button" className="subjects-manage-button" disabled={subjects.length === 0}>
                        Tantárgyak megjelenítése
                      </button>
                      {subjects.length > 0 && (
                        <div className="subjects-tooltip" role="tooltip">
                          {getSubjectsSummary(teacher.id).full || 'Nincs hozzárendelve tantárgy.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="list-cell actions" role="cell">
                  <div className="student-actions">
                    <button className="edit-button" onClick={() => handleEditTeacher(teacher.id)} title="Szerkesztés">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button className="delete-button" onClick={() => handleDeleteTeacher(teacher.id)} title="Törlés">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
              </div>
            </div>

            {itemsPerPage !== 'all' && totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="pagination-button" 
                  onClick={() => goToPage(currentPage - 1)} 
                  disabled={currentPage === 1}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Előző
                </button>
                
                <div className="pagination-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          className={`pagination-number ${page === currentPage ? 'active' : ''}`}
                          onClick={() => goToPage(page)}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="pagination-ellipsis">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button 
                  className="pagination-button" 
                  onClick={() => goToPage(currentPage + 1)} 
                  disabled={currentPage === totalPages}
                >
                  Következő
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
