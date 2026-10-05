import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  ChevronUp,
  ChevronDown,
  UserMinus,
  Calendar,
  MapPin,
  Users,
  Globe2,
  Building2
} from 'lucide-react';
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
  const workforceStats = displayedEmployees.reduce((stats, employee) => {
    const type = (employee.wbsType || '').toLowerCase();
    if (type === 'offshore') stats.offshore += 1;
    if (type === 'onsite') stats.onsite += 1;
    if (type === 'nearshore') stats.nearshore += 1;
    return stats;
  }, { offshore: 0, onsite: 0, nearshore: 0 });
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
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950 via-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-400/15 border border-purple-200/20 flex items-center justify-center text-purple-200 shadow-inner">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2.5">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  {getHeaderTitle()}
                </h2>
                <span className="px-2.5 py-1 text-xs font-semibold tabular-nums bg-purple-400/15 text-purple-100 rounded-full border border-purple-200/25 shadow-sm">
                  {totalCount.toLocaleString()} Unallocated
                </span>
              </div>
              <p className="text-xs text-slate-300/80 mt-1">
                Employees in current RAS dump with no active allocated laptop
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workforce summary from the currently displayed dataset */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-6 py-3 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 shadow-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Users className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total employees</span>
              <span className="mt-0.5 block text-base font-bold leading-none tabular-nums text-slate-800">{displayedEmployees.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-purple-100 bg-purple-50/60 px-3.5 py-2.5 shadow-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Globe2 className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-purple-500">Offshore</span>
              <span className="mt-0.5 block text-base font-bold leading-none tabular-nums text-purple-900">{workforceStats.offshore}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 shadow-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-blue-500">Onsite</span>
              <span className="mt-0.5 block text-base font-bold leading-none tabular-nums text-blue-900">{workforceStats.onsite}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-2.5 shadow-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Globe2 className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Nearshore</span>
              <span className="mt-0.5 block text-base font-bold leading-none tabular-nums text-emerald-900">{workforceStats.nearshore}</span>
            </span>
          </div>
        </div>

        {/* Toolbar: Search & Reset */}
        <div className="px-6 py-3 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SAP ID, Name, or Location..."
              className="w-full pl-9 pr-3 h-9 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 text-slate-800 placeholder-slate-400 shadow-sm transition-shadow"
            />
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3.5 h-9 text-xs text-purple-700 font-semibold bg-white border border-purple-200 hover:bg-purple-50 rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>

        {/* Table Content with Header Filters */}
        <div className="flex-1 overflow-auto bg-slate-50/60 px-3 pb-2">
          <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2 text-left text-xs text-slate-600">
            <thead className="sticky top-0 z-10 bg-slate-100/90 text-slate-600 font-semibold uppercase tracking-wider text-[10px] backdrop-blur-md">
              <tr>
                {/* SAP ID */}
                <th className="py-3 px-4 rounded-l-xl border-y border-l border-slate-200/80 bg-slate-100/90 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
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
                <th className="py-3 px-4 border-y border-slate-200/80 bg-slate-100/90 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
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
                <th className="py-3 px-4 text-center border-y border-slate-200/80 bg-slate-100/90 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
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
                <th className="py-3 px-4 text-center border-y border-slate-200/80 bg-slate-100/90 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
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
                <th className="py-3 px-4 border-y border-slate-200/80 bg-slate-100/90 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
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
                  className="py-3 px-4 border-y border-slate-200/80 bg-slate-100/90 cursor-pointer hover:bg-slate-200/80 transition-colors whitespace-nowrap"
                >
                  Last Working Day {getSortIcon('lastWorkingDay')}
                </th>

                {/* Roster Snapshot */}
                <th
                  onClick={() => handleSort('snapshotDate')}
                  className="py-3 px-4 rounded-r-xl border-y border-r border-slate-200/80 bg-slate-100/90 text-right cursor-pointer hover:bg-slate-200/80 transition-colors whitespace-nowrap"
                >
                  Roster Snapshot {getSortIcon('snapshotDate')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, index) => (
                  <tr key={`ras-idle-skeleton-${index}`} className="animate-pulse">
                    {[0, 1, 2, 3, 4, 5, 6].map((column) => (
                      <td
                        key={column}
                        className={`py-4 px-4 border-y border-slate-100 bg-white shadow-sm ${
                          column === 0 ? 'rounded-l-xl border-l-2 border-l-purple-400' : ''
                        } ${column === 6 ? 'rounded-r-xl border-r' : ''}`}
                      >
                        <div className={`h-3 rounded-full bg-slate-100 ${column === 1 ? 'w-3/4' : 'w-2/3'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayedEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 px-6">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-slate-50 text-purple-500 shadow-sm">
                        <UserMinus className="h-8 w-8 stroke-[1.5]" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">No idle employees found</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500">
                        No workforce records match the current search and filters. Try adjusting your criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedEmployees.map((emp) => {
                  const wbsType = (emp.wbsType || '').toLowerCase();
                  const wbsStyles = wbsType === 'offshore'
                    ? 'border-purple-200 bg-purple-50 text-purple-700'
                    : wbsType === 'onsite'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : wbsType === 'nearshore'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-100 text-slate-600';
                  const status = (emp.employeeStatus || 'Active').toLowerCase();
                  const statusStyles = status === 'active'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : status.includes('resign') || status.includes('separat')
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-100 text-slate-700';
                  const accentStyles = wbsType === 'offshore'
                    ? 'border-l-purple-500'
                    : wbsType === 'onsite'
                    ? 'border-l-blue-500'
                    : wbsType === 'nearshore'
                    ? 'border-l-emerald-500'
                    : 'border-l-slate-300';

                  return (
                  <tr
                    key={emp.sapId}
                    className="group transition-all duration-200 hover:-translate-y-px hover:drop-shadow-md"
                  >
                    <td className={`py-3.5 px-4 align-middle rounded-l-xl border-y border-l-2 border-y-slate-200/80 ${accentStyles} bg-white shadow-sm transition-colors duration-200 group-hover:bg-purple-50/70 group-hover:border-y-purple-100`}>
                      <div className="font-mono text-[13px] font-bold tracking-tight text-slate-900 group-hover:text-purple-800">
                        SAP {emp.sapId}
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-slate-400">Workforce record</div>
                    </td>
                    <td className="py-3.5 px-4 align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-purple-50/70 group-hover:border-y-purple-100">
                      <div className="font-semibold text-slate-900">{emp.employeeName || '—'}</div>
                      <div className="mt-1 text-[10px] text-slate-400">Employee</div>
                    </td>
                    <td className="py-3.5 px-4 text-center align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-purple-50/70 group-hover:border-y-purple-100">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusStyles}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : status.includes('resign') || status.includes('separat') ? 'bg-rose-500' : 'bg-slate-400'}`} />
                        {emp.employeeStatus || 'Active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-purple-50/70 group-hover:border-y-purple-100">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${wbsStyles}`}>
                        {emp.wbsType || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-purple-50/70 group-hover:border-y-purple-100">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-purple-500" />
                        {emp.location || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-purple-50/70 group-hover:border-y-purple-100">
                      {emp.lastWorkingDay ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(emp.lastWorkingDay)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right align-middle rounded-r-xl border-y border-r border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-purple-50/70 group-hover:border-y-purple-100">
                      <span className="inline-flex items-center justify-end gap-1.5 font-mono text-[11px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(emp.snapshotDate)}
                      </span>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Pagination & Stats */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div>
            Showing <strong className="text-slate-800">{displayedEmployees.length}</strong> of{' '}
            <strong className="text-slate-800">{totalCount}</strong> idle employees
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-purple-200 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Prev
              </button>
              <span className="px-2.5 py-1.5 rounded-lg text-slate-600 font-mono tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-purple-200 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
