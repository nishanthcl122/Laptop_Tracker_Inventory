import React, { useEffect, useState, useCallback } from 'react';
import FilterBar from '../components/FilterBar';
import LaptopTable from '../components/LaptopTable';
import AuditModal from '../components/AuditModal';
import { api } from '../services/api';
import {
  getDefaultLaptopFilters,
  getDefaultColumnFilters,
  buildLaptopQueryParams
} from '../utils/laptopQuery';

export default function LaptopDetailsPage() {
  const [appliedFilters, setAppliedFilters] = useState(() => getDefaultLaptopFilters());
  const [columnFilters, setColumnFilters] = useState(() => getDefaultColumnFilters());

  const [pagination, setPagination] = useState({ page: 1, pageSize: 25 });
  const [sort, setSort] = useState({ field: 'serialnumber', direction: 'asc' });

  const [laptops, setLaptops] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLaptop, setSelectedLaptop] = useState(null);

  // Single unified data fetcher
  const loadData = useCallback(() => {
    setIsLoading(true);
    const params = buildLaptopQueryParams(appliedFilters, columnFilters, pagination, sort);

    api.getLaptops(params)
      .then((res) => {
        setLaptops(res.items || []);
        setTotalCount(res.totalCount || 0);
      })
      .catch((err) => {
        console.error('Failed to load laptops', err);
      })
      .finally(() => setIsLoading(false));
  }, [appliedFilters, columnFilters, pagination, sort]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Page filter handlers
  const handleApplyFilters = (newFilters) => {
    setAppliedFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = (cleared) => {
    setAppliedFilters(cleared);
    setColumnFilters(getDefaultColumnFilters());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Header column filter handler
  const handleColumnFilterChange = (columnKey, selectedVals) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: selectedVals
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Laptop Operational Registry
          </h1>
          <p className="text-xs text-slate-500">
            Full inventory dataset, employee assignments, RAS tracking, and stock duration.
          </p>
        </div>
        <div className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md font-mono text-xs font-semibold">
          Total Current Laptops: {totalCount.toLocaleString()}
        </div>
      </div>

      {/* Filter Bar with dedicated Apply Filters */}
      <FilterBar
        appliedFilters={appliedFilters}
        columnFilters={columnFilters}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />

      {/* Laptop Table with Excel-style Header Filtering */}
      <LaptopTable
        data={laptops}
        totalCount={totalCount}
        page={pagination.page}
        pageSize={pagination.pageSize}
        sortBy={sort.field}
        sortDirection={sort.direction}
        columnFilters={columnFilters}
        onColumnFilterChange={handleColumnFilterChange}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onPageSizeChange={(size) => setPagination({ page: 1, pageSize: size })}
        onSortChange={(col, dir) => setSort({ field: col, direction: dir })}
        onSelectLaptop={setSelectedLaptop}
        isLoading={isLoading}
      />

      {/* Audit Centered Modal */}
      {selectedLaptop && (
        <AuditModal
          laptop={selectedLaptop}
          onClose={() => setSelectedLaptop(null)}
        />
      )}
    </div>
  );
}
