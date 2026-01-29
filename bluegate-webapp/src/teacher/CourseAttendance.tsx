import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './CourseAttendance.css';

interface AttendanceRow {
  id: number;
  course_id: number;
  diak_id: number;
  datum: string;
  diak?: {
    id: number;
    nev: string;
    indexszam: string;
  } | null;
}

interface AttendanceCard {
  dateKey: string;
  label: string;
  entries: AttendanceRow[];
}

export default function CourseAttendance() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const parsedCourseId = useMemo(() => Number(courseId), [courseId]);
  const [courseName, setCourseName] = useState('');
  const [attendanceCards, setAttendanceCards] = useState<AttendanceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!Number.isFinite(parsedCourseId)) {
        setErrorMessage('Érvénytelen tantárgy azonosító.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('nev')
          .eq('id', parsedCourseId)
          .single();

        if (courseError) {
          console.error('Hiba a tantárgy betöltésekor:', courseError);
          setErrorMessage('Nem sikerült betölteni a tantárgy adatait.');
          setLoading(false);
          return;
        }

        setCourseName(courseData?.nev ?? 'Tantárgy');

        const { data, error } = await supabase
          .from('attendance')
          .select('id, course_id, diak_id, datum, diak:diak_id (id, nev, indexszam)')
          .eq('course_id', parsedCourseId)
          .order('datum', { ascending: false });

        if (error) {
          console.error('Hiba a jelenléti adatok betöltésekor:', error);
          setErrorMessage('Nem sikerült betölteni a jelenléti adatokat.');
          setAttendanceCards([]);
          setLoading(false);
          return;
        }

        const normalizedRows: AttendanceRow[] = (data ?? []).map((row) => ({
          ...row,
          diak: Array.isArray(row.diak) ? row.diak[0] ?? null : row.diak ?? null,
        }));

        const sortedRows = [...normalizedRows].sort(
          (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
        );

        const formatDate = (value: string) =>
          new Date(value).toLocaleString('hu-HU', {
            dateStyle: 'medium',
            timeStyle: 'short',
          });

        const pushGroup = (start: Date, entries: AttendanceRow[]) => {
          const dateKey = start.toISOString();
          cards.push({
            dateKey,
            label: formatDate(dateKey),
            entries,
          });
        };

        const cards: AttendanceCard[] = [];
        let currentGroup: AttendanceRow[] = [];
        let currentStart: Date | null = null;

        sortedRows.forEach((row) => {
          const rowTime = new Date(row.datum);
          if (!currentStart) {
            currentStart = rowTime;
            currentGroup = [row];
            return;
          }

          const minutesDiff = Math.abs(currentStart.getTime() - rowTime.getTime()) / 60000;
          if (minutesDiff <= 2) {
            currentGroup.push(row);
            return;
          }

          pushGroup(currentStart, currentGroup);
          currentStart = rowTime;
          currentGroup = [row];
        });

        if (currentStart && currentGroup.length > 0) {
          pushGroup(currentStart, currentGroup);
        }

        setAttendanceCards(cards);
      } catch (err) {
        console.error('Hiba a jelenléti adatok feldolgozásakor:', err);
        setErrorMessage('Hiba történt az adatok feldolgozásakor.');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [parsedCourseId]);

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <button type="button" className="back-button" onClick={() => navigate('/teacher/dashboard')}>
          ← Vissza a tantárgyakhoz
        </button>
        <div>
          <p className="attendance-eyebrow">Tantárgy jelenlétek</p>
          <h1>{courseName || 'Tantárgy'}</h1>
        </div>
      </div>

      {loading ? (
        <div className="attendance-state">Betöltés...</div>
      ) : errorMessage ? (
        <div className="attendance-state">{errorMessage}</div>
      ) : attendanceCards.length === 0 ? (
        <div className="attendance-state">Nincs jelenléti adat ehhez a tantárgyhoz.</div>
      ) : (
        <div className="attendance-grid">
          {attendanceCards.map((card) => (
            <div key={card.dateKey} className="attendance-card">
              <div className="attendance-card-header">
                <h2>{card.label}</h2>
                <span>{card.entries.length} jelenlét</span>
              </div>
              <div className="attendance-list">
                {card.entries.map((entry) => (
                  <div key={entry.id} className="attendance-item">
                    <span className="attendance-name">
                      {entry.diak?.nev ?? `Diák #${entry.diak_id}`}
                    </span>
                    <span className="attendance-id">
                      {entry.diak?.indexszam ?? ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
