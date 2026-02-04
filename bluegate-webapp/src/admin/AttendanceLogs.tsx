import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Students.css';
import './Logs.css';
import { supabase } from '../lib/supabase';

interface AttendanceLogEntry {
  id: number;
  course_id: number;
  diak_id: number;
  datum: string;
  course?: {
    nev: string;
  } | null;
  diak?: {
    nev: string;
    indexszam: string;
  } | null;
}

export default function AttendanceLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AttendanceLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('id, course_id, diak_id, datum, course:courses (nev), diak:diak_id (nev, indexszam)')
        .order('datum', { ascending: false });

      if (error) {
        console.error('Hiba történt:', error);
        return;
      }

      const normalized: AttendanceLogEntry[] = (data ?? []).map((row) => ({
        ...row,
        course: Array.isArray(row.course) ? row.course[0] ?? null : row.course ?? null,
        diak: Array.isArray(row.diak) ? row.diak[0] ?? null : row.diak ?? null,
      }));

      setLogs(normalized);
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

  return (
    <div className="students-container">
      <div className="students-header">
        <button className="log-back-button" onClick={() => navigate('/admin/logs')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Vissza a naplókhoz
        </button>
        <h1>Jelenlét napló</h1>
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
            <div
              className="list-row list-header"
              style={{
                gridTemplateColumns:
                  'minmax(80px, 0.5fr) minmax(220px, 2fr) minmax(220px, 2fr) minmax(160px, 1.5fr)',
              }}
            >
              <div className="list-cell">ID</div>
              <div className="list-cell">Tantárgy</div>
              <div className="list-cell">Diák</div>
              <div className="list-cell">Dátum</div>
            </div>
            <div className="list-body">
              {displayedLogs.map((log) => (
                <div
                  key={log.id}
                  className="list-row"
                  style={{
                    gridTemplateColumns:
                      'minmax(80px, 0.5fr) minmax(220px, 2fr) minmax(220px, 2fr) minmax(160px, 1.5fr)',
                  }}
                >
                  <div className="list-cell row-sub">{log.id}</div>
                  <div className="list-cell row-sub" title={log.course?.nev ?? ''}>
                    {log.course?.nev ?? `Tantárgy #${log.course_id}`}
                  </div>
                  <div className="list-cell row-sub" title={log.diak?.nev ?? ''}>
                    {log.diak?.nev ?? `Diák #${log.diak_id}`}
                    {log.diak?.indexszam ? (
                      <span style={{ fontSize: '0.8em', opacity: 0.7 }}> ({log.diak.indexszam})</span>
                    ) : null}
                  </div>
                  <div className="list-cell row-sub">{new Date(log.datum).toLocaleString('hu-HU')}</div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="list-row" style={{ justifyContent: 'center', padding: '2rem' }}>
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
