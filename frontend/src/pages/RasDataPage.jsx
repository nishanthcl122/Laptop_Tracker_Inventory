import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RotateCcw,
  Upload,
  Users,
  Calendar,
  X,
  ChevronUp,
  ChevronDown,
  MapPin,
  UserRound,
  BriefcaseBusiness
} from 'lucide-react';
import { api } from '../services/api';
import ExcelColumnFilter from '../components/ExcelColumnFilter';

const SECTION_MAPPINGS = [
  {
    title: 'Employee Details',
    keys: [
      'SAPId', 'SAP ID', 'SAPID', 'SAP', 'Employee Code', 'EmployeeCode', 'Emp Code', 'EmpCode', 'Employee ID', 'EmployeeID', 'Emp ID', 'EmpID', 'User ID',
      'Employee Name', 'EmployeeName', 'Emp Name', 'EmpName', 'Resource Name', 'ResourceName', 'Full Name', 'FullName', 'Employee', 'Name', 'Email', 'Email ID',
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
      'Last Working Day', 'LastWorkingDay', 'Last Working Date', 'LWD',
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

    const normalizeHeader = (header) => header.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dtoFallbacks = [
      ['SAP ID', inspectRecord.sapId, ['SAP ID', 'SAPId', 'SAPID', 'SAP', 'Employee Code', 'EmployeeCode', 'Emp Code', 'EmpCode', 'Employee ID', 'EmployeeID', 'Emp ID', 'EmpID', 'User ID']],
      ['Employee Name', inspectRecord.employeeName, ['Employee Name', 'EmployeeName', 'Emp Name', 'EmpName', 'Resource Name', 'ResourceName', 'Full Name', 'FullName', 'Employee', 'Name']],
      ['Location', inspectRecord.location, ['PSA', 'Location']],
      ['Employee Status', inspectRecord.employeeStatus, ['Employee Status', 'EmployeeStatus']],
      ['Start Date', inspectRecord.startDate, ['Start Date', 'StartDate']],
      ['End Date', inspectRecord.endDate, ['End Date', 'EndDate']],
      ['Last Working Day', inspectRecord.lastWorkingDay, ['Last Working Day', 'LastWorkingDay', 'LWD']],
      ['Snapshot Date', inspectRecord.snapshotDate, ['Snapshot Date', 'SnapshotDate']],
      ['Batch ID', inspectRecord.batchId, ['Batch ID', 'BatchId']]
    ];
    const rawHeaders = Object.keys(rawData).map(normalizeHeader);
    const merged = { ...rawData };
    dtoFallbacks.forEach(([key, value, aliases]) => {
      const hasRawValue = aliases.some((alias) => rawHeaders.includes(normalizeHeader(alias)));
      if (!hasRawValue) merged[key] = value;
    });

    const usedKeys = new Set();
    const query = fieldFilter.toLowerCase().trim();

    const sections = SECTION_MAPPINGS.map((section) => {
      const fields = [];
      section.keys.forEach((k) => {
        // Find matching key in merged (case-insensitive)
        const foundEntry = Object.entries(merged).find(
          ([mKey]) => mKey.toLowerCase() === k.toLowerCase()
        );
        if (foundEntry && !usedKeys.has(foundEntry[0].toLowerCase())) {
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
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-white to-blue-50/70 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
            <Users className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">People & workforce</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Workforce Explorer</h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500">
              Explore employee records, workforce lifecycle data, location information and organizational structure from the latest accepted RAS file.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => onNavigateImport && onNavigateImport('ras')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-blue-700 hover:shadow-md cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>Upload New RAS File</span>
          </button>
        </div>
      </div>

      {/* Compact dataset summary */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-700">Current Workforce Dataset</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-blue-700">
            {totalCount.toLocaleString()} Records
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold tabular-nums text-slate-700">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalCount)}</span> of{' '}
          <span className="font-semibold tabular-nums text-slate-700">{totalCount.toLocaleString()}</span> employees
        </p>
      </div>

      {/* Workforce Search & Filters */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-blue-600" />
          <h2 className="text-xs font-semibold text-slate-800">Workforce Search</h2>
        </div>
        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SAP ID, employee name, manager, location..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="relative md:col-span-4">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={location === 'ALL' ? '' : location}
              onChange={(e) => setLocation(e.target.value || 'ALL')}
              placeholder="Filter by Location (PSA)..."
              className="w-full px-3 h-9 text-xs bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 text-slate-800 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end md:col-span-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {(search.trim() || (location && location !== 'ALL') ||
          (columnFilters.location?.length ?? 0) > 0 ||
          (columnFilters.employeeStatus?.length ?? 0) > 0 ||
          (columnFilters.sapId?.length ?? 0) > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active filters</span>
            {search.trim() && (
              <button type="button" onClick={() => setSearch('')} className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100">
                Search: {search}<X className="h-3 w-3" />
              </button>
            )}
            {location !== 'ALL' && location && (
              <button type="button" onClick={() => setLocation('ALL')} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100">
                <MapPin className="h-3 w-3" />{location}<X className="h-3 w-3" />
              </button>
            )}
            {columnFilters.location.map((value) => (
              <button key={`location-${value}`} type="button" onClick={() => setColumnFilters((prev) => ({ ...prev, location: prev.location.filter((item) => item !== value) }))} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100">
                <MapPin className="h-3 w-3" />{value}<X className="h-3 w-3" />
              </button>
            ))}
            {columnFilters.employeeStatus.map((value) => (
              <button key={`status-${value}`} type="button" onClick={() => setColumnFilters((prev) => ({ ...prev, employeeStatus: prev.employeeStatus.filter((item) => item !== value) }))} className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                {value}<X className="h-3 w-3" />
              </button>
            ))}
            {columnFilters.sapId.map((value) => (
              <button key={`sap-${value}`} type="button" onClick={() => setColumnFilters((prev) => ({ ...prev, sapId: prev.sapId.filter((item) => item !== value) }))} className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100">
                SAP {value}<X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Roster Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Employee Directory</span>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-blue-700">
              {totalCount.toLocaleString()} employees
            </span>
          </div>
          <span className="hidden text-[11px] text-slate-400 sm:block">Select an employee to explore their profile</span>
        </div>

        {/* Progress Bar */}
        {isLoading && (
          <div className="h-1 w-full overflow-hidden bg-blue-50">
            <div className="h-full w-full animate-pulse bg-gradient-to-r from-blue-400 via-blue-600 to-cyan-400" />
          </div>
        )}

        <div className="min-h-[300px] overflow-auto bg-slate-50/60 px-3 pb-2">
          <table className="w-full border-separate border-spacing-x-0 border-spacing-y-2 text-left text-xs">
            <thead>
              <tr className="sticky top-0 z-10 bg-slate-100/95 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 shadow-sm backdrop-blur-md">
                {/* SAP ID */}
                <th className="h-14  border-y border-l border-slate-200/80 bg-slate-100/95 px-4 align-middle whitespace-nowrap transition-colors hover:bg-slate-200/80">
                  <div className="flex h-full items-center justify-between gap-3">
                    <span onClick={() => handleSort('sapid')} className="inline-flex min-w-0 flex-1 cursor-pointer items-center gap-1.5">
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
                  className="h-14 border-y border-slate-200/80 bg-slate-100/95 px-4 align-middle cursor-pointer whitespace-nowrap transition-colors hover:bg-slate-200/80"
                >
                  <span className="inline-flex h-full items-center gap-1.5">Employee Name {getSortIcon('employeename')}</span>
                </th>

                {/* Location */}
                <th className="py-3 px-4 hover:bg-slate-200/70 transition-colors whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span onClick={() => handleSort('location')} className="cursor-pointer flex-1">
                      Location (PSA) {getSortIcon('location')}
                    </span>
                    <ExcelColumnFilter
                      title="Location (PSA)"
                      columnKey="location"
                      selectedValues={columnFilters.location}
                      options={uniqueLocations}
                      onApply={(vals) => setColumnFilters((prev) => ({ ...prev, location: vals }))}
                    />
                  </div>
                </th>

                {/* Status */}
                <th className="h-14 border-y border-slate-200/80 bg-slate-100/95 px-4 align-middle whitespace-nowrap transition-colors hover:bg-slate-200/80">
                  <div className="flex h-full items-center justify-between gap-3">
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
                  className="h-14 border-y border-slate-200/80 bg-slate-100/95 px-4 align-middle cursor-pointer whitespace-nowrap transition-colors hover:bg-slate-200/80"
                >
                  <span className="inline-flex h-full items-center gap-1.5">Last Working Day {getSortIcon('lastworkingday')}</span>
                </th>

                {/* Snapshot Date */}
                <th
                  onClick={() => handleSort('snapshotdate')}
                  className="h-14  border-y border-r border-slate-200/80 bg-slate-100/95 px-4 align-middle cursor-pointer whitespace-nowrap transition-colors hover:bg-slate-200/80"
                >
                  <span className="inline-flex h-full items-center gap-1.5">Snapshot Date {getSortIcon('snapshotdate')}</span>
                </th>
              </tr>
            </thead>

            <tbody className={`text-slate-700 transition-opacity duration-150 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
              {items.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 text-blue-500 shadow-sm">
                        <Users className="h-8 w-8 stroke-[1.5]" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">No employees found</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500">No workforce records match the current search and filters.</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 && isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={`ras-skel-${i}`} className="animate-pulse">
                    {Array.from({ length: 6 }, (_, column) => (
                      <td key={column} className={`border-y border-slate-100 bg-white px-4 py-4 shadow-sm ${column === 0 ? 'rounded-l-xl border-l' : ''} ${column === 5 ? 'rounded-r-xl border-r' : ''}`}>
                        <div className={`h-3 rounded-full bg-slate-100 ${column === 1 ? 'w-3/4' : 'w-2/3'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                items.map((emp) => {
                  const hasLwd = !!emp.lastWorkingDay;
                  const employeeStatus = (emp.employeeStatus || 'Active').toLowerCase();
                  const employeeStatusStyles = employeeStatus === 'active'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : employeeStatus.includes('separat') || employeeStatus.includes('resign')
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-100 text-slate-700';
                  return (
                    <tr
                      key={emp.rasRecordId || emp.sapId}
                      onClick={() => setInspectRecord(emp)}
                      className="group cursor-pointer transition-all duration-200 hover:-translate-y-px hover:drop-shadow-md"
                      title="Click to view full structured record details"
                    >
                      <td className="rounded-l-xl border-y border-l-2 border-y-slate-200/80 border-l-blue-500 bg-white px-4 py-3.5 align-middle shadow-sm transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        <div className="font-mono text-[13px] font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-700">{emp.sapId}</div>
                        <div className="mt-1 text-[10px] font-medium text-slate-400">Workforce ID</div>
                      </td>
                      <td className="border-y border-slate-200/80 bg-white px-4 py-3.5 align-middle shadow-sm transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        <div className="font-semibold text-slate-900">
                        {emp.employeeName || '—'}
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-slate-400">SAP: {emp.sapId}</div>
                      </td>
                      <td className="border-y border-slate-200/80 bg-white px-4 py-3.5 align-middle shadow-sm transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {emp.location || '—'}
                        </span>
                      </td>
                      <td className="border-y border-slate-200/80 bg-white px-4 py-3.5 align-middle shadow-sm transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${employeeStatusStyles}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${employeeStatus === 'active' ? 'bg-emerald-500' : employeeStatus.includes('separat') || employeeStatus.includes('resign') ? 'bg-rose-500' : 'bg-slate-400'}`} />
                          {emp.employeeStatus || 'Active'}
                        </span>
                      </td>
                      <td className="border-y border-slate-200/80 bg-white px-4 py-3.5 align-middle shadow-sm transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        {hasLwd ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 shadow-sm">
                            <Calendar className="h-3.5 w-3.5 text-rose-500" />
                            <span>{emp.lastWorkingDay}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="rounded-r-xl border-y border-r border-slate-200/80 bg-white px-4 py-3.5 align-middle font-mono text-[11px] text-slate-500 shadow-sm transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
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
        <div className="px-5 py-3.5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/80">
          <div className="flex items-center space-x-2">
            <span>Showing</span>
            <span className="font-semibold tabular-nums text-slate-800">
              {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalCount)}
            </span>
            <span>of</span>
            <span className="font-semibold tabular-nums text-slate-800">{totalCount.toLocaleString()}</span>
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
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm cursor-pointer"
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
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span className="rounded-lg px-2.5 py-1.5 font-medium tabular-nums text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm animate-in fade-in duration-150 sm:p-4"
          onClick={() => setInspectRecord(null)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-5 py-5 text-white sm:px-6">
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-blue-100 shadow-inner">
                  <UserRound className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/75">Employee profile</p>
                  <h2 className="mt-1 truncate text-lg font-semibold leading-tight text-white">
                    {inspectRecord.employeeName || 'Employee Record'}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-medium text-blue-100">
                      SAP {inspectRecord.sapId || '—'}
                    </span>
                    {inspectRecord.location && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                        <MapPin className="h-3 w-3 text-blue-200" />{inspectRecord.location}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                      (inspectRecord.employeeStatus || 'Active').toLowerCase() === 'active'
                        ? 'border-emerald-200/30 bg-emerald-400/15 text-emerald-100'
                        : (inspectRecord.employeeStatus || '').toLowerCase().includes('separat') || (inspectRecord.employeeStatus || '').toLowerCase().includes('resign')
                        ? 'border-rose-200/30 bg-rose-400/15 text-rose-100'
                        : 'border-white/15 bg-white/10 text-slate-200'
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {inspectRecord.employeeStatus || 'Active'}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-300/75">
                    <BriefcaseBusiness className="mr-1 inline h-3 w-3" />
                    RAS roster record · Batch #{inspectRecord.batchId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="shrink-0 rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                title="Close modal (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar: Search within attributes */}
            <div className="shrink-0 border-b border-slate-200/80 bg-slate-50/80 px-5 py-3 sm:px-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fieldFilter}
                  onChange={(e) => setFieldFilter(e.target.value)}
                  placeholder="Filter attributes by label or value..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Modal Body: Practical Structured Sections */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-5 sm:p-6">
              {structuredSections.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center text-xs text-slate-400">
                  <Search className="mb-3 h-8 w-8 text-slate-300" />
                  No attributes match your filter.
                </div>
              ) : (
                structuredSections.map((sec) => (
                  <section key={sec.title} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                    <h3 className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 text-xs font-semibold text-slate-800">
                      <span>{sec.title}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        {sec.fields.length} {sec.fields.length === 1 ? 'field' : 'fields'}
                      </span>
                    </h3>

                    <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {sec.fields.map(({ label, value }) => (
                        <div key={label} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3 transition-colors hover:border-blue-100 hover:bg-blue-50/40">
                          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {label}
                          </dt>
                          <dd className="mt-1.5 break-words text-xs font-semibold leading-5 text-slate-800">
                            {String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex shrink-0 justify-end border-t border-slate-200/80 bg-white px-5 py-3.5 sm:px-6">
              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
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
