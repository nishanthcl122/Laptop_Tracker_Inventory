import React, { useState, useEffect } from 'react';
import { Search, Filter, RotateCcw, Download } from 'lucide-react';
import { api } from '../services/api';
import { toast } from '../utils/toast';
import {
  hasActiveLaptopFilters,
  getDefaultLaptopFilters,
  buildLaptopQueryParams
} from '../utils/laptopQuery';

export default function FilterBar({
  appliedFilters = {},
  columnFilters = {},
  onApplyFilters,
  onResetFilters
}) {
  // Local draft filter state
  const [draft, setDraft] = useState(() => ({
    ...getDefaultLaptopFilters(),
    ...appliedFilters
  }));

  // Sync draft if appliedFilters changed externally (e.g. initial load or reset)
  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      ...appliedFilters
    }));
  }, [appliedFilters]);

  const handleChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = (e) => {
    e.preventDefault();

    // Check if any filter differs from default
    if (!hasActiveLaptopFilters(draft, columnFilters)) {
      toast.warn('Select any filtering value first.');
      return;
    }

    onApplyFilters(draft);
  };

  const handleReset = () => {
    const cleared = getDefaultLaptopFilters();
    setDraft(cleared);
    onResetFilters(cleared);
  };

  const handleExport = () => {
    const params = buildLaptopQueryParams(appliedFilters, columnFilters, { page: 1, pageSize: 10000 });
    const url = api.exportLaptopsUrl(params);
    window.open(url, '_blank');
  };

  // Reset button is disabled if there are no active filters in draft or applied
  const isResetDisabled =
    !hasActiveLaptopFilters(draft, columnFilters) &&
    !hasActiveLaptopFilters(appliedFilters, columnFilters);

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs mb-4">
      <form onSubmit={handleApply} className="space-y-3">
        {/* Top Tier: Global Search & Primary Attributes */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Prominent Search Bar (4 cols) */}
          <div className="md:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={draft.search || ''}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder="Search serial, FBR, location, IT SPOC, SAP ID, user..."
              className="w-full pl-9 pr-3 h-9 text-xs bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 text-slate-800 transition-colors"
            />
          </div>

          {/* Status (2 cols) */}
          <div className="md:col-span-2">
            <select
              value={draft.status || 'ALL'}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-2.5 h-9 text-xs bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">Status: All</option>
              <option value="Allocated">Allocated</option>
              <option value="In Stock">In Stock</option>
            </select>
          </div>

          {/* RAS Status (2 cols) */}
          <div className="md:col-span-2">
            <select
              value={draft.rasStatus || 'ALL'}
              onChange={(e) => handleChange('rasStatus', e.target.value)}
              className="w-full px-2.5 h-9 text-xs bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">RAS: All</option>
              <option value="ACTIVE">Active</option>
              <option value="LOST">Lost</option>
              <option value="NOT_IN_UHG">Not in UHG</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          {/* Location (2 cols) */}
          <div className="md:col-span-2">
            <input
              type="text"
              value={draft.location === 'ALL' ? '' : draft.location || ''}
              onChange={(e) => handleChange('location', e.target.value ? e.target.value : 'ALL')}
              placeholder="Location..."
              className="w-full px-2.5 h-9 text-xs bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 text-slate-800 transition-colors"
            />
          </div>

          {/* FBR Request (2 cols) */}
          <div className="md:col-span-2">
            <input
              type="text"
              value={draft.fbrRequest === 'ALL' ? '' : draft.fbrRequest || ''}
              onChange={(e) => handleChange('fbrRequest', e.target.value ? e.target.value : 'ALL')}
              placeholder="FBR Request..."
              className="w-full px-2.5 h-9 text-xs bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 text-slate-800 transition-colors"
            />
          </div>
        </div>

        {/* Bottom Tier: Dates, Ageing & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* IT SPOC */}
            <div className="w-28">
              <input
                type="text"
                value={draft.itSpoc === 'ALL' ? '' : draft.itSpoc || ''}
                onChange={(e) => handleChange('itSpoc', e.target.value ? e.target.value : 'ALL')}
                placeholder="IT SPOC..."
                className="w-full px-2 h-8 text-xs bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 text-slate-800"
              />
            </div>

            {/* LWD Range */}
            <div className="flex items-center space-x-1 text-xs text-slate-600 bg-slate-50/80 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="font-medium text-slate-500">LWD:</span>
              <input
                type="date"
                value={draft.lwdFrom || ''}
                onChange={(e) => handleChange('lwdFrom', e.target.value)}
                className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="Last Working Day From"
              />
              <span className="text-slate-400">—</span>
              <input
                type="date"
                value={draft.lwdTo || ''}
                onChange={(e) => handleChange('lwdTo', e.target.value)}
                className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="Last Working Day To"
              />
            </div>

            {/* Stock Ageing Dropdown */}
            <div>
              <select
                value={draft.stockAge || 'ALL'}
                onChange={(e) => {
                  const val = e.target.value;
                  let min = null;
                  let max = null;
                  if (val === '0-30') { min = 0; max = 30; }
                  else if (val === '31-60') { min = 31; max = 60; }
                  else if (val === '61-90') { min = 61; max = 90; }
                  else if (val === '90+') { min = 91; max = null; }
                  setDraft((prev) => ({ ...prev, stockAge: val, stockAgeMin: min, stockAgeMax: max }));
                }}
                className="h-8 px-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-medium cursor-pointer"
              >
                <option value="ALL">Stock Ageing: Any</option>
                <option value="0-30">0 – 30 days</option>
                <option value="31-60">31 – 60 days</option>
                <option value="61-90">61 – 90 days</option>
                <option value="90+">&gt; 90 days</option>
              </select>
            </div>
          </div>

          {/* Action Buttons: Apply, Reset, Export */}
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-4 h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply Filters</span>
            </button>

            <button
              type="button"
              disabled={isResetDisabled}
              onClick={handleReset}
              className={`inline-flex items-center space-x-1.5 px-3 h-8 text-xs font-medium rounded-lg transition-colors ${
                isResetDisabled
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
              }`}
              title={isResetDisabled ? 'No active filters to reset' : 'Reset all filter parameters'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center space-x-1.5 px-3 h-8 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              title="Export current filtered view to Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
