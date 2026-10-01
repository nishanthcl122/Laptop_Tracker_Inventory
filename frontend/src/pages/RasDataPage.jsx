import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, RotateCcw, Upload, Users, Calendar, X, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import ExcelColumnFilter from '../components/ExcelColumnFilter';

const SECTION_MAPPINGS = [
  {
    title: 'Employee Details',
    keys: [
      'SAPId', 'SAP ID', 'Employee Code', 'EmployeeCode',
      'Employee Name', 'EmployeeName', 'Email', 'Email ID',
      'Band', 'SubBand', 'Sub Band',
      'Role', 'Role Name', 'RoleName',
      'Designation', 'Department', 'Job Name', 'JobName'
    ]
  },
  {
    title: 'Project Details',
    keys: [
      'Project Code', 'ProjectCode',
      'Project Name', 'ProjectName',
      'Project Category', 'ProjectCategory', 'Project Category Name', 'ProjectCategoryName',
      'Project DU Code', 'ProjectDUCode', 'Project DU Name', 'ProjectDUName',
      'Project SDU Code', 'ProjectSDUCode', 'Project SDU Name', 'ProjectSDUName',
      'Project LOB Code', 'ProjectLOBCode', 'Project LOB Name', 'ProjectLOBName',
      'Project Super LOB Code', 'ProjectSuperLOBCode', 'Project Super LOB Name', 'ProjectSuperLOBName',
      'Project Type Code', 'ProjectTypeCode', 'Project Type Name', 'ProjectTypeName',
      'Project Status', 'ProjectStatus'
    ]
  },
  {
    title: 'Dates',
    keys: [
      'Joining Date', 'JoiningDate',
      'Start Date', 'StartDate',
      'End Date', 'EndDate',
      'Last Working Day', 'LastWorkingDay', 'LWD',
      'Requested Date', 'RequestedDate',
      'Snapshot Date', 'SnapshotDate'
    ]
  },
  {
    title: 'Organization',
    keys: [
      'Company Code', 'CompanyCode', 'Company Name', 'CompanyName',
      'Business Unit', 'BusinessUnit', 'Vertical', 'Practice',
      'Division', 'Cost Center', 'CostCenter'
    ]
  },
  {
    title: 'Management',
    keys: [
      'Project Manager Code', 'ProjectManagerCode',
      'Project Manager Name', 'ProjectManagerName',
      'Reporting Manager Code', 'ReportingManagerCode',
      'Reporting Manager Name', 'ReportingManagerName',
      'Requested By', 'RequestedBy',
      'IT SPOC', 'ITSPOC'
    ]
  },
  {
    title: 'Location & Work Site',
    keys: [
      'PSA', 'Location', 'City', 'State Name', 'StateName', 'State',
      'Country', 'Zip Code', 'ZipCode',
      'Work Site Address 1', 'WorkSiteAddress1',
      'Work Site Address 2', 'WorkSiteAddress2'
    ]
  },
  {
    title: 'Work Details',
    keys: [
      'Employee Status', 'EmployeeStatus',
      'Assignment Status', 'AssignmentStatus',
      'Billability', 'FTE/Contractor', 'Employment Type',
      'WBS Code', 'WBSCode', 'WBS Level', 'WBSLevel',
      'WBS Plant Code', 'WBSPlantCode', 'WBS Plant Name', 'WBSPlantName',
      'WBS Type', 'WBSType', 'Project Element Description', 'ProjectElementDescription'
    ]
  },
  {
    title: 'Administrative Data',
    keys: [
      'BatchId', 'Batch ID',
      'SnapshotDate', 'Snapshot Date',
      'CreatedAt', 'Created At',
      'UpdatedAt', 'Updated At',
      'RowFingerprint', 'Row Fingerprint',
      'RasRecordId', 'Record ID'
    ]
  }
];

