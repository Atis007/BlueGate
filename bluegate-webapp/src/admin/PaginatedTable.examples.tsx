/**
 * PAGINATED TABLE HASZNÁLATI ÚTMUTATÓ
 * ====================================
 * 
 * Ez a fájl példákat mutat be a PaginatedTable komponens használatára.
 */

import PaginatedTable, { Column } from './PaginatedTable';

// ============================================
// 1. PÉLDA: Egyszerű tanár lista
// ============================================

interface Teacher {
  id: string;
  nev: string;
  email: string;
}

function TeachersExample() {
  const teachers: Teacher[] = [
    { id: '1', nev: 'Kovács János', email: 'kovacs@example.com' },
    { id: '2', nev: 'Nagy Anna', email: 'nagy@example.com' },
  ];

  const columns: Column<Teacher>[] = [
    {
      header: 'Név',
      accessor: 'nev',
    },
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Műveletek',
      className: 'actions',
      render: (teacher) => (
        <div className="student-actions">
          <button onClick={() => console.log('Edit', teacher.id)}>Szerkesztés</button>
          <button onClick={() => console.log('Delete', teacher.id)}>Törlés</button>
        </div>
      ),
    },
  ];

  const handleSearch = (query: string) => {
    return teachers.filter(
      (t) =>
        t.nev.toLowerCase().includes(query.toLowerCase()) ||
        t.email.toLowerCase().includes(query.toLowerCase())
    );
  };

  return (
    <PaginatedTable
      data={teachers}
      columns={columns}
      getRowKey={(row) => row.id}
      onSearch={handleSearch}
      searchPlaceholder="Tanár keresése név vagy email alapján..."
      emptyMessage="Még nincs hozzáadott tanár"
      defaultItemsPerPage={10}
    />
  );
}

// ============================================
// 2. PÉLDA: Complex render funkciókkal
// ============================================

interface Student {
  id: string;
  nev: string;
  email: string;
  osztaly: string;
  aktiv: boolean;
}

function StudentsExample() {
  const students: Student[] = [];

  const columns: Column<Student>[] = [
    {
      header: 'Diák neve',
      render: (student) => (
        <div>
          <div className="row-title">{student.nev}</div>
          <div className="row-sub">{student.osztaly}</div>
        </div>
      ),
    },
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Státusz',
      render: (student) => (
        <span className={`badge ${student.aktiv ? 'active' : 'inactive'}`}>
          {student.aktiv ? 'Aktív' : 'Inaktív'}
        </span>
      ),
    },
    {
      header: 'Műveletek',
      className: 'actions',
      render: (student) => (
        <div className="student-actions">
          <button className="edit-button" title="Szerkesztés">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className="delete-button" title="Törlés">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <PaginatedTable
      data={students}
      columns={columns}
      getRowKey={(row) => row.id}
      onSearch={(query) =>
        students.filter(
          (s) =>
            s.nev.toLowerCase().includes(query.toLowerCase()) ||
            s.email.toLowerCase().includes(query.toLowerCase()) ||
            s.osztaly.toLowerCase().includes(query.toLowerCase())
        )
      }
      searchPlaceholder="Diák keresése..."
      emptyMessage="Még nincs hozzáadott diák"
    />
  );
}

// ============================================
// 3. PÉLDA: Accessor funkcióval
// ============================================

interface Course {
  id: number;
  nev: string;
  created_at: string;
}

function CoursesExample() {
  const courses: Course[] = [];

  const columns: Column<Course>[] = [
    {
      header: 'Tárgy neve',
      accessor: 'nev',
    },
    {
      header: 'Létrehozva',
      accessor: (course) => new Date(course.created_at).toLocaleDateString('hu-HU'),
    },
  ];

  return (
    <PaginatedTable
      data={courses}
      columns={columns}
      getRowKey={(row) => String(row.id)}
      emptyMessage="Még nincs hozzáadott tantárgy"
      defaultItemsPerPage={20}
    />
  );
}

/**
 * COLUMN TÍPUSOK
 * ==============
 * 
 * accessor: keyof T - egyszerű property hozzáférés
 * accessor: (row: T) => ReactNode - egyedi érték számítás
 * render: (row: T) => ReactNode - teljes vezérlés a cellán
 * className: string - CSS osztály a cellához (pl. 'actions')
 * 
 * PROPS
 * =====
 * 
 * data: T[] - KÖTELEZŐ - a megjelenítendő adatok
 * columns: Column<T>[] - KÖTELEZŐ - oszlop definíciók
 * getRowKey: (row: T) => string - KÖTELEZŐ - egyedi kulcs minden sorhoz
 * 
 * isLoading?: boolean - betöltési állapot
 * emptyMessage?: string - üres lista üzenete
 * searchPlaceholder?: string - keresés placeholder
 * onSearch?: (query: string) => T[] - keresési logika
 * defaultItemsPerPage?: number - alapértelmezett elemszám oldalanként (default: 10)
 */

export { TeachersExample, StudentsExample, CoursesExample };
