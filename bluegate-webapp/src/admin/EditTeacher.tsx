import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { hash } from 'bcryptjs';
import { supabase } from '../lib/supabase';
import './AddStudent.css';

export default function EditTeacher() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subjects, setSubjects] = useState<Array<{ id: number; nev: string }>>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [assignedElsewhereIds, setAssignedElsewhereIds] = useState<number[]>([]);
  const [assignedElsewhereMap, setAssignedElsewhereMap] = useState<Record<number, string>>({});
  const [initialAssignedSubjectIds, setInitialAssignedSubjectIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    nev: '',
    email: '',
    jelszo: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (id) {
      fetchTeacher();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchSubjectsAndAssignments();
    }
  }, [id]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const fetchTeacher = async () => {
    try {
      const { data, error } = await supabase.from('teacher').select('*').eq('id', id).single();

      if (error) {
        console.error('Hiba történt:', error);
        alert('Hiba történt az adatok betöltése során');
        navigate('/admin/teachers');
        return;
      }

      if (data) {
        setFormData({
          nev: data.nev ?? '',
          email: data.email ?? '',
          jelszo: '',
        });
      }
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt az adatok betöltése során');
      navigate('/admin/teachers');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubjectsAndAssignments = async () => {
    setIsLoadingSubjects(true);

    try {
      const [
        { data: subjectsData, error: subjectsError },
        { data: linksData, error: linksError },
        { data: allLinksData, error: allLinksError },
      ] = await Promise.all([
        supabase.from('courses').select('id, nev').order('nev', { ascending: true }),
        supabase.from('teacher_courses').select('course_id').eq('teacher_id', id),
        supabase.from('teacher_courses').select('teacher_id, course_id'),
      ]);

      if (subjectsError) {
        console.error('Hiba történt:', subjectsError);
      }
      if (linksError) {
        console.error('Hiba történt:', linksError);
      }
      if (allLinksError) {
        console.error('Hiba történt:', allLinksError);
      }

      const loadedSubjects = (subjectsData as Array<{ id: number; nev: string }> | null) ?? [];
      setSubjects(loadedSubjects);

      const assigned = ((linksData as Array<{ course_id: number }> | null) ?? []).map((r) => r.course_id);
      setSelectedSubjectIds(assigned);
      setInitialAssignedSubjectIds(assigned);

      const assignedElsewhereRows = ((allLinksData as Array<{ teacher_id: string; course_id: number }> | null) ?? [])
        .filter((row) => row.teacher_id !== id);
      const assignedElsewhere = assignedElsewhereRows.map((row) => row.course_id);
      setAssignedElsewhereIds(Array.from(new Set(assignedElsewhere)));
      const assignedMap: Record<number, string> = {};
      assignedElsewhereRows.forEach((row) => {
        assignedMap[row.course_id] = row.teacher_id;
      });
      setAssignedElsewhereMap(assignedMap);
    } catch (error) {
      console.error('Hiba történt:', error);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const toggleSubject = (subjectId: number) => {
    setSelectedSubjectIds((prev) => (prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]));
  };

  const handleSelectAllFiltered = (filtered: Array<{ id: number }>) => {
    const ids = filtered.map((subject) => subject.id);
    if (ids.length === 0) return;
    setSelectedSubjectIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleClearSelection = () => {
    setSelectedSubjectIds([]);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nev.trim()) {
      newErrors.nev = 'A név megadása kötelező';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Az email megadása kötelező';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Kérlek adj meg egy érvényes email címet';
    }

    if (formData.jelszo.trim() && formData.jelszo.length < 6) {
      newErrors.jelszo = 'A jelszónak legalább 6 karakter hosszúnak kell lennie';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData: { nev: string; email: string; jelszo?: string } = {
        nev: formData.nev,
        email: formData.email.toLowerCase().trim(),
      };

      if (formData.jelszo.trim()) {
        updateData.jelszo = await hash(formData.jelszo, 10);
      }

      const { error } = await supabase.from('teacher').update(updateData).eq('id', id);

      if (error) {
        console.error('Hiba történt:', error);
        alert(`Hiba: ${error.message}`);
        return;
      }

      // Tantárgy hozzárendelések mentése
      // Meglévő kapcsolatok lekérése
      const { data: existingLinks, error: existingLinksError } = await supabase
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', id);

      if (existingLinksError) {
        console.error('Hiba történt:', existingLinksError);
        alert(`Hiba: ${existingLinksError.message}`);
        return;
      }

      const existingIds = ((existingLinks as Array<{ course_id: number }> | null) ?? []).map((r) => r.course_id);
      const toAdd = selectedSubjectIds.filter((subjectId) => !existingIds.includes(subjectId));
      const toRemove = existingIds.filter((subjectId) => !selectedSubjectIds.includes(subjectId));

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase.rpc('remove_teacher_courses', {
          p_teacher_id: id,
          p_course_ids: toRemove,
        });

        if (deleteError) {
          console.error('Hiba történt:', deleteError);
          alert(`Hiba: ${deleteError.message}`);
          return;
        }
      }

      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_courses')
          .insert(toAdd.map((subjectId) => ({ teacher_id: id, course_id: subjectId })));

        if (insertError) {
          console.error('Hiba történt:', insertError);
          alert(`Hiba: ${insertError.message}`);
          return;
        }
      }

      alert('A tanár adatai sikeresen frissítve!');
      navigate('/admin/teachers');
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt az adatok mentése során');
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizedQuery = subjectSearch.trim().toLowerCase();
  const filteredSubjects = normalizedQuery
    ? subjects.filter((subject) => subject.nev.toLowerCase().includes(normalizedQuery))
    : subjects;

  const orderedSubjects = useMemo(() => {
    const selectedSet = new Set(selectedSubjectIds);
    const assignedElsewhereSet = new Set(assignedElsewhereIds);
    return [...filteredSubjects].sort((a, b) => {
      const aSelected = selectedSet.has(a.id);
      const bSelected = selectedSet.has(b.id);
      const aAssignedElsewhere = assignedElsewhereSet.has(a.id);
      const bAssignedElsewhere = assignedElsewhereSet.has(b.id);

      const aGroup = aSelected ? 0 : aAssignedElsewhere ? 2 : 1;
      const bGroup = bSelected ? 0 : bAssignedElsewhere ? 2 : 1;

      if (aGroup !== bGroup) {
        return aGroup - bGroup;
      }

      return a.nev.localeCompare(b.nev, 'hu');
    });
  }, [filteredSubjects, selectedSubjectIds, assignedElsewhereIds]);

  if (isLoading) {
    return (
      <div className="add-student-container">
        <div
          className="loading-state"
          style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg className="spinner" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2">
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
          </svg>
          <p>Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-student-container">
      <div className="add-student-header">
        <button className="back-button" onClick={() => navigate('/admin/teachers')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1>Tanár Szerkesztése</h1>
      </div>

      <form className="student-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nev">Név</label>
          <input
            type="text"
            id="nev"
            className={errors.nev ? 'input-error' : ''}
            placeholder="Add meg a tanár nevét"
            value={formData.nev}
            onChange={(e) => updateField('nev', e.target.value)}
            disabled={isSubmitting}
          />
          {errors.nev && <span className="error-text">{errors.nev}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            className={errors.email ? 'input-error' : ''}
            placeholder="pl. tanar@iskola.hu"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            disabled={isSubmitting}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="jelszo">Új jelszó (opcionális)</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="jelszo"
              className={errors.jelszo ? 'input-error' : ''}
              placeholder="Hagyd üresen, ha nem szeretnéd módosítani"
              value={formData.jelszo}
              onChange={(e) => updateField('jelszo', e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.jelszo && <span className="error-text">{errors.jelszo}</span>}
        </div>

        <div className="form-group">
          <div className="subjects-panel-header">
            <label className="subjects-title">Tantárgyak</label>
            <div className="subjects-meta">
              Kijelölve: {selectedSubjectIds.length}/{subjects.length}
            </div>
          </div>
          {isLoadingSubjects ? (
            <div className="row-sub">Betöltés...</div>
          ) : subjects.length === 0 ? (
            <div className="row-sub">Nincs tantárgy a rendszerben.</div>
          ) : (
            <div className="subjects-panel">
              <input
                type="text"
                className="subjects-search"
                placeholder="Keresés tantárgyak között..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                disabled={isSubmitting}
              />
              <div className="subjects-panel-actions">
                <button
                  type="button"
                  className="subjects-panel-button"
                  onClick={() => handleSelectAllFiltered(filteredSubjects)}
                  disabled={isSubmitting || filteredSubjects.length === 0}
                >
                  Összes kijelölése
                </button>
                <button
                  type="button"
                  className="subjects-panel-button secondary"
                  onClick={handleClearSelection}
                  disabled={isSubmitting || selectedSubjectIds.length === 0}
                >
                  Kijelölés törlése
                </button>
              </div>
              <div className="subjects-table" role="listbox" aria-label="Tantárgy kiválasztás">
                <div className="subjects-row subjects-header" role="row">
                  <div className="subjects-cell">Tantárgy</div>
                </div>
                {orderedSubjects.length === 0 ? (
                  <div className="subjects-empty">
                    Nincs találat.
                  </div>
                ) : (
                  orderedSubjects.map((subject) => {
                    const isSelected = selectedSubjectIds.includes(subject.id);
                    const isAssigned = initialAssignedSubjectIds.includes(subject.id);
                    const isAssignedElsewhere = assignedElsewhereIds.includes(subject.id);
                    return (
                      <div
                        key={subject.id}
                        className={`subjects-row ${isSelected ? 'selected' : ''} ${isAssigned ? 'assigned' : ''} ${isAssignedElsewhere ? 'disabled' : ''}`}
                        role="row"
                        onClick={() => {
                          if (!isSubmitting && !isAssignedElsewhere) {
                            toggleSubject(subject.id);
                          }
                        }}
                        title={isAssignedElsewhere ? 'Már más tanárhoz van rendelve.' : undefined}
                      >
                        <div className="subjects-cell">
                          <span className="subject-name">{subject.nev}</span>
                        </div>
                        <div className="subjects-cell subjects-cell-end">
                          {isSelected && (
                            <svg className="subjects-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="button-group">
          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
                </svg>
                Mentés...
              </>
            ) : (
              'Módosítások Mentése'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
