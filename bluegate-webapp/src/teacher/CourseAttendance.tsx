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
  const [filterDate, setFilterDate] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);
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

  const formatLocalDateKey = (value: string) => {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredCards = useMemo(() => {
    if (!activeDateFilter) {
      return attendanceCards;
    }

    return attendanceCards.filter((card) => formatLocalDateKey(card.dateKey) === activeDateFilter);
  }, [attendanceCards, activeDateFilter]);

  const sortedCards = useMemo(() => {
    const direction = sortOrder === 'asc' ? 1 : -1;
    return [...filteredCards].sort((a, b) => (new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime()) * direction);
  }, [filteredCards, sortOrder]);

  const totalItems = sortedCards.length;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const displayedCards = itemsPerPage === 'all'
    ? sortedCards
    : sortedCards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleItemsPerPageChange = (value: number | 'all') => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleSortOrderChange = (value: 'asc' | 'desc') => {
    setSortOrder(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

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

      <div className="attendance-filters">
        <div className="attendance-filter-group">
          <label className="attendance-filter-label" htmlFor="attendance-date-filter">
            Dátum szűrés
          </label>
          <input
            id="attendance-date-filter"
            type="date"
            className="attendance-filter-input"
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
          />
        </div>
        <div className="attendance-filter-group">
          <label className="attendance-filter-label" htmlFor="attendance-sort-order">
            Sorrend
          </label>
          <select
            id="attendance-sort-order"
            className="attendance-filter-input"
            value={sortOrder}
            onChange={(event) => handleSortOrderChange(event.target.value === 'asc' ? 'asc' : 'desc')}
          >
            <option value="desc">Dátum szerint csökkenő</option>
            <option value="asc">Dátum szerint növekvő</option>
          </select>
        </div>
        <div className="attendance-filter-group">
          <label className="attendance-filter-label" htmlFor="attendance-items-per-page">
            Megjelenítés
          </label>
          <select
            id="attendance-items-per-page"
            className="attendance-filter-input"
            value={itemsPerPage}
            onChange={(event) => handleItemsPerPageChange(event.target.value === 'all' ? 'all' : parseInt(event.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value="all">Összes</option>
          </select>
        </div>
        <button
          type="button"
          className="attendance-filter-button"
          onClick={() => setActiveDateFilter(filterDate || null)}
        >
          Szűrés
        </button>
      </div>

      {loading ? (
        <div className="attendance-state">Betöltés...</div>
      ) : errorMessage ? (
        <div className="attendance-state">{errorMessage}</div>
      ) : attendanceCards.length === 0 ? (
        <div className="attendance-state">Nincs jelenléti adat ehhez a tantárgyhoz.</div>
      ) : sortedCards.length === 0 ? (
        <div className="attendance-state">Nincs jelenléti adat a kiválasztott dátumra.</div>
      ) : (
        <>
          <div className="attendance-grid">
            {displayedCards.map((card) => (
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
          {itemsPerPage !== 'all' && totalPages > 1 && (
            <div className="attendance-pagination">
              <button
                className="attendance-pagination-button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Előző
              </button>

              <div className="attendance-pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        className={`attendance-pagination-number ${page === currentPage ? 'active' : ''}`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="attendance-pagination-ellipsis">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                className="attendance-pagination-button"
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
