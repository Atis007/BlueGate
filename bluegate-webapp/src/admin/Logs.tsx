import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Students.css';
import './Logs.css';
import { supabase } from '../lib/supabase';

interface LogEntry {
  id: number;
  teacher_id: string;
  success: boolean;
  logged_at: string;
  error_message: string | null;
  teacher?: {
    nev: string;
  } | null;
}

type LogCategory = 'teacher_login' | null;

export default function Logs() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<LogCategory>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (selectedCategory === 'teacher_login') {
      fetchLogs();
    }
  }, [selectedCategory]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('teacher_login_logs')
        .select('*, teacher(nev)')
        .order('logged_at', { ascending: false });

      if (error) {
        console.error('Hiba történt:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Hiba történt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalItems = logs.length;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const displayedLogs = itemsPerPage === 'all'
    ? logs
    : logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleItemsPerPageChange = (value: number | 'all') => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (!selectedCategory) {
    return (
      <div className="log-categories-container">
        <div className="log-categories-header">
          <h1>Naplóbejegyzések</h1>
          <p style={{color: '#90a4ae'}}>Válasszon egy kategóriát a megtekintéshez</p>
        </div>
        
        <div className="log-cards">
          <div className="log-card" onClick={() => setSelectedCategory('teacher_login')}>
            <div style={{ marginBottom: '1rem', color: '#00d9ff' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <h2>Felhasználói bejelentkezési napló</h2>
            <p>Felhasználói bejelentkezési kísérletek (sikeres és sikertelen) listázása.</p>
          </div>

          <div className="log-card" onClick={() => navigate('/admin/sync-logs')}>
            <div style={{ marginBottom: '1rem', color: '#00d9ff' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4v6h6" />
                <path d="M20 20v-6h-6" />
                <path d="M5 19a9 9 0 0 1 14-14" />
              </svg>
            </div>
            <h2>Sync logok</h2>
            <p>Szinkronizálási folyamatok naplóinak megjelenítése.</p>
          </div>

          <div className="log-card" onClick={() => navigate('/admin/attendance-logs')}>
            <div style={{ marginBottom: '1rem', color: '#00d9ff' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 10h18" />
                <path d="M7 14h4" />
                <path d="M7 18h6" />
              </svg>
            </div>
            <h2>Jelenlét napló</h2>
            <p>Jelenléti bejegyzések listázása tantárgy és diák bontásban.</p>
          </div>
          
          {/* További kártyák helye */}
          {/* <div className="log-card">...</div> */}
        </div>
      </div>
    );
  }

  return (
    <div className="students-container">
      <div className="students-header">
        <button className="log-back-button" onClick={() => setSelectedCategory(null)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Vissza a kategóriákhoz
        </button>
        <h1>Felhasználói bejelentkezési napló</h1>
      </div>

      {isLoading ? (
        <div className="loading-state">
             <div className="loading-spinner"></div>
             <p>Betöltés...</p>
        </div>
      ) : (
        <>
        {logs.length > 0 && (
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
                  ? `Összes napló (${totalItems})`
                  : `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} / ${totalItems}`
                }
              </span>
            </div>
          </div>
        )}
        <div className="table-wrapper">
            <div className="list-container">
                <div className="list-row list-header" style={{ gridTemplateColumns: 'minmax(80px, 0.5fr) minmax(200px, 2fr) minmax(100px, 1fr) minmax(150px, 1.5fr) 2fr' }}>
                    <div className="list-cell">ID</div>
                    <div className="list-cell">Felhasználó</div>
                    <div className="list-cell">Állapot</div>
                    <div className="list-cell">Dátum</div>
                    <div className="list-cell">Hibaüzenet</div>
                </div>
                <div className="list-body">
                    {displayedLogs.map((log) => (
                        <div key={log.id} className="list-row" style={{ gridTemplateColumns: 'minmax(80px, 0.5fr) minmax(200px, 2fr) minmax(100px, 1fr) minmax(150px, 1.5fr) 2fr' }}>
                            <div className="list-cell row-sub">{log.id}</div>
                            <div className="list-cell row-sub" title={log.teacher_id}>
                                {log.teacher?.nev || 'Törölt felhasználó'} <span style={{fontSize: '0.8em', opacity: 0.7}}>({log.teacher_id.substring(0, 8)}...)</span>
                            </div>
                            <div className="list-cell row-title" style={{ color: log.success ? '#00d9ff' : '#ff4444' }}>
                                {log.success ? 'Sikeres' : 'Sikertelen'}
                            </div>
                            <div className="list-cell row-sub">{new Date(log.logged_at).toLocaleString('hu-HU')}</div>
                            <div className="list-cell row-sub" title={log.error_message || ''}>{log.error_message || '-'}</div>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="list-row" style={{justifyContent: 'center', padding: '2rem'}}>
                            <div className="list-cell">Nincs megjeleníthető adat.</div>
                        </div>
                    )}
                </div>
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
  );
}
