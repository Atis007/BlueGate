import { useState, useEffect, ReactNode } from 'react';
import './PaginatedTable.css';

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => ReactNode);
  render?: (row: T) => ReactNode;
  className?: string;
}

interface PaginatedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => T[];
  getRowKey: (row: T) => string;
  defaultItemsPerPage?: number;
}

export default function PaginatedTable<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'Nincs megjeleníthető adat',
  searchPlaceholder = 'Keresés...',
  onSearch,
  getRowKey,
  defaultItemsPerPage = 10,
}: PaginatedTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(defaultItemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  // Szűrt adatok
  const filteredData = onSearch && searchQuery ? onSearch(searchQuery) : data;

  // Pagination számítások
  const totalItems = filteredData.length;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);

  // Aktuális oldal reset ha túlindexelne
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Megjelenített sorok
  const displayedData =
    itemsPerPage === 'all' ? filteredData : filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleItemsPerPageChange = (value: number | 'all') => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getCellContent = (row: T, column: Column<T>) => {
    if (column.render) {
      return column.render(row);
    }
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    if (column.accessor) {
      return String(row[column.accessor] ?? '');
    }
    return null;
  };

  return (
    <div className="paginated-table-container">
      {/* Keresés */}
      {onSearch && (
        <div className="table-search">
          <input
            type="text"
            className="search-input"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Táblázat vezérlők */}
      {!isLoading && filteredData.length > 0 && (
        <div className="table-controls">
          <div className="items-per-page">
            <label>Megjelenítés:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value="all">Összes</option>
            </select>
            <span className="items-info">
              {itemsPerPage === 'all'
                ? `Összes (${totalItems})`
                : `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} / ${totalItems}`}
            </span>
          </div>
        </div>
      )}

      {/* Táblázat */}
      <div className="table-content">
        {isLoading ? (
          <div className="loading-state">
            <svg className="spinner" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2">
              <circle cx="12" cy="12" r="10" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
            </svg>
            <p>Betöltés...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="empty-state">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ margin: '0 auto 1rem', opacity: 0.3 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{searchQuery ? 'Nincs találat a keresésre' : emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="list-table-wrapper">
              <div className="list-table">
                {/* Fejléc */}
                <div className="list-row list-header" role="row">
                  {columns.map((column, index) => (
                    <div key={index} className={`list-cell ${column.className || ''}`} role="columnheader">
                      {column.header}
                    </div>
                  ))}
                </div>

                {/* Sorok */}
                {displayedData.map((row) => (
                  <div key={getRowKey(row)} className="list-row" role="row">
                    {columns.map((column, colIndex) => (
                      <div key={colIndex} className={`list-cell ${column.className || ''}`} role="cell">
                        {getCellContent(row, column)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {itemsPerPage !== 'all' && totalPages > 1 && (
              <div className="pagination">
                <button className="pagination-button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Előző
                </button>

                <div className="pagination-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
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
                      return (
                        <span key={page} className="pagination-ellipsis">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button className="pagination-button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
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
    </div>
  );
}
