import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Package, Search, X } from 'lucide-react';
import { api } from '../services/api';

export default function ActualInventoryModal({ location, onClose }) {
  const [reconciliation, setReconciliation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    api.getActualInventoryLocation(location)
      .then(setReconciliation)
      .catch((requestError) => {
        console.error('Failed to load actual inventory reconciliation', requestError);
        setError(requestError.response?.data?.message || 'Actual inventory reconciliation could not be loaded.');
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location, onClose]);

  const getDifferenceStyle = (difference) => {
    if (difference === 0) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (difference < 0) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const items = reconciliation?.items ?? [];
  const filteredItems = items.filter((item) =>
    item.fbrId.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-[96vw] max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="actual-inventory-reconciliation-title"
      >
        <header className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-blue-100 shadow-inner shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2.5">
                <h2 id="actual-inventory-reconciliation-title" className="text-base font-semibold text-white tracking-tight">
                  Actual Inventory Reconciliation
                </h2>
                <span className="px-2.5 py-1 text-xs font-semibold tabular-nums bg-blue-400/15 text-blue-100 rounded-full border border-blue-200/25 shadow-sm">
                  {location}
                </span>
              </div>
              <p className="text-xs text-slate-300/80 mt-1">
                Compare physical inventory uploaded through Actual Inventory against system inventory currently marked In Stock.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close modal (Esc)"
            aria-label="Close reconciliation"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-200/80 shrink-0">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search FBR ID..."
              aria-label="Search FBR ID"
              className="w-full pl-9 pr-3 h-9 text-xs bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-800 placeholder-slate-400 transition-shadow"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50/60 min-h-[320px] px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <LoaderCircle className="w-4 h-4 animate-spin" />
              Loading reconciliation...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : reconciliation ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500">System Stock</span>
                  <strong className="text-base font-bold tabular-nums text-slate-900">
                    {reconciliation.systemStock.toLocaleString()}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500">Actual Stock</span>
                  <strong className="text-base font-bold tabular-nums text-slate-900">
                    {reconciliation.actualStock.toLocaleString()}
                  </strong>
                </div>
                <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm ${getDifferenceStyle(reconciliation.variance)}`}>
                  <span className="text-xs font-semibold">Variance</span>
                  <strong className="text-base font-bold tabular-nums">
                    {reconciliation.variance > 0 ? '+' : ''}{reconciliation.variance.toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-x-0 border-spacing-y-4 text-left text-xs text-slate-600">
                    <thead className="sticky top-0 z-10 text-slate-500 font-semibold uppercase tracking-wider text-[10px] backdrop-blur-md">
                      <tr>
                        <th className="py-4 px-5 rounded-l-xl border-y border-l border-slate-200/80 bg-white shadow-sm">
                          FBR ID
                        </th>
                        <th className="py-4 px-5 text-center border-y border-slate-200/80 bg-white shadow-sm whitespace-nowrap">
                          System Stock
                        </th>
                        <th className="py-4 px-5 text-center border-y border-slate-200/80 bg-white shadow-sm whitespace-nowrap">
                          Actual Stock
                        </th>
                        <th className="py-4 px-5 text-center rounded-r-xl border-y border-r border-slate-200/80 bg-white shadow-sm whitespace-nowrap">
                          Difference
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr
                          key={item.fbrId}
                          className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                        >
                          <td className={`py-5 px-6 rounded-l-xl border-y border-r-0 border-slate-200/70 bg-white transition-all duration-200 group-hover:bg-blue-50/60 group-hover:border-blue-200 ${
                            item.difference === 0
                              ? 'border-l-4 border-l-emerald-500'
                              : item.difference < 0
                                ? 'border-l-4 border-l-rose-500'
                                : 'border-l-4 border-l-amber-500'
                          }`}>
                            <span className="block text-base font-bold tracking-tight text-slate-900">
                              {item.fbrId}
                            </span>
                          </td>
                          <td className="py-5 px-5 text-center border-y border-slate-200/70 bg-white transition-all duration-200 group-hover:bg-blue-50/60 group-hover:border-blue-200 group-hover:shadow-md">
                            <span className="inline-flex min-w-12 justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold tabular-nums text-slate-700 shadow-sm">
                              {item.systemStock.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-5 px-5 text-center border-y border-slate-200/70 bg-white transition-all duration-200 group-hover:bg-blue-50/60 group-hover:border-blue-200 group-hover:shadow-md">
                            <span className="inline-flex min-w-12 justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold tabular-nums text-blue-700 shadow-sm">
                              {item.actualStock.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-5 px-5 text-center rounded-r-xl border-y border-r border-slate-200/70 bg-white transition-all duration-200 group-hover:bg-blue-50/60 group-hover:border-blue-200 group-hover:shadow-md">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-2 text-sm font-bold tabular-nums shadow-sm ${getDifferenceStyle(item.difference)}`}>
                              {item.difference === 0 && <CheckCircle2 className="w-3 h-3" />}
                              {item.difference > 0 ? '+' : ''}{item.difference.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-3">
                            <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
                              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <Search className="h-4 w-4" />
                              </div>
                              <p className="text-sm font-semibold text-slate-700">
                                {items.length > 0 ? 'No matching FBR IDs' : 'No reconciliation records'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {items.length > 0
                                  ? 'Try a different FBR ID search.'
                                  : 'No system or actual inventory rows were found for this location.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <footer className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
          <span>
            Showing <b className="text-slate-800">{filteredItems.length}</b> of{' '}
            <b className="text-slate-800">{items.length.toLocaleString()}</b> FBR IDs
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
