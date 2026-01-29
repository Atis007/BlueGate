import { useState, useEffect } from 'react';
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
  const [selectedCategory, setSelectedCategory] = useState<LogCategory>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
            <h2>Tanár bejelentkezés</h2>
            <p>Tanári bejelentkezési kísérletek (sikeres és sikertelen) listázása.</p>
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
        <h1>Tanár bejelentkezés napló</h1>
      </div>

      {isLoading ? (
        <div className="loading-state">
             <div className="loading-spinner"></div>
             <p>Betöltés...</p>
        </div>
      ) : (
        <div className="table-wrapper">
            <div className="list-container">
                <div className="list-row list-header" style={{ gridTemplateColumns: 'minmax(80px, 0.5fr) minmax(200px, 2fr) minmax(100px, 1fr) minmax(150px, 1.5fr) 2fr' }}>
                    <div className="list-cell">ID</div>
                    <div className="list-cell">Tanár</div>
                    <div className="list-cell">Sikeresség</div>
                    <div className="list-cell">Dátum</div>
                    <div className="list-cell">Hibaüzenet</div>
                </div>
                <div className="list-body">
                    {logs.map((log) => (
                        <div key={log.id} className="list-row" style={{ gridTemplateColumns: 'minmax(80px, 0.5fr) minmax(200px, 2fr) minmax(100px, 1fr) minmax(150px, 1.5fr) 2fr' }}>
                            <div className="list-cell row-sub">{log.id}</div>
                            <div className="list-cell row-sub" title={log.teacher_id}>
                                {log.teacher?.nev || 'Törölt tanár'} <span style={{fontSize: '0.8em', opacity: 0.7}}>({log.teacher_id.substring(0, 8)}...)</span>
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
      )}
    </div>
  );
}
