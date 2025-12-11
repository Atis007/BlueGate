import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Students.css';
import { supabase } from '../lib/supabase';

interface Student {
  id: number;
  nev: string;
  indexszam: string;
  jelszo: string;
}

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('diak')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Hiba történt:', error);
        alert('Hiba történt az adatok betöltése során');
        return;
      }

      setStudents(data || []);
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt az adatok betöltése során');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter(student => 
    student.nev.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.indexszam.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteStudent = async (id: number) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a diákot?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('diak')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Hiba történt:', error);
        alert('Hiba történt a törlés során');
        return;
      }

      // Frissítjük a listát
      setStudents(students.filter(student => student.id !== id));
      alert('A diák sikeresen törölve!');
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt a törlés során');
    }
  };

  const handleEditStudent = (id: number) => {
    navigate(`/admin/edit-student/${id}`);
  };

  return (
    <div className="students-container">
      <div className="students-header">
        <h1>Diákok Kezelése</h1>
        <div className="stats-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          {filteredStudents.length} {filteredStudents.length === 1 ? 'diák' : 'diák'}
        </div>
        <div className="header-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Diák keresése név vagy index alapján..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Link to="/admin/add-student" className="add-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Új Diák
          </Link>
        </div>
      </div>

      <div className="students-list">
        {isLoading ? (
          <div className="loading-state">
            <svg className="spinner" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2">
              <circle cx="12" cy="12" r="10" opacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"/>
            </svg>
            <p>Betöltés...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{margin: '0 auto 1rem', opacity: 0.3}}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>{searchQuery ? 'Nincs találat a keresésre' : 'Még nincs hozzáadott diák'}</p>
          </div>
        ) : (
          filteredStudents.map(student => (
            <div key={student.id} className="student-card">
              <div className="student-info">
                <h3 className="student-name">{student.nev}</h3>
                <p className="student-details">Index: {student.indexszam}</p>
              </div>
              <div className="student-actions">
                <button 
                  className="edit-button"
                  onClick={() => handleEditStudent(student.id)}
                  title="Szerkesztés"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button 
                  className="delete-button"
                  onClick={() => handleDeleteStudent(student.id)}
                  title="Törlés"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <nav className="bottom-nav">
        <a href="#" className="nav-item">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          Kezdőlap
        </a>
        <a href="#" className="nav-item active">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Diákok
        </a>
      </nav>
    </div>
  );
}
