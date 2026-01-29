import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Students.css';
import './Logs.css';
import { supabase } from '../lib/supabase';

interface SyncLogEntry {
  id: number;
  raspberry_device_id: string;
  synced_at: string;
}

export default function SyncLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('synced_at', { ascending: false });

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

  return (
    <div className="students-container">
      <div className="students-header">
        <button className="log-back-button" onClick={() => navigate('/admin/logs')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Vissza a naplókhoz
        </button>
        <h1>Sync napló</h1>
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
                gridTemplateColumns: 'minmax(80px, 0.5fr) minmax(200px, 2fr) minmax(160px, 1.5fr)',
              }}
            >
              <div className="list-cell">ID</div>
              <div className="list-cell">Raspberry ID</div>
              <div className="list-cell">Szinkron ideje</div>
            </div>
            <div className="list-body">
              {logs.map((log) => {
                return (
                  <div
                    key={log.id}
                    className="list-row"
                    style={{
                      gridTemplateColumns: 'minmax(80px, 0.5fr) minmax(200px, 2fr) minmax(160px, 1.5fr)',
                    }}
                  >
                    <div className="list-cell row-sub">{log.id}</div>
                    <div className="list-cell row-sub" title={log.raspberry_device_id}>
                      {log.raspberry_device_id}
                    </div>
                    <div className="list-cell row-sub">
                      {log.synced_at ? new Date(log.synced_at).toLocaleString('hu-HU') : '-'}
                    </div>
                  </div>
                );
              })}
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
