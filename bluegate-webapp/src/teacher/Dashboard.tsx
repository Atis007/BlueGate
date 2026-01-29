import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseSession } from '../hooks/useSupabaseSession';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

interface Course {
  id: number;
  nev: string;
}

export default function TeacherDashboard() {
  const { userProfile } = useSupabaseSession();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = courses.filter((course) =>
    course.nev.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchCourses = async () => {
      if (!userProfile?.id) {
        console.log('Nincs userProfile.id');
        setLoading(false);
        return;
      }

      console.log('Bejelentkezett tanár ID:', userProfile.id);

      try {
        // Get all columns from teacher to see the structure
        const { data: teacherData, error: teacherError } = await supabase
          .from('teacher')
          .select('*')
          .eq('id', userProfile.id)
          .single();

        console.log('Teacher lekérdezés eredmény:', { teacherData, teacherError });

        if (teacherError) {
          console.error('Hiba a tanár adatainak betöltésekor:', teacherError);
          console.error('RLS policy beállítás szükséges a teacher táblára:');
          console.error('CREATE POLICY "Allow teachers to read their own data" ON teacher FOR SELECT USING (true);');
          setLoading(false);
          return;
        }

        if (!teacherData) {
          console.error('Nem található a tanár az adatbázisban');
          setLoading(false);
          return;
        }

        console.log('Teacher adatok:', teacherData);
        
        // Check if teacher has a uuid field, otherwise the table structure might be different
        const teacherUuid = teacherData.uuid || teacherData.id;
        console.log('Teacher identifier for lookup:', teacherUuid);

        // Now fetch courses using the UUID
        const { data, error } = await supabase
          .from('teacher_courses')
          .select(`
            course_id,
            courses:course_id (
              id,
              nev
            )
          `)
          .eq('teacher_id', teacherUuid);

        console.log('Tantárgyak lekérdezés eredmény:', { data, error });

        if (error) {
          console.error('Hiba a tantárgyak betöltésekor:', error);
          console.error('RLS policy beállítások szükségesek:');
          console.error('CREATE POLICY "Allow reading teacher_courses" ON teacher_courses FOR SELECT USING (true);');
          console.error('CREATE POLICY "Allow reading courses" ON courses FOR SELECT USING (true);');
        } else if (data) {
          console.log('Nyers adatok:', data);
          const coursesList = data.map((item: any) => item.courses).filter(Boolean);
          console.log('Feldolgozott tantárgyak:', coursesList);
          setCourses(coursesList);
        }
      } catch (error) {
        console.error('Hiba:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [userProfile?.id]);


  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Tanári Felület</h1>
        <p className="welcome-text">
          Üdvözöljük, <strong>{userProfile?.name}</strong>!
        </p>
      </div>

      {!loading && courses.length > 0 && (
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Keresés tantárgyak között..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Keresés törlése"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="dashboard-content">
        {loading ? (
          <div className="loading-message">
            <p>Betöltés...</p>
          </div>
        ) : filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <div 
              key={course.id} 
              className="course-card"
              onClick={() => navigate(`/teacher/course/${course.id}`)}
            >
              <h2>{course.nev}</h2>
              <p className="course-subtitle">Kattints a részletekért</p>
            </div>
          ))
        ) : courses.length === 0 ? (
          <div className="empty-message">
            <p>Még nincsenek hozzárendelt tantárgyak.</p>
          </div>
        ) : (
          <div className="empty-message">
            <p>Nincs találat a keresésre: "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