export default function RasDataPage({ onNavigateImport }) {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('ALL');
  const [sortBy, setSortBy] = useState('sapid');
  const [sortDirection, setSortDirection] = useState('asc');
  const [columnFilters, setColumnFilters] = useState({
    location: [],
    employeeStatus: [],
    sapId: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // Inspector Modal State
  const [inspectRecord, setInspectRecord] = useState(null);
  const [fieldFilter, setFieldFilter] = useState('');

  const loadData = useCallback(() => {
    setIsLoading(true);

    const params = {
      page,
      pageSize,
      sortBy,
      sortDirection
    };

    if (search.trim()) {
      params.search = search.trim();
    }

    if (columnFilters.location && columnFilters.location.length > 0) {
      params.location = columnFilters.location.join(',');
    } else if (location && location !== 'ALL') {
      params.location = location.trim();
    }

    if (columnFilters.employeeStatus && columnFilters.employeeStatus.length > 0) {
      params.employeeStatus = columnFilters.employeeStatus.join(',');
    }

    if (columnFilters.sapId && columnFilters.sapId.length > 0) {
      params.sapId = columnFilters.sapId.join(',');
    }

    api.getCurrentRas(params)
      .then((res) => {
        setItems(res.items || []);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
      })
      .catch((err) => {
        console.error('Failed to load RAS data', err);
      })
      .finally(() => setIsLoading(false));
  }, [page, pageSize, search, location, sortBy, sortDirection, columnFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setInspectRecord(null);
      }
    };
    if (inspectRecord) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectRecord]);

  const handleReset = () => {
    setSearch('');
    setLocation('ALL');
    setColumnFilters({ location: [], employeeStatus: [], sapId: [] });
    setSortBy('sapid');
    setSortDirection('asc');
    setPage(1);
  };

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const getSortIcon = (col) => {
    if (sortBy !== col) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-0.5 text-blue-600" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-0.5 text-blue-600" />
    );
  };

  // Derive unique options for Excel filters
  const uniqueLocations = useMemo(() => {
    const defaults = ['Bangalore', 'Delhi', 'Hyderabad', 'Mumbai', 'Noida', 'Gurgaon', 'Pune', 'Chennai'];
    const current = items.map((i) => i.location).filter(Boolean);
    return Array.from(new Set([...defaults, ...current]));
  }, [items]);

  const uniqueStatuses = useMemo(() => {
    const current = items.map((i) => i.employeeStatus).filter(Boolean);
    return Array.from(new Set(current));
  }, [items]);

  const uniqueSapIds = useMemo(() => items.map((i) => i.sapId).filter(Boolean), [items]);

  // Parse structured data for inspector modal
  const structuredSections = useMemo(() => {
    if (!inspectRecord) return [];

    let rawData = {};
    if (inspectRecord.rawDataJson) {
      try {
        rawData = JSON.parse(inspectRecord.rawDataJson);
      } catch {
        rawData = {};
      }
    }

    const merged = {
      'SAP ID': inspectRecord.sapId,
      'Employee Name': inspectRecord.employeeName,
      'Location': inspectRecord.location,
      'Employee Status': inspectRecord.employeeStatus,
      'Start Date': inspectRecord.startDate,
      'End Date': inspectRecord.endDate,
      'Last Working Day': inspectRecord.lastWorkingDay,
      'Snapshot Date': inspectRecord.snapshotDate,
      'Batch ID': inspectRecord.batchId,
      ...rawData
    };

    const usedKeys = new Set();
    const query = fieldFilter.toLowerCase().trim();

    const sections = SECTION_MAPPINGS.map((section) => {
      const fields = [];
      section.keys.forEach((k) => {
        // Find matching key in merged (case-insensitive)
        const foundEntry = Object.entries(merged).find(
          ([mKey]) => mKey.toLowerCase() === k.toLowerCase()
        );
        if (foundEntry) {
          const [origKey, val] = foundEntry;
          usedKeys.add(origKey.toLowerCase());
          if (val !== null && val !== undefined && val !== '') {
            if (!query || origKey.toLowerCase().includes(query) || String(val).toLowerCase().includes(query)) {
              fields.push({ label: origKey, value: val });
            }
          }
        }
      });
      return { title: section.title, fields };
    }).filter((s) => s.fields.length > 0);

    // Collect any unmapped fields
    const unmappedFields = [];
    Object.entries(merged).forEach(([k, v]) => {
      if (!usedKeys.has(k.toLowerCase()) && v !== null && v !== undefined && v !== '') {
        if (!query || k.toLowerCase().includes(query) || String(v).toLowerCase().includes(query)) {
          unmappedFields.push({ label: k, value: v });
        }
      }
    });

    if (unmappedFields.length > 0) {
      sections.push({ title: 'Additional Attributes', fields: unmappedFields });
    }

    return sections;
  }, [inspectRecord, fieldFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">RAS Data</h1>
              {/* <p className="text-xs text-slate-500">Authoritative employee roster and Last Working Day (LWD) from latest accepted RAS file.</p> */}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => onNavigateImport && onNavigateImport('ras')}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New RAS File</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SAP ID or Employee Name..."
              className="w-full pl-9 pr-3 h-9 text-xs bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 text-slate-800 transition-colors"
            />
          </div>

          <div className="md:col-span-4">
            <input
              type="text"
              value={location === 'ALL' ? '' : location}
              onChange={(e) => setLocation(e.target.value || 'ALL')}
              placeholder="Filter by Location..."
              className="w-full px-3 h-9 text-xs bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 text-slate-800 transition-colors"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center space-x-1.5 px-3 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer w-full justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Current Workforce</span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full font-mono">
              {totalCount.toLocaleString()} employees
            </span>
          </div>
          {/* <span className="text-[11px] text-slate-400">Click any row to view complete structured record details</span> */}
        </div>

        {/* Progress Bar */}
        {isLoading && (
          <div className="w-full h-0.5 bg-blue-100 overflow-hidden">
            <div className="w-full h-full bg-blue-600 animate-pulse" />
          </div>
        )}

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                {/* SAP ID */}
                <th className="py-3 px-4 hover:bg-slate-200/70 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('sapid')} className="cursor-pointer flex-1">
                      SAP ID {getSortIcon('sapid')}
                    </span>
                    <ExcelColumnFilter
                      title="SAP ID"
                      columnKey="sapId"
                      selectedValues={columnFilters.sapId}
                      options={uniqueSapIds}
                      onApply={(vals) => setColumnFilters((prev) => ({ ...prev, sapId: vals }))}
                    />
                  </div>
                </th>

                {/* Employee Name */}
                <th
                  onClick={() => handleSort('employeename')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
                >
                  Employee Name {getSortIcon('employeename')}
                </th>

                {/* Location */}
                <th className="py-3 px-4 hover:bg-slate-200/70 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('location')} className="cursor-pointer flex-1">
                      Location {getSortIcon('location')}
                    </span>
                    <ExcelColumnFilter
                      title="Location"
                      columnKey="location"
                      selectedValues={columnFilters.location}
                      options={uniqueLocations}
                      onApply={(vals) => setColumnFilters((prev) => ({ ...prev, location: vals }))}
                    />
                  </div>
                </th>

                {/* Status */}
                <th className="py-3 px-4 hover:bg-slate-200/70 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <ExcelColumnFilter
                      title="Employee Status"
                      columnKey="employeeStatus"
                      selectedValues={columnFilters.employeeStatus}
                      options={uniqueStatuses}
                      onApply={(vals) => setColumnFilters((prev) => ({ ...prev, employeeStatus: vals }))}
                    />
                  </div>
                </th>

                {/* Last Working Day */}
                <th
                  onClick={() => handleSort('lastworkingday')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
                >
                  Last Working Day {getSortIcon('lastworkingday')}
                </th>

                {/* Snapshot Date */}
                <th
                  onClick={() => handleSort('snapshotdate')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
                >
                  Snapshot Date {getSortIcon('snapshotdate')}
                </th>
              </tr>
            </thead>

            <tbody className={`divide-y divide-slate-100 text-slate-700 transition-opacity duration-150 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
              {items.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No RAS records found matching these filters.
                  </td>
                </tr>
              ) : items.length === 0 && isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={`ras-skel-${i}`} className="animate-pulse">
                    <td colSpan={6} className="py-3 px-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : (
                items.map((emp) => {
                  const hasLwd = !!emp.lastWorkingDay;
                  return (
                    <tr
                      key={emp.rasRecordId || emp.sapId}
                      onClick={() => setInspectRecord(emp)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                      title="Click to view full structured record details"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {emp.sapId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {emp.employeeName || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {emp.location || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {emp.employeeStatus || 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {hasLwd ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <Calendar className="w-3 h-3 text-rose-500" />
                            <span>{emp.lastWorkingDay}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {emp.snapshotDate || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <span>Showing</span>
            <span className="font-semibold text-slate-800">
              {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalCount)}
            </span>
            <span>of</span>
            <span className="font-semibold text-slate-800">{totalCount}</span>
            <span>employees</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 font-medium cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Centered Structured Detail Modal (NO JSON VIEW) */}
      {inspectRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setInspectRecord(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center space-x-3">
                <span className="px-2.5 py-1 bg-blue-600 text-white rounded font-mono font-bold text-xs">
                  {inspectRecord.sapId}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white leading-tight">
                    {inspectRecord.employeeName || 'Employee Record'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Imported Record Attributes • Batch #{inspectRecord.batchId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Close modal (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar: Search within attributes */}
            <div className="px-6 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={fieldFilter}
                  onChange={(e) => setFieldFilter(e.target.value)}
                  placeholder="Filter attributes by label or value..."
                  className="w-full pl-9 pr-3 h-8 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Modal Body: Practical Structured Sections */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">
              {structuredSections.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No attributes match your filter.
                </div>
              ) : (
                structuredSections.map((sec) => (
                  <div key={sec.title} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 mb-3 border-b border-slate-100 flex items-center justify-between">
                      <span>{sec.title}</span>
                      <span className="text-[10px] font-normal text-slate-400 lowercase">
                        {sec.fields.length} {sec.fields.length === 1 ? 'field' : 'fields'}
                      </span>
                    </h3>

                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
                      {sec.fields.map(({ label, value }) => (
                        <div key={label} className="border-b border-slate-50 pb-1.5 flex flex-col justify-between">
                          <dt className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">
                            {label}
                          </dt>
                          <dd className="text-xs font-medium text-slate-900 break-words mt-0.5">
                            {String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-white flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
