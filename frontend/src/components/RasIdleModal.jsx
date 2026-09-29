import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Search, ChevronUp, ChevronDown, UserMinus, RefreshCw, Calendar, MapPin } from 'lucide-react';
import dayjs from 'dayjs';
import { api } from '../services/api';
import ExcelColumnFilter from './ExcelColumnFilter';

export default function RasIdleModal({ onClose, initialLocation = 'ALL', initialFilters = {} }) {
  const initialLoc = initialFilters?.location || (initialLocation !== 'ALL' ? initialLocation : 'ALL');
  const initialWbs = initialFilters?.wbsType || '';
  const initialBilling = initialFilters?.billingClassification || '';
  const initialSrch = initialFilters?.search || '';

  const [employees, setEmployees] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSrch);
  const [location, setLocation] = useState(initialLoc);
  const [wbsType, setWbsType] = useState(initialWbs);
  const [billingClassification, setBillingClassification] = useState(initialBilling);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    setLocation(initialLoc);
    setWbsType(initialWbs);
    setBillingClassification(initialBilling);
    setSearch(initialSrch);
    setColumnFilters({});
    setPage(1);
  }, [initialLoc, initialWbs, initialBilling, initialSrch]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const loadData = useCallback(() => {
    setLoading(true);
    api.getRasIdleEmployees({
      search: search.trim() || undefined,
      location: location === 'ALL' ? undefined : location,
      wbsType: wbsType || undefined,
      billingClassification: billingClassification || undefined,
      page,
      pageSize
    })
      .then(res => {
        setEmployees(res.items || []);
        setTotalCount(res.totalCount || 0);
      })
      .catch(err => {
        console.error('Failed to load RAS Idle workforce', err);
      })
      .finally(() => setLoading(false));
  }, [search, location, wbsType, billingClassification, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-0.5 text-purple-600" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-0.5 text-purple-600" />
    );
  };

  const handleColumnFilterChange = (columnKey, vals) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: vals
    }));
  };

  const handleResetAll = () => {
    setSearch('');
    setLocation('ALL');
    setWbsType('');
    setBillingClassification('');
    setColumnFilters({});
    setSortField(null);
    setPage(1);
  };

  // Derive unique options for Excel-style column filters from loaded dataset
  const uniqueSapIds = useMemo(
    () => Array.from(new Set(employees.map((e) => e.sapId).filter(Boolean))),
    [employees]
  );
  const uniqueNames = useMemo(
    () => Array.from(new Set(employees.map((e) => e.employeeName).filter(Boolean))),
    [employees]
  );
  const uniqueStatuses = useMemo(
    () => Array.from(new Set(employees.map((e) => e.employeeStatus).filter(Boolean))),
    [employees]
  );
  const uniqueWbsTypes = ['Offshore', 'Onsite', 'Nearshore', 'Unknown'];
  const uniqueLocations = useMemo(
    () => Array.from(new Set(employees.map((e) => e.location).filter(Boolean))),
    [employees]
  );

  // Apply client-side column filters and sorting over current dataset
  const displayedEmployees = useMemo(() => {
    let list = [...employees];

    if (columnFilters.sapId && columnFilters.sapId.length > 0) {
      list = list.filter((e) => columnFilters.sapId.includes(e.sapId));
    }
    if (columnFilters.employeeName && columnFilters.employeeName.length > 0) {
      list = list.filter((e) => columnFilters.employeeName.includes(e.employeeName));
    }
    if (columnFilters.employeeStatus && columnFilters.employeeStatus.length > 0) {
      list = list.filter((e) => columnFilters.employeeStatus.includes(e.employeeStatus));
    }
    if (columnFilters.wbsType && columnFilters.wbsType.length > 0) {
      list = list.filter((e) => columnFilters.wbsType.includes(e.wbsType));
    }
    if (columnFilters.location && columnFilters.location.length > 0) {
      list = list.filter((e) => columnFilters.location.includes(e.location));
    }

    if (sortField) {
      list.sort((a, b) => {
        let valA = a[sortField] ?? '';
        let valB = b[sortField] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [employees, columnFilters, sortField, sortDirection]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const parsed = dayjs(dateStr);
    return parsed.isValid() ? parsed.format('DD-MMM-YYYY') : dateStr;
  };

  const getHeaderTitle = () => {
    const parts = [];
    if (wbsType) parts.push(wbsType);
    if (billingClassification) {
      parts.push(billingClassification === 'DeemedUnbillable' ? 'Deemed Unbillable' : billingClassification);
    }
    if (location && location !== 'ALL') parts.push(location);
    if (parts.length > 0) return `RAS Idle Workforce — ${parts.join(' / ')}`;
    return 'RAS Idle Workforce';
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const hasActiveFilters = Boolean(
    search.trim() ||
    (location && location !== 'ALL') ||
    wbsType ||
    billingClassification ||
    Object.values(columnFilters).some((arr) => arr && arr.length > 0)
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 text-white flex items-center justify-between border-b border-purple-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-xs">
              <UserMinus className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {getHeaderTitle()}
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-purple-900/70 text-purple-200 rounded-full border border-purple-700">
                  {totalCount} Unallocated
                </span>
              </div>
              <p className="text-xs text-purple-200/70 mt-0.5">
                Employees in current RAS roster with no active allocated laptop
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search & Reset */}
        <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SAP ID, Name, or Location..."
              className="w-full pl-9 pr-3 h-8.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800 placeholder-slate-400 shadow-2xs"
            />
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3 h-8.5 text-xs text-purple-700 font-semibold bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>

        {/* Table Content with Header Filters */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-100">
            <thead className="bg-slate-100/90 text-slate-700 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-200">
              <tr>
                {/* SAP ID */}
                <th className="py-2.5 px-4 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('sapId')} className="cursor-pointer flex-1">
                      SAP ID {getSortIcon('sapId')}
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

                {/* Employee Name */}
                <th className="py-2.5 px-4 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('employeeName')} className="cursor-pointer flex-1">
                      Employee Name {getSortIcon('employeeName')}
                    </span>
                    <ExcelColumnFilter
                      title="Employee Name"
                      columnKey="employeeName"
                      selectedValues={columnFilters?.employeeName}
                      options={uniqueNames}
                      onApply={(vals) => handleColumnFilterChange('employeeName', vals)}
                    />
                  </div>
                </th>

                {/* Status */}
                <th className="py-2.5 px-4 text-center hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-center space-x-1">
                    <span onClick={() => handleSort('employeeStatus')} className="cursor-pointer">
                      Status {getSortIcon('employeeStatus')}
                    </span>
                    <ExcelColumnFilter
                      title="Status"
                      columnKey="employeeStatus"
                      selectedValues={columnFilters?.employeeStatus}
                      options={uniqueStatuses}
                      onApply={(vals) => handleColumnFilterChange('employeeStatus', vals)}
                    />
                  </div>
                </th>

                {/* WBS Type */}
                <th className="py-2.5 px-4 text-center hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-center space-x-1">
                    <span onClick={() => handleSort('wbsType')} className="cursor-pointer">
                      WBS Type {getSortIcon('wbsType')}
                    </span>
                    <ExcelColumnFilter
                      title="WBS Type"
                      columnKey="wbsType"
                      selectedValues={columnFilters?.wbsType}
                      options={uniqueWbsTypes}
                      onApply={(vals) => handleColumnFilterChange('wbsType', vals)}
                    />
                  </div>
                </th>

                {/* RAS Location (PSA) */}
                <th className="py-2.5 px-4 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('location')} className="cursor-pointer flex-1">
                      RAS Location (PSA) {getSortIcon('location')}
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

                {/* Last Working Day */}
                <th
                  onClick={() => handleSort('lastWorkingDay')}
                  className="py-2.5 px-4 cursor-pointer hover:bg-slate-200/80 transition-colors whitespace-nowrap"
                >
                  Last Working Day {getSortIcon('lastWorkingDay')}
                </th>

                {/* Roster Snapshot */}
                <th
                  onClick={() => handleSort('snapshotDate')}
                  className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-200/80 transition-colors whitespace-nowrap"
                >
                  Roster Snapshot {getSortIcon('snapshotDate')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
                    Loading unallocated RAS employees...
                  </td>
                </tr>
              ) : displayedEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <UserMinus className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    No RAS idle employees found matching criteria.
                  </td>
                </tr>
              ) : (
                displayedEmployees.map((emp) => (
                  <tr
                    key={emp.sapId}
                    className="hover:bg-purple-50/30 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                      {emp.sapId}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {emp.employeeName}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {emp.employeeStatus || 'Active'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {emp.wbsType || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {emp.location || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {emp.lastWorkingDay ? (
                        <span className="inline-flex items-center gap-1 font-mono text-slate-700">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(emp.lastWorkingDay)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                      {formatDate(emp.snapshotDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Pagination & Stats */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            Showing <strong className="text-slate-800">{displayedEmployees.length}</strong> of{' '}
            <strong className="text-slate-800">{totalCount}</strong> idle employees
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Prev
              </button>
              <span className="px-2 py-1 text-slate-600 font-mono">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
