import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Filter, Search, X } from 'lucide-react';

export default function ExcelColumnFilter({
  title,
  selectedValues = [],
  options = [],
  onApply,
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [draftSelected, setDraftSelected] = useState(selectedValues || []);
  const menuRef = useRef(null);

  // Sync draft when opened or when selectedValues change externally
  useEffect(() => {
    setDraftSelected(selectedValues || []);
  }, [selectedValues, isOpen]);

  // Click outside listener to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Clean deduplicated options list
  const uniqueOptions = useMemo(() => {
    const set = new Set();
    options.forEach((opt) => {
      if (opt !== null && opt !== undefined && opt !== '' && opt !== 'ALL' && opt !== 'All') {
        set.add(String(opt).trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options]);

  // Filtered options based on search input
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return uniqueOptions;
    const q = searchTerm.toLowerCase();
    return uniqueOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [uniqueOptions, searchTerm]);

  const hasActiveFilter = selectedValues && selectedValues.length > 0;

  const handleToggleValue = (val) => {
    setDraftSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const handleSelectAll = () => {
    setDraftSelected(uniqueOptions);
  };

  const handleClearSelection = () => {
    setDraftSelected([]);
  };

  const handleApply = (e) => {
    e.stopPropagation();
    onApply(draftSelected);
    setIsOpen(false);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setDraftSelected(selectedValues || []);
    setIsOpen(false);
  };

  const alignClass = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div className="relative inline-block ml-1" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      {/* Filter trigger button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title={`Filter by ${title}`}
        className={`inline-flex items-center justify-center p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
          hasActiveFilter
            ? 'text-blue-600 bg-blue-100/90 font-bold'
            : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <Filter className="w-3 h-3" />
        {hasActiveFilter && (
          <span className="ml-0.5 text-[9px] font-bold text-blue-700 font-mono">
            {selectedValues.length}
          </span>
        )}
      </button>

      {/* Anchored Excel-style Filter Popover */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 ${alignClass} z-40 w-60 bg-white border border-slate-200 rounded-lg shadow-xl text-slate-800 p-2 text-xs animate-in fade-in duration-100 select-none`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Filter: {title}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search values */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search values..."
              className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
            />
          </div>

          {/* Quick Select All / Clear */}
          <div className="flex items-center justify-between px-1 mb-1.5 text-[10.5px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* Checkbox Options List */}
          <div className="max-h-40 overflow-y-auto space-y-0.5 border border-slate-100 rounded p-1 bg-slate-50/50">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-slate-400 text-[11px]">
                No matching values
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = draftSelected.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-center space-x-2 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleValue(opt)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="truncate text-xs font-normal" title={opt}>
                      {opt}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">
              {draftSelected.length} of {uniqueOptions.length} selected
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
