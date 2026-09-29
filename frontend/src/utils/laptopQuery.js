/**
 * Centralized query & active filter utilities for LaptopTracker
 */

export function getDefaultLaptopFilters() {
  return {
    search: '',
    status: 'ALL',
    rasStatus: 'ALL',
    location: 'ALL',
    fbrRequest: 'ALL',
    itSpoc: 'ALL',
    lwdFrom: '',
    lwdTo: '',
    stockAge: 'ALL',
    stockAgeMin: null,
    stockAgeMax: null,
    lwdApproaching15Days: false,
    isLost: null
  };
}

export function getDefaultColumnFilters() {
  return {
    serialNumber: [],
    fbrRequest: [],
    location: [],
    status: [],
    itSpoc: [],
    sapId: [],
    userName: [],
    rasStatus: []
  };
}

const INACTIVE_VALUES = new Set(['', 'ALL', 'All', 'all', 'ANY', 'Any', 'any', null, undefined]);

/**
 * Checks whether any page-level filter or Excel column filter is currently active
 */
export function hasActiveLaptopFilters(filters = {}, columnFilters = {}) {
  // Check page-level filters
  if (filters.search && filters.search.trim().length > 0) return true;
  if (filters.status && !INACTIVE_VALUES.has(filters.status)) return true;
  if (filters.rasStatus && !INACTIVE_VALUES.has(filters.rasStatus)) return true;
  if (filters.location && !INACTIVE_VALUES.has(filters.location)) return true;
  if (filters.fbrRequest && !INACTIVE_VALUES.has(filters.fbrRequest)) return true;
  if (filters.itSpoc && !INACTIVE_VALUES.has(filters.itSpoc)) return true;
  if (filters.sapId && filters.sapId.trim().length > 0) return true;
  if (filters.lwdFrom && filters.lwdFrom.trim().length > 0) return true;
  if (filters.lwdTo && filters.lwdTo.trim().length > 0) return true;
  if (filters.stockAge && !INACTIVE_VALUES.has(filters.stockAge)) return true;
  if (filters.stockAgeMin !== null && filters.stockAgeMin !== undefined) return true;
  if (filters.stockAgeMax !== null && filters.stockAgeMax !== undefined) return true;
  if (filters.lwdApproaching15Days === true) return true;
  if (filters.isLost !== null && filters.isLost !== undefined) return true;

  // Check table header column filters
  if (columnFilters && typeof columnFilters === 'object') {
    for (const key of Object.keys(columnFilters)) {
      const vals = columnFilters[key];
      if (Array.isArray(vals) && vals.length > 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Builds a clean, unified API query payload combining page filters, column filters, pagination, and sorting
 */
export function buildLaptopQueryParams(filters = {}, columnFilters = {}, pagination = {}, sort = {}) {
  const params = {};

  // 1. Search text
  if (filters.search && filters.search.trim().length > 0) {
    params.search = filters.search.trim();
  }

  // 2. Status (Column filter takes precedence if specified)
  if (columnFilters?.status?.length > 0) {
    params.status = columnFilters.status.join(',');
  } else if (filters.status && !INACTIVE_VALUES.has(filters.status)) {
    params.status = filters.status.trim();
  }

  // 3. RAS Status (Column filter takes precedence if specified)
  if (columnFilters?.rasStatus?.length > 0) {
    params.rasStatus = columnFilters.rasStatus.join(',');
  } else if (filters.rasStatus && !INACTIVE_VALUES.has(filters.rasStatus)) {
    params.rasStatus = filters.rasStatus.trim();
  }

  // 4. Location (Column filter takes precedence if specified)
  if (columnFilters?.location?.length > 0) {
    params.location = columnFilters.location.join(',');
  } else if (filters.location && !INACTIVE_VALUES.has(filters.location)) {
    params.location = filters.location.trim();
  }

  // 5. FBR Request
  if (columnFilters?.fbrRequest?.length > 0) {
    params.fbrRequest = columnFilters.fbrRequest.join(',');
  } else if (filters.fbrRequest && !INACTIVE_VALUES.has(filters.fbrRequest)) {
    params.fbrRequest = filters.fbrRequest.trim();
  }

  // 6. IT SPOC
  if (columnFilters?.itSpoc?.length > 0) {
    params.itSpoc = columnFilters.itSpoc.join(',');
  } else if (filters.itSpoc && !INACTIVE_VALUES.has(filters.itSpoc)) {
    params.itSpoc = filters.itSpoc.trim();
  }

  // 7. SAP ID
  if (columnFilters?.sapId?.length > 0) {
    params.sapId = columnFilters.sapId.join(',');
  } else if (filters.sapId && filters.sapId.trim().length > 0) {
    params.sapId = filters.sapId.trim();
  }

  // 8. Serial Number column filter
  if (columnFilters?.serialNumber?.length > 0) {
    // If search already exists, append or merge
    params.search = params.search
      ? `${params.search} ${columnFilters.serialNumber.join(' ')}`
      : columnFilters.serialNumber.join(',');
  }

  // 9. LWD range
  if (filters.lwdFrom && filters.lwdFrom.trim().length > 0) {
    params.lwdFrom = filters.lwdFrom.trim();
  }
  if (filters.lwdTo && filters.lwdTo.trim().length > 0) {
    params.lwdTo = filters.lwdTo.trim();
  }

  // 10. Stock Ageing
  if (filters.stockAgeMin !== null && filters.stockAgeMin !== undefined) {
    params.stockAgeMin = filters.stockAgeMin;
  }
  if (filters.stockAgeMax !== null && filters.stockAgeMax !== undefined) {
    params.stockAgeMax = filters.stockAgeMax;
  }

  // 11. Flags
  if (filters.lwdApproaching15Days === true) {
    params.lwdApproaching15Days = true;
  }
  if (filters.isLost !== null && filters.isLost !== undefined) {
    params.isLost = filters.isLost;
  }

  // 12. Pagination
  params.page = Math.max(1, pagination?.page || 1);
  params.pageSize = Math.max(1, pagination?.pageSize || 25);

  // 13. Sorting
  if (sort?.field) {
    params.sortBy = sort.field;
  }
  if (sort?.direction) {
    params.sortDirection = sort.direction;
  }

  return params;
}
