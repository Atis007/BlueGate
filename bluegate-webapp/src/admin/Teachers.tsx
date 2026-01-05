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
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Record<string, number[]>>({});
  const [openSubjectsDropdownFor, setOpenSubjectsDropdownFor] = useState<string | null>(null);
  const [isUpdatingTeacherSubjects, setIsUpdatingTeacherSubjects] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const [{ data: teachersData, error: teachersError }, { data: subjectsData, error: subjectsError }, { data: linksData, error: linksError }] =
        await Promise.all([
          supabase.from('teacher').select('*').order('nev', { ascending: true }),
          supabase.from('tantargy').select('id, nev').order('nev', { ascending: true }),
          supabase.from('teacher_tantargy').select('teacher_id, tantargy_id'),
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
      (linksData as Array<{ teacher_id: string; tantargy_id: number }> | null)?.forEach((row) => {
        if (!map[row.teacher_id]) {
          map[row.teacher_id] = [];
        }
        map[row.teacher_id].push(row.tantargy_id);
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

  const setSelectedForTeacher = (teacherId: string, updater: (prev: number[]) => number[]) => {
    setSelectedSubjectIds((prev) => ({ ...prev, [teacherId]: updater(prev[teacherId] ?? []) }));
  };

  const toggleSelectedSubject = (teacherId: string, subjectId: number) => {
    setSelectedForTeacher(teacherId, (prev) => (prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]));
  };

  const handleAddSelectedSubjectsToTeacher = async (teacherId: string) => {
    const selected = selectedSubjectIds[teacherId] ?? [];
    if (selected.length === 0) {
      return;
    }

    const assigned = teacherSubjects[teacherId] ?? [];
    const toAdd = selected.filter((id) => !assigned.includes(id));
    if (toAdd.length === 0) {
      return;
    }

    try {
      setIsUpdatingTeacherSubjects((prev) => ({ ...prev, [teacherId]: true }));
      const { error } = await supabase
        .from('teacher_tantargy')
        .insert(toAdd.map((subjectId) => ({ teacher_id: teacherId, tantargy_id: subjectId })));

      if (error) {
        console.error('Hiba történt:', error);
        alert(`Hiba: ${error.message}`);
        return;
      }

      setTeacherSubjects((prev) => {
        const existing = prev[teacherId] ?? [];
        const merged = Array.from(new Set([...existing, ...toAdd]));
        return { ...prev, [teacherId]: merged };
      });
      // keep selection, but close dropdown for nicer UX
      setOpenSubjectsDropdownFor(null);
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt a mentés során');
    } finally {
      setIsUpdatingTeacherSubjects((prev) => ({ ...prev, [teacherId]: false }));
    }
  };

  const handleRemoveSelectedSubjectsFromTeacher = async (teacherId: string) => {
    const selected = selectedSubjectIds[teacherId] ?? [];
    if (selected.length === 0) {
      return;
    }

    const assigned = teacherSubjects[teacherId] ?? [];
    const toRemove = selected.filter((id) => assigned.includes(id));
    if (toRemove.length === 0) {
      return;
    }

    try {
      setIsUpdatingTeacherSubjects((prev) => ({ ...prev, [teacherId]: true }));
      const { error } = await supabase
        .from('teacher_tantargy')
        .delete()
        .eq('teacher_id', teacherId)
        .in('tantargy_id', toRemove);

      if (error) {
        console.error('Hiba történt:', error);
        alert(`Hiba: ${error.message}`);
        return;
      }

      setTeacherSubjects((prev) => {
        const existing = prev[teacherId] ?? [];
        return { ...prev, [teacherId]: existing.filter((id) => !toRemove.includes(id)) };
      });
      setOpenSubjectsDropdownFor(null);
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt a mentés során');
    } finally {
      setIsUpdatingTeacherSubjects((prev) => ({ ...prev, [teacherId]: false }));
    }
  };

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.nev.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Link to="/admin/add-teacher" className="add-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Új Tanár
          </Link>
        </div>
      </div>

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
          <div className="list-table teachers-table">
            <div className="list-row list-header" role="row">
              <div className="list-cell" role="columnheader">Név</div>
              <div className="list-cell" role="columnheader">Email</div>
              <div className="list-cell" role="columnheader">Tantárgyak</div>
              <div className="list-cell actions" role="columnheader">Műveletek</div>
            </div>
            {filteredTeachers.map((teacher) => (
              <div key={teacher.id} className="list-row" role="row">
                <div className="list-cell" role="cell">
                  <div className="row-title">{teacher.nev}</div>
                </div>
                <div className="list-cell" role="cell">
                  <div className="row-sub">{teacher.email}</div>
                </div>
                <div className="list-cell" role="cell">
                  <div className="subjects-cell">
                    <div className="subjects-add">
                      <div className={`subjects-dropdown ${subjects.length === 0 ? 'is-disabled' : ''}`}>
                        <button
                          type="button"
                          className="subjects-trigger"
                          onClick={() => setOpenSubjectsDropdownFor((prev) => (prev === teacher.id ? null : teacher.id))}
                          disabled={subjects.length === 0 || Boolean(isUpdatingTeacherSubjects[teacher.id])}
                        >
                          {subjects.length === 0 ? (
                            <span>No data</span>
                          ) : (teacherSubjects[teacher.id] ?? []).length === 0 ? (
                            <span>Tantárgy(ak) kiválasztása…</span>
                          ) : (
                            <span className="subjects-badges" aria-label="Jelenlegi tantárgyak">
                              {getSubjectNamesForTeacher(teacher.id).map((name) => (
                                <span key={name} className="subject-badge">
                                  {name}
                                </span>
                              ))}
                            </span>
                          )}
                        </button>

                        {openSubjectsDropdownFor === teacher.id && subjects.length > 0 && (
                          <div className="subjects-menu" role="listbox" aria-label="Tantárgyak">
                            {subjects.map((s) => {
                              const isAssigned = (teacherSubjects[teacher.id] ?? []).includes(s.id);
                              const isSelected = (selectedSubjectIds[teacher.id] ?? []).includes(s.id);
                              return (
                                <label key={s.id} className={`subjects-item ${isAssigned ? 'assigned' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectedSubject(teacher.id, s.id)}
                                    disabled={Boolean(isUpdatingTeacherSubjects[teacher.id])}
                                  />
                                  <span>{s.nev}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="mini-button"
                        onClick={() => handleAddSelectedSubjectsToTeacher(teacher.id)}
                        disabled={subjects.length === 0 || (selectedSubjectIds[teacher.id] ?? []).length === 0 || Boolean(isUpdatingTeacherSubjects[teacher.id])}
                        title="Hozzáadás"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="mini-button danger"
                        onClick={() => handleRemoveSelectedSubjectsFromTeacher(teacher.id)}
                        disabled={
                          (teacherSubjects[teacher.id] ?? []).length === 0 ||
                          (selectedSubjectIds[teacher.id] ?? []).length === 0 ||
                          Boolean(isUpdatingTeacherSubjects[teacher.id])
                        }
                        title="Eltávolítás"
                      >
                        -
                      </button>
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
        )}
      </div>
    </div>
  );
}
