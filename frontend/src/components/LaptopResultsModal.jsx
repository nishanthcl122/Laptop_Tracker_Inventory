import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  X,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  Laptop,
  Clock,
  MapPin
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
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-[96vw] max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-blue-100 shadow-inner">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2.5">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  {title || 'Filtered Laptops'}
                </h2>
                <span className="px-2.5 py-1 text-xs font-semibold tabular-nums bg-blue-400/15 text-blue-100 rounded-full border border-blue-200/25 shadow-sm">
                  {totalCount.toLocaleString()} {totalCount === 1 ? 'laptop' : 'laptops'}
                </span>
              </div>
              <p className="text-xs text-slate-300/80 mt-1">
                {subtitle || 'Filtered asset results • Click any row to view lifecycle audit'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg border border-white/15 transition-all duration-200 cursor-pointer"
              title="Export this filtered view to Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Debounced Search & Pagination Size */}
        <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search serial, user, SAP ID, location, FBR, SPOC..."
              className="w-full pl-9 pr-3 h-9 text-xs bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-800 placeholder-slate-400 transition-shadow"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-slate-500">
            <span>
              Showing <b className="text-slate-800">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</b> to{' '}
              <b className="text-slate-800">{Math.min(page * pageSize, totalCount)}</b> of{' '}
              <b className="text-slate-800">{totalCount.toLocaleString()}</b>
            </span>

            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
          <div className="w-full h-1 bg-blue-50 overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-blue-400 via-blue-600 to-cyan-400 animate-pulse" />
          </div>
        )}

        {/* Table Content with Header Filtering */}
        <div className="flex-1 overflow-auto bg-slate-50/60 min-h-[320px] px-3 pb-2">
          <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2 text-left text-xs text-slate-600">
            <thead className="sticky top-0 z-10 bg-slate-100/90 text-slate-600 font-semibold uppercase tracking-wider text-[10px] backdrop-blur-md">
              <tr>
                {/* Asset identity */}
                <th className="py-3 px-4 rounded-l-xl border-y border-l border-slate-200/80 bg-slate-100/90 min-w-[190px]">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
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
                    <div className="flex items-center justify-between gap-2 border-t border-slate-200/80 pt-2">
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
                  </div>
                </th>

                {/* Location */}
                <th className="py-3 px-3 border-y border-slate-200/80 bg-slate-100/90 whitespace-nowrap">
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
                <th className="py-3 px-3 border-y border-slate-200/80 bg-slate-100/90 whitespace-nowrap">
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

                {/* User details */}
                <th className="py-3 px-3 border-y border-slate-200/80 bg-slate-100/90 min-w-[170px]">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
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
                      <div className="flex items-center justify-between gap-2 border-t border-slate-200/80 pt-2">
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
                    </div>
                  </div>
                </th>

                {/* IT SPOC */}
                <th className="py-3 px-3 border-y border-slate-200/80 bg-slate-100/90 whitespace-nowrap">
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

                {/* RAS Status */}
                <th className="py-3 px-3 text-center border-y border-slate-200/80 bg-slate-100/90 whitespace-nowrap">
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
                  className="py-3 px-3 cursor-pointer border-y border-slate-200/80 bg-slate-100/90 whitespace-nowrap hover:bg-slate-200/90 transition-colors"
                >
                  Start Date {getSortIcon('startdate')}
                </th>

                {/* End Date */}
                <th
                  onClick={() => handleSort('enddate')}
                  className="py-3 px-3 cursor-pointer border-y border-slate-200/80 bg-slate-100/90 whitespace-nowrap hover:bg-slate-200/90 transition-colors"
                >
                  End Date {getSortIcon('enddate')}
                </th>

                {/* Last Working Day */}
                <th
                  onClick={() => handleSort('lastworkingday')}
                  className="py-3 px-3 cursor-pointer border-y border-slate-200/80 bg-slate-100/90 whitespace-nowrap hover:bg-slate-200/90 transition-colors"
                >
                  Last Working Day {getSortIcon('lastworkingday')}
                </th>

                {/* In Stock Since */}
                <th
                  onClick={() => handleSort('instocksince')}
                  className="py-3 px-3 cursor-pointer border-y border-slate-200/80 bg-slate-100/90 whitespace-nowrap hover:bg-slate-200/90 transition-colors"
                >
                  In Stock Since {getSortIcon('instocksince')}
                </th>

                {/* Ageing Days */}
                <th className="py-3 px-3 rounded-r-xl border-y border-r border-slate-200/80 bg-slate-100/90 text-center whitespace-nowrap">Ageing Days</th>
              </tr>
            </thead>

            <tbody className={`transition-opacity duration-150 ${loading ? 'opacity-60' : 'opacity-100'}`}>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={11} className="py-16 px-6">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-500">
                        <Laptop className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">No assets found</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500">
                        No laptops match this category and filter selection. Try adjusting your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 && loading ? (
                // Clean skeleton rows
                [...Array(5)].map((_, i) => (
                  <tr key={`modal-skel-${i}`} className="animate-pulse">
                    <td colSpan={11} className="py-1 px-1">
                      <div className="h-12 bg-white border border-slate-100 shadow-sm rounded-xl animate-pulse" />
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
                      className="group cursor-pointer transition-all duration-200 hover:-translate-y-px hover:drop-shadow-md"
                    >
                      <td className={`py-3 px-4 align-middle rounded-l-xl border-y border-l-2 border-y-slate-200/80 border-r-0 bg-white shadow-sm transition-all duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100 ${
                        isLost
                          ? 'border-l-rose-500'
                          : lwdRisk
                          ? 'border-l-amber-400'
                          : isAllocated
                          ? 'border-l-blue-500'
                          : 'border-l-emerald-500'
                      }`}>
                        <div className="font-mono text-[13px] font-bold tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
                          {lap.serialNumber}
                        </div>
                        <div className="mt-1 text-[10px] font-medium text-slate-400">
                          FBR <span className="font-mono text-slate-500">{lap.fbrRequest || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle border-y border-y-slate-200/80 bg-white shadow-sm transition-all duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {lap.location || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle border-y border-y-slate-200/80 bg-white shadow-sm transition-all duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            isAllocated
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isAllocated ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                          {isAllocated ? 'Allocated' : 'In Stock'}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle border-y border-y-slate-200/80 bg-white shadow-sm transition-all duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                        <div className="font-medium text-slate-800">{lap.userName || '—'}</div>
                        <div className="mt-1 font-mono text-[10px] text-slate-400">
                          SAP ID <span className="text-slate-500">{lap.sapId || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle whitespace-nowrap border-y border-y-slate-200/80 bg-white shadow-sm transition-all duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                        <span className="font-medium text-slate-700">
                          {lap.itSpoc || lap.itspoc || lap.ITSPOC || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center align-middle whitespace-nowrap border-y border-y-slate-200/80 bg-white shadow-sm transition-all duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isRasActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isLost
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : isNotInUhg
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isRasActive ? 'bg-emerald-500' : isLost ? 'bg-rose-500' : isNotInUhg ? 'bg-amber-500' : 'bg-slate-400'
                          }`} />
                          {isLost
                            ? 'Lost'
                            : isNotInUhg
                            ? 'Not in UHG'
                            : isRasActive
                            ? 'Active'
                            : lap.rasStatus || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-500 whitespace-nowrap font-mono text-[11px] border-y border-y-slate-200/80 bg-white shadow-sm transition-all duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                        {formatDate(lap.startDate)}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-500 whitespace-nowrap font-mono text-[11px] border-y border-y-slate-200/80 bg-white shadow-sm transition-all duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                        {formatDate(lap.endDate)}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-500 whitespace-nowrap font-mono text-[11px] border-y border-y-slate-200/80 bg-white shadow-sm transition-all duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                        {lwdRisk ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 shadow-sm"
                            title="LWD approaching within 15 days"
                          >
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>{formatDate(lap.lastWorkingDay)}</span>
                          </span>
                        ) : (
                          <span>{formatDate(lap.lastWorkingDay)}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-500 whitespace-nowrap font-mono text-[11px] border-y border-y-slate-200/80 bg-white shadow-sm transition-all duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                        {formatDate(lap.inStockSince)}
                      </td>
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap font-mono text-[11px] rounded-r-xl border-y border-r border-y-slate-200/80 border-r-slate-200/80 bg-white shadow-sm transition-all duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100 group-hover:border-r-blue-100">
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
        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
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
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              « First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              ‹ Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Next ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Last »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
