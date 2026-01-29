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
              {logs.map((log) => (
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
      )}
    </div>
  );
}
