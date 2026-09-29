import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  X,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  Laptop,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import ExcelColumnFilter from './ExcelColumnFilter';
import {
  getDefaultColumnFilters,
  buildLaptopQueryParams
} from '../utils/laptopQuery';

export default function LaptopResultsModal({
  isOpen,
  title,
  subtitle,
  initialFilters = {},
  onClose,
  onSelectLaptop
}) {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Search input with debounce
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Column filters state
  const [columnFilters, setColumnFilters] = useState(() => getDefaultColumnFilters());

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('serialnumber');
  const [sortDirection, setSortDirection] = useState('asc');

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when modal opens or initial filters change
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setSearchTerm('');
      setDebouncedSearch('');
      setColumnFilters(getDefaultColumnFilters());
      setSortBy('serialnumber');
      setSortDirection('asc');
    }
  }, [isOpen, initialFilters]);

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load laptops data combining initialFilters + debouncedSearch + columnFilters
  const loadData = useCallback(() => {
    if (!isOpen) return;
    setLoading(true);

    const mergedFilters = {
      ...initialFilters,
      search: debouncedSearch.trim() || undefined
    };

    const params = buildLaptopQueryParams(
      mergedFilters,
      columnFilters,
      { page, pageSize },
      { field: sortBy, direction: sortDirection }
    );

    api.getLaptops(params)
      .then((res) => {
        setItems(res.items || []);
        setTotalCount(res.totalCount || 0);
      })
      .catch((err) => {
        console.error('Failed to load modal laptops', err);
      })
      .finally(() => setLoading(false));
  }, [isOpen, initialFilters, debouncedSearch, columnFilters, page, pageSize, sortBy, sortDirection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-0.5 text-blue-600" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-0.5 text-blue-600" />
    );
  };

  const handleColumnFilterChange = (columnKey, vals) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: vals
    }));
    setPage(1);
  };

  const handleExport = () => {
    const mergedFilters = {
      ...initialFilters,
      search: debouncedSearch.trim() || undefined
    };
    const params = buildLaptopQueryParams(mergedFilters, columnFilters, { page: 1, pageSize: 10000 });
    const url = api.exportLaptopsUrl(params);
    window.open(url, '_blank');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${String(day).padStart(2, '0')}-${months[monthIndex]}-${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const isLwdApproaching = (lwdStr, status) => {
    if (!lwdStr || (status !== 'Allocated' && status !== 'ALLOCATED')) return false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lwd = new Date(lwdStr);
      const diffDays = Math.ceil((lwd - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 15;
    } catch {
      return false;
    }
  };

  // Derive unique options for Excel-style column filters from dataset
  const uniqueSerials = useMemo(() => items.map((l) => l.serialNumber).filter(Boolean), [items]);
  const uniqueFbrs = useMemo(() => items.map((l) => l.fbrRequest).filter(Boolean), [items]);
  const uniqueLocations = useMemo(() => {
    const defaultLocs = ['Bangalore', 'Delhi', 'Hyderabad', 'Mumbai', 'Noida', 'Gurgaon', 'Pune', 'Chennai', 'Kolkata'];
    const currentLocs = items.map((l) => l.location).filter(Boolean);
    return Array.from(new Set([...defaultLocs, ...currentLocs]));
  }, [items]);
  const uniqueStatuses = ['Allocated', 'In Stock'];
  const uniqueSpocs = useMemo(() => items.map((l) => l.itSpoc).filter(Boolean), [items]);
  const uniqueSapIds = useMemo(() => items.map((l) => l.sapId).filter(Boolean), [items]);
  const uniqueUsers = useMemo(() => items.map((l) => l.userName).filter(Boolean), [items]);
  const uniqueRasStatuses = ['ACTIVE', 'LOST', 'NOT_IN_UHG', 'UNKNOWN'];

  if (!isOpen) return null;

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  {title || 'Filtered Laptops'}
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-800 text-slate-200 rounded border border-slate-700">
                  {totalCount.toLocaleString()} {totalCount === 1 ? 'laptop' : 'laptops'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {subtitle || 'Filtered asset results • Click any row to view lifecycle audit'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Export this filtered view to Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Debounced Search & Pagination Size */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search serial, user, SAP ID, location, FBR, SPOC..."
              className="w-full pl-9 pr-3 h-8.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs text-slate-500">
            <span>
              Showing <b className="text-slate-800">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</b> to{' '}
              <b className="text-slate-800">{Math.min(page * pageSize, totalCount)}</b> of{' '}
              <b className="text-slate-800">{totalCount.toLocaleString()}</b>
            </span>

            <div className="flex items-center space-x-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {loading && (
          <div className="w-full h-0.5 bg-blue-100 overflow-hidden">
            <div className="w-full h-full bg-blue-600 animate-pulse" />
          </div>
        )}

        {/* Table Content with Header Filtering */}
        <div className="flex-1 overflow-auto bg-white min-h-[320px]">
          <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10">
              <tr>
                {/* Serial No */}
                <th className="py-2.5 px-3 hover:bg-slate-200 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('serialnumber')} className="cursor-pointer flex-1">
                      Serial No. {getSortIcon('serialnumber')}
                    </span>
                    <ExcelColumnFilter
                      title="Serial No."
                      columnKey="serialNumber"
                      selectedValues={columnFilters?.serialNumber}
                      options={uniqueSerials}
                      onApply={(vals) => handleColumnFilterChange('serialNumber', vals)}
                    />
                  </div>
                </th>

                {/* FBR Request */}
                <th className="py-2.5 px-3 hover:bg-slate-200 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('fbrrequest')} className="cursor-pointer flex-1">
                      FBR Request {getSortIcon('fbrrequest')}
                    </span>
                    <ExcelColumnFilter
                      title="FBR Request"
                      columnKey="fbrRequest"
                      selectedValues={columnFilters?.fbrRequest}
                      options={uniqueFbrs}
                      onApply={(vals) => handleColumnFilterChange('fbrRequest', vals)}
                    />
                  </div>
                </th>

                {/* Location */}
                <th className="py-2.5 px-3 hover:bg-slate-200 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('location')} className="cursor-pointer flex-1">
                      Location {getSortIcon('location')}
                    </span>
                    <ExcelColumnFilter
                      title="Location"
                      columnKey="location"
                      selectedValues={columnFilters?.location}
                      options={uniqueLocations}
                      onApply={(vals) => handleColumnFilterChange('location', vals)}
                    />
                  </div>
                </th>

                {/* Status */}
                <th className="py-2.5 px-3 hover:bg-slate-200 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('status')} className="cursor-pointer flex-1">
                      Status {getSortIcon('status')}
                    </span>
                    <ExcelColumnFilter
                      title="Status"
                      columnKey="status"
                      selectedValues={columnFilters?.status}
                      options={uniqueStatuses}
                      onApply={(vals) => handleColumnFilterChange('status', vals)}
                    />
                  </div>
                </th>

                {/* IT SPOC */}
                <th className="py-2.5 px-3 hover:bg-slate-200 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('itspoc')} className="cursor-pointer flex-1">
                      IT SPOC {getSortIcon('itspoc')}
                    </span>
                    <ExcelColumnFilter
                      title="IT SPOC"
                      columnKey="itSpoc"
                      selectedValues={columnFilters?.itSpoc}
                      options={uniqueSpocs}
                      onApply={(vals) => handleColumnFilterChange('itSpoc', vals)}
                    />
                  </div>
                </th>

                {/* SAP ID */}
                <th className="py-2.5 px-3 hover:bg-slate-200 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('sapid')} className="cursor-pointer flex-1">
                      SAP ID {getSortIcon('sapid')}
                    </span>
                    <ExcelColumnFilter
                      title="SAP ID"
                      columnKey="sapId"
                      selectedValues={columnFilters?.sapId}
                      options={uniqueSapIds}
                      onApply={(vals) => handleColumnFilterChange('sapId', vals)}
                    />
                  </div>
                </th>

                {/* User Name */}
                <th className="py-2.5 px-3 hover:bg-slate-200 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('username')} className="cursor-pointer flex-1">
                      User Name {getSortIcon('username')}
                    </span>
                    <ExcelColumnFilter
                      title="User Name"
                      columnKey="userName"
                      selectedValues={columnFilters?.userName}
                      options={uniqueUsers}
                      onApply={(vals) => handleColumnFilterChange('userName', vals)}
                    />
                  </div>
                </th>

                {/* RAS Status */}
                <th className="py-2.5 px-3 text-center hover:bg-slate-200 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-center space-x-1">
                    <span onClick={() => handleSort('rasstatus')} className="cursor-pointer">
                      RAS Status {getSortIcon('rasstatus')}
                    </span>
                    <ExcelColumnFilter
                      title="RAS Status"
                      columnKey="rasStatus"
                      selectedValues={columnFilters?.rasStatus}
                      options={uniqueRasStatuses}
                      onApply={(vals) => handleColumnFilterChange('rasStatus', vals)}
                    />
                  </div>
                </th>

                {/* Start Date */}
                <th
                  onClick={() => handleSort('startdate')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
                >
                  Start Date {getSortIcon('startdate')}
                </th>

                {/* End Date */}
                <th
                  onClick={() => handleSort('enddate')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
                >
                  End Date {getSortIcon('enddate')}
                </th>

                {/* Last Working Day */}
                <th
                  onClick={() => handleSort('lastworkingday')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
                >
                  Last Working Day {getSortIcon('lastworkingday')}
                </th>

                {/* In Stock Since */}
                <th
                  onClick={() => handleSort('instocksince')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap"
                >
                  In Stock Since {getSortIcon('instocksince')}
                </th>

                {/* Ageing Days */}
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Ageing Days</th>
              </tr>
            </thead>

            <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 ${loading ? 'opacity-60' : 'opacity-100'}`}>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    No records found for this category and filter selection.
                  </td>
                </tr>
              ) : items.length === 0 && loading ? (
                // Clean skeleton rows
                [...Array(5)].map((_, i) => (
                  <tr key={`modal-skel-${i}`} className="animate-pulse">
                    <td colSpan={13} className="py-3 px-3">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : (
                items.map((lap) => {
                  const isAllocated = lap.status === 'Allocated' || lap.status === 'ALLOCATED';
                  const rasStatusNorm = (lap.rasStatus || '').toUpperCase();
                  const isLost = lap.isLost || rasStatusNorm === 'LOST';
                  const isNotInUhg = rasStatusNorm === 'NOT_IN_UHG' || rasStatusNorm === 'NOT IN UHG';
                  const isRasActive = rasStatusNorm === 'ACTIVE';
                  const lwdRisk = isLwdApproaching(lap.lastWorkingDay, lap.status);

                  return (
                    <tr
                      key={lap.serialNumber}
                      onClick={() => onSelectLaptop && onSelectLaptop(lap)}
                      className={`hover:bg-blue-50/60 cursor-pointer transition-colors group ${
                        lwdRisk ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap font-mono text-xs group-hover:text-blue-600 transition-colors">
                        {lap.serialNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                        {lap.fbrRequest || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {lap.location || '—'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                            isAllocated
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isAllocated ? 'Allocated' : 'In Stock'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-medium">
                        {lap.itSpoc || lap.itspoc || lap.ITSPOC || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                        {lap.sapId || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-800 whitespace-nowrap font-medium">
                        {lap.userName || '—'}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isRasActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isLost
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isNotInUhg
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isLost
                            ? 'Lost'
                            : isNotInUhg
                            ? 'Not in UHG'
                            : isRasActive
                            ? 'Active'
                            : lap.rasStatus || '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                        {formatDate(lap.startDate)}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                        {formatDate(lap.endDate)}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                        {lwdRisk ? (
                          <span
                            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                            title="LWD approaching within 15 days"
                          >
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>{formatDate(lap.lastWorkingDay)}</span>
                          </span>
                        ) : (
                          <span>{formatDate(lap.lastWorkingDay)}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                        {formatDate(lap.inStockSince)}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap font-mono text-[11px]">
                        {lap.ageingDays !== null && lap.ageingDays !== undefined ? (
                          <span className={lap.ageingDays > 90 ? 'text-amber-700 font-bold' : 'text-slate-700'}>
                            {lap.ageingDays} d
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
          <div>
            <span>Page </span>
            <span className="font-semibold text-slate-800">{page}</span>
            <span> of </span>
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              « First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              ‹ Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Next ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Last »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
