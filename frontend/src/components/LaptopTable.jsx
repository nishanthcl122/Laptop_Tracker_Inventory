import React, { useMemo } from 'react';
import { ChevronUp, ChevronDown, Clock, Laptop, MapPin } from 'lucide-react';
import ExcelColumnFilter from './ExcelColumnFilter';

export default function LaptopTable({
  data = [],
  totalCount = 0,
  page = 1,
  pageSize = 25,
  sortBy = 'serialnumber',
  sortDirection = 'asc',
  columnFilters = {},
  onColumnFilterChange = () => {},
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSelectLaptop,
  isLoading = false
}) {
  const items = Array.isArray(data) ? data : [];
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handleSort = (column) => {
    if (sortBy === column) {
      onSortChange(column, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(column, 'asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5 shrink-0 text-blue-600" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-blue-600" />
    );
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

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
      {/* Table Top Summary & Page Size */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          <span>Showing </span>
          <span className="font-semibold tabular-nums text-slate-800">
            {totalCount > 0 ? (page - 1) * pageSize + 1 : 0} – {Math.min(page * pageSize, totalCount)}
          </span>
          <span> of </span>
          <span className="font-semibold text-slate-800">{totalCount.toLocaleString()}</span>
          <span> laptop records</span>
        </div>

        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Subtle Loading Progress Bar */}
      {isLoading && (
        <div className="w-full h-1 bg-blue-50 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-blue-400 via-blue-600 to-cyan-400 animate-pulse" />
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-auto min-h-[300px] bg-slate-50/60 px-3 pb-2">
        <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2 text-left text-xs text-slate-600">
          <thead className="sticky top-0 z-10 bg-slate-100/95 text-slate-600 font-semibold uppercase tracking-[0.08em] text-[10px] backdrop-blur-md shadow-sm">
            <tr >
              {/* Serial No */}
              <th className="h-14 px-4 align-middle rounded-l-xl border-y border-l border-slate-200/80 bg-slate-100/95 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                <div className="flex h-full items-center justify-between gap-3">
                  <span onClick={() => handleSort('serialnumber')} className="inline-flex min-w-0 flex-1 items-center gap-1.5 cursor-pointer">
                    Serial No. {getSortIcon('serialnumber')}
                  </span>
                  <ExcelColumnFilter
                    title="Serial No."
                    columnKey="serialNumber"
                    selectedValues={columnFilters?.serialNumber}
                    options={uniqueSerials}
                    onApply={(vals) => onColumnFilterChange('serialNumber', vals)}
                  />
                </div>
              </th>

              {/* FBR Request */}
              <th className="h-14 px-3 align-middle border-y border-slate-200/80 bg-slate-100/95 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                <div className="flex h-full items-center justify-between gap-3">
                  <span onClick={() => handleSort('fbrrequest')} className="inline-flex min-w-0 flex-1 items-center gap-1.5 cursor-pointer">
                    FBR Request {getSortIcon('fbrrequest')}
                  </span>
                  <ExcelColumnFilter
                    title="FBR Request"
                    columnKey="fbrRequest"
                    selectedValues={columnFilters?.fbrRequest}
                    options={uniqueFbrs}
                    onApply={(vals) => onColumnFilterChange('fbrRequest', vals)}
                  />
                </div>
              </th>

              {/* Location */}
              <th className="h-14 px-3 align-middle border-y border-slate-200/80 bg-slate-100/95 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                <div className="flex h-full items-center justify-between gap-3">
                  <span onClick={() => handleSort('location')} className="inline-flex min-w-0 flex-1 items-center gap-1.5 cursor-pointer">
                    Location {getSortIcon('location')}
                  </span>
                  <ExcelColumnFilter
                    title="Location"
                    columnKey="location"
                    selectedValues={columnFilters?.location}
                    options={uniqueLocations}
                    onApply={(vals) => onColumnFilterChange('location', vals)}
                  />
                </div>
              </th>

              {/* Status */}
              <th className="h-14 px-3 align-middle border-y border-slate-200/80 bg-slate-100/95 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                <div className="flex h-full items-center justify-between gap-3">
                  <span onClick={() => handleSort('status')} className="inline-flex min-w-0 flex-1 items-center gap-1.5 cursor-pointer">
                    Status {getSortIcon('status')}
                  </span>
                  <ExcelColumnFilter
                    title="Status"
                    columnKey="status"
                    selectedValues={columnFilters?.status}
                    options={uniqueStatuses}
                    onApply={(vals) => onColumnFilterChange('status', vals)}
                  />
                </div>
              </th>

              {/* IT SPOC */}
              <th className="h-14 px-3 align-middle border-y border-slate-200/80 bg-slate-100/95 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                <div className="flex h-full items-center justify-between gap-3">
                  <span onClick={() => handleSort('itspoc')} className="inline-flex min-w-0 flex-1 items-center gap-1.5 cursor-pointer">
                    IT SPOC {getSortIcon('itspoc')}
                  </span>
                  <ExcelColumnFilter
                    title="IT SPOC"
                    columnKey="itSpoc"
                    selectedValues={columnFilters?.itSpoc}
                    options={uniqueSpocs}
                    onApply={(vals) => onColumnFilterChange('itSpoc', vals)}
                  />
                </div>
              </th>

              {/* SAP ID */}
              <th className="h-14 px-3 align-middle border-y border-slate-200/80 bg-slate-100/95 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                <div className="flex h-full items-center justify-between gap-3">
                  <span onClick={() => handleSort('sapid')} className="inline-flex min-w-0 flex-1 items-center gap-1.5 cursor-pointer">
                    SAP ID {getSortIcon('sapid')}
                  </span>
                  <ExcelColumnFilter
                    title="SAP ID"
                    columnKey="sapId"
                    selectedValues={columnFilters?.sapId}
                    options={uniqueSapIds}
                    onApply={(vals) => onColumnFilterChange('sapId', vals)}
                  />
                </div>
              </th>

              {/* User Name */}
              <th className="h-14 px-3 align-middle border-y border-slate-200/80 bg-slate-100/95 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                <div className="flex h-full items-center justify-between gap-3">
                  <span onClick={() => handleSort('username')} className="inline-flex min-w-0 flex-1 items-center gap-1.5 cursor-pointer">
                    User Name {getSortIcon('username')}
                  </span>
                  <ExcelColumnFilter
                    title="User Name"
                    columnKey="userName"
                    selectedValues={columnFilters?.userName}
                    options={uniqueUsers}
                    onApply={(vals) => onColumnFilterChange('userName', vals)}
                  />
                </div>
              </th>

              {/* RAS Status */}
              <th className="h-14 px-3 align-middle border-y border-slate-200/80 bg-slate-100/95 hover:bg-slate-200/80 transition-colors whitespace-nowrap">
                <div className="flex h-full items-center justify-between gap-3">
                  <span onClick={() => handleSort('rasstatus')} className="inline-flex min-w-0 flex-1 items-center gap-1.5 cursor-pointer">
                    RAS Status {getSortIcon('rasstatus')}
                  </span>
                  <ExcelColumnFilter
                    title="RAS Status"
                    columnKey="rasStatus"
                    selectedValues={columnFilters?.rasStatus}
                    options={uniqueRasStatuses}
                    onApply={(vals) => onColumnFilterChange('rasStatus', vals)}
                  />
                </div>
              </th>

              {/* Start Date */}
              <th
                onClick={() => handleSort('startdate')}
                className="h-14 px-3 align-middle border-y border-slate-200/80 bg-slate-100/95 cursor-pointer hover:bg-slate-200/80 transition-colors whitespace-nowrap"
              >
                <span className="inline-flex h-full items-center gap-1.5">
                  Start Date {getSortIcon('startdate')}
                </span>
              </th>

              {/* End Date */}
              <th
                onClick={() => handleSort('enddate')}
                className="h-14 px-3 align-middle border-y border-slate-200/80 bg-slate-100/95 cursor-pointer hover:bg-slate-200/80 transition-colors whitespace-nowrap"
              >
                <span className="inline-flex h-full items-center gap-1.5">
                  End Date {getSortIcon('enddate')}
                </span>
              </th>

              {/* Last Working Day */}
              <th
                onClick={() => handleSort('lastworkingday')}
                className="h-14 px-3 align-middle border-y border-slate-200/80 bg-slate-100/95 cursor-pointer hover:bg-slate-200/80 transition-colors whitespace-nowrap"
              >
                <span className="inline-flex h-full items-center gap-1.5">
                  Last Working Day {getSortIcon('lastworkingday')}
                </span>
              </th>

              {/* In Stock Since */}
              <th
                onClick={() => handleSort('instocksince')}
                className="h-14 px-3 align-middle border-y border-slate-200/80 bg-slate-100/95 cursor-pointer hover:bg-slate-200/80 transition-colors whitespace-nowrap"
              >
                <span className="inline-flex h-full items-center gap-1.5">
                  In Stock Since {getSortIcon('instocksince')}
                </span>
              </th>

              {/* Ageing Days */}
              <th className="h-14 px-3 align-middle rounded-r-xl border-y border-r border-slate-200/80 bg-slate-100/95 text-center whitespace-nowrap">
                <span className="inline-flex h-full items-center justify-center">Ageing Days</span>
              </th>
            </tr>
          </thead>

          <tbody className={`transition-opacity duration-150 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
            {items.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={13} className="py-16 px-6">
                  <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 text-blue-500 shadow-sm">
                      <Laptop className="h-8 w-8 stroke-[1.5]" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">No laptop records found</p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      No assets match the current filters. Adjust your search or filters to see more records.
                    </p>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 && isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={`skel-${i}`} className="animate-pulse">
                  {Array.from({ length: 13 }, (_, column) => (
                    <td
                      key={column}
                      className={`py-4 px-3 border-y border-slate-100 bg-white shadow-sm ${
                        column === 0 ? 'rounded-l-xl border-l-2 border-l-blue-400' : ''
                      } ${column === 12 ? 'rounded-r-xl border-r' : ''}`}
                    >
                      <div className={`h-3 rounded-full bg-slate-100 ${column === 0 || column === 6 ? 'w-3/4' : 'w-2/3'}`} />
                    </td>
                  ))}
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
                    onClick={() => onSelectLaptop(lap)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectLaptop(lap);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View audit history for laptop ${lap.serialNumber}`}
                    className={`group cursor-pointer transition-all duration-200 hover:-translate-y-px hover:drop-shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                      lwdRisk ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className={`py-3.5 px-4 align-middle rounded-l-xl border-y border-l-2 border-y-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100 ${
                      isLost
                        ? 'border-l-rose-500'
                        : lwdRisk
                        ? 'border-l-amber-400'
                        : isAllocated
                        ? 'border-l-blue-500'
                        : 'border-l-emerald-500'
                    }`}>
                      <span className="block font-mono text-[13px] font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-700">
                        {lap.serialNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                      <span className="font-mono text-[11px] font-medium text-slate-500">{lap.fbrRequest || '—'}</span>
                    </td>
                    <td className="py-3.5 px-3 align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {lap.location || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
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
                    <td className="py-3.5 px-3 align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                      {lap.itSpoc || lap.itspoc || lap.ITSPOC || '—'}
                    </td>
                    <td className="py-3.5 px-3 align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                      <span className="font-mono text-[11px] font-medium text-slate-500">
                        SAP: {lap.sapId || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                      <span className="font-semibold text-slate-900">{lap.userName || '—'}</span>
                    </td>
                    <td className="py-3.5 px-3 text-center align-middle border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          isRasActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isLost
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : isNotInUhg
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
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
                    <td className="py-3.5 px-3 align-middle whitespace-nowrap font-mono text-[11px] text-slate-500 border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                      {formatDate(lap.startDate)}
                    </td>
                    <td className="py-3.5 px-3 align-middle whitespace-nowrap font-mono text-[11px] text-slate-500 border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                      {formatDate(lap.endDate)}
                    </td>
                    <td className="py-3.5 px-3 align-middle whitespace-nowrap font-mono text-[11px] text-slate-500 border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
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
                    <td className="py-3.5 px-3 align-middle whitespace-nowrap font-mono text-[11px] text-slate-500 border-y border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                      {formatDate(lap.inStockSince)}
                    </td>
                    <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap font-mono text-[11px] rounded-r-xl border-y border-r border-slate-200/80 bg-white shadow-sm transition-colors duration-200 group-hover:bg-blue-50/70 group-hover:border-y-blue-100">
                      {lap.ageingDays !== null && lap.ageingDays !== undefined ? (
                        <span className={`inline-flex min-w-12 items-center justify-center rounded-full border px-2.5 py-1 font-semibold tabular-nums ${
                          lap.ageingDays > 90
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : lap.ageingDays > 30
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}>
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
      <div className="px-5 py-3.5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/80">
        <div>
          <span>Page </span>
          <span className="font-semibold tabular-nums text-slate-800">{page}</span>
          <span> of </span>
          <span className="font-semibold tabular-nums text-slate-800">{totalPages}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            « First
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            ‹ Prev
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Next ›
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Last »
          </button>
        </div>
      </div>
    </div>
  );
}
