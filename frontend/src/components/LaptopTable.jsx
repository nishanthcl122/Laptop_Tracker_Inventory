import React, { useMemo } from 'react';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';
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
      <ChevronUp className="w-3.5 h-3.5 inline ml-0.5 text-blue-600" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-0.5 text-blue-600" />
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
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden flex flex-col relative">
      {/* Table Top Summary & Page Size */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          <span>Showing </span>
          <span className="font-semibold text-slate-800">
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
            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Subtle Loading Progress Bar */}
      {isLoading && (
        <div className="w-full h-0.5 bg-blue-100 overflow-hidden">
          <div className="w-full h-full bg-blue-600 animate-pulse" />
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-200">
          <thead className="bg-slate-100/80 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              {/* Serial No */}
              <th className="py-2.5 px-3 hover:bg-slate-200/70 transition-colors whitespace-nowrap">
                <div className="flex items-center justify-between">
                  <span onClick={() => handleSort('serialnumber')} className="cursor-pointer flex-1">
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
              <th className="py-2.5 px-3 hover:bg-slate-200/70 transition-colors whitespace-nowrap">
                <div className="flex items-center justify-between">
                  <span onClick={() => handleSort('fbrrequest')} className="cursor-pointer flex-1">
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
              <th className="py-2.5 px-3 hover:bg-slate-200/70 transition-colors whitespace-nowrap">
                <div className="flex items-center justify-between">
                  <span onClick={() => handleSort('location')} className="cursor-pointer flex-1">
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
              <th className="py-2.5 px-3 hover:bg-slate-200/70 transition-colors whitespace-nowrap">
                <div className="flex items-center justify-between">
                  <span onClick={() => handleSort('status')} className="cursor-pointer flex-1">
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
              <th className="py-2.5 px-3 hover:bg-slate-200/70 transition-colors whitespace-nowrap">
                <div className="flex items-center justify-between">
                  <span onClick={() => handleSort('itspoc')} className="cursor-pointer flex-1">
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
              <th className="py-2.5 px-3 hover:bg-slate-200/70 transition-colors whitespace-nowrap">
                <div className="flex items-center justify-between">
                  <span onClick={() => handleSort('sapid')} className="cursor-pointer flex-1">
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
              <th className="py-2.5 px-3 hover:bg-slate-200/70 transition-colors whitespace-nowrap">
                <div className="flex items-center justify-between">
                  <span onClick={() => handleSort('username')} className="cursor-pointer flex-1">
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
              <th className="py-2.5 px-3 hover:bg-slate-200/70 transition-colors whitespace-nowrap text-center">
                <div className="flex items-center justify-center space-x-1">
                  <span onClick={() => handleSort('rasstatus')} className="cursor-pointer">
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
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                Start Date {getSortIcon('startdate')}
              </th>

              {/* End Date */}
              <th
                onClick={() => handleSort('enddate')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                End Date {getSortIcon('enddate')}
              </th>

              {/* Last Working Day */}
              <th
                onClick={() => handleSort('lastworkingday')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                Last Working Day {getSortIcon('lastworkingday')}
              </th>

              {/* In Stock Since */}
              <th
                onClick={() => handleSort('instocksince')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                In Stock Since {getSortIcon('instocksince')}
              </th>

              {/* Ageing Days */}
              <th className="py-2.5 px-3 text-center whitespace-nowrap">Ageing Days</th>
            </tr>
          </thead>

          <tbody className={`divide-y divide-slate-100 bg-white transition-opacity duration-150 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
            {items.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-slate-400">
                  No laptop records found matching these filters.
                </td>
              </tr>
            ) : items.length === 0 && isLoading ? (
              // Clean non-jumping skeleton rows
              [...Array(5)].map((_, i) => (
                <tr key={`skel-${i}`} className="animate-pulse">
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
                    className={`hover:bg-blue-50/60 focus:outline-none focus-visible:bg-blue-50/80 focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer transition-colors group ${
                      lwdRisk ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap font-mono text-xs group-hover:text-blue-600 transition-colors">
                      {lap.serialNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                      {lap.fbrRequest || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {lap.location || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
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
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                      {lap.itSpoc || lap.itspoc || lap.ITSPOC || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                      {lap.sapId || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap font-medium">
                      {lap.userName || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
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
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                      {formatDate(lap.startDate)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                      {formatDate(lap.endDate)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
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
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                      {formatDate(lap.inStockSince)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-[11px]">
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
      <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
        <div>
          <span>Page </span>
          <span className="font-semibold text-slate-800">{page}</span>
          <span> of </span>
          <span className="font-semibold text-slate-800">{totalPages}</span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            « First
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            ‹ Prev
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Next ›
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Last »
          </button>
        </div>
      </div>
    </div>
  );
}
