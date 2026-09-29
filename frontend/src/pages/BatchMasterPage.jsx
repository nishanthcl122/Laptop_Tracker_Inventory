import React, { useEffect, useState } from 'react';
import { History, Eye, X, Laptop, Users } from 'lucide-react';
import { api } from '../services/api';

export default function BatchMasterPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'LAPTOP' | 'RAS'
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchBatches = () => {
    setLoading(true);
    api.getBatches()
      .then(data => setBatches(data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedBatch(null);
    };
    if (selectedBatch) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedBatch]);

  const handleSelectBatch = async (batch) => {
    setSelectedBatch(batch);
    setLoadingDetails(true);
    try {
      const details = await api.getBatchDetails(batch.batchId);
      setBatchDetails(details);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredBatches = batches.filter(b => {
    if (typeFilter === 'ALL') return true;
    return (b.batchType || 'LAPTOP').toUpperCase() === typeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Batch Master Log
              </h1>
              <p className="text-xs text-slate-500">
                Audit trail of daily Excel imports (Hardware Assets & RAS Workforce presence).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Type Filter Buttons */}
          <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                typeFilter === 'ALL' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Batches
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('LAPTOP')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                typeFilter === 'LAPTOP' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Laptop Batches
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('RAS')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                typeFilter === 'RAS' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              RAS Batches
            </button>
          </div>

          <button
            onClick={fetchBatches}
            className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Refresh Log
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Snapshot Date</th>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4 text-center">Records</th>
                <th className="py-3 px-4 text-center text-blue-700">New</th>
                <th className="py-3 px-4 text-center text-amber-700">Changed / Transitioned</th>
                <th className="py-3 px-4 text-center text-emerald-700">Same</th>
                <th className="py-3 px-4 text-center text-rose-700">Missing</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Uploaded At</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Loading batch registry...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No batches match the filter.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const isConfirmed = batch.status === 'CONFIRMED';
                  const isFailed = batch.status === 'FAILED';
                  const isRas = (batch.batchType || '').toUpperCase() === 'RAS';

                  return (
                    <tr
                      key={batch.batchId}
                      onClick={() => handleSelectBatch(batch)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{batch.batchId}
                      </td>
                      <td className="py-3 px-4">
                        {isRas ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Users className="w-3 h-3 text-indigo-500" />
                            <span>RAS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            <Laptop className="w-3 h-3 text-blue-500" />
                            <span>Laptop</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {batch.snapshotDate}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {batch.fileName}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {batch.recordCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-blue-600 bg-blue-50/20">
                        {batch.newCount}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-amber-600 bg-amber-50/20">
                        {batch.changedCount}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-emerald-600 bg-emerald-50/20">
                        {batch.unchangedCount}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-rose-600 bg-rose-50/20">
                        {batch.missingCount}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isConfirmed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                              : isFailed
                              ? 'bg-rose-50 text-rose-700 border border-rose-300'
                              : 'bg-amber-50 text-amber-700 border border-amber-300'
                          }`}
                        >
                          {batch.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                        {new Date(batch.uploadedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectBatch(batch)}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Centered Batch Details Modal */}
      {selectedBatch && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedBatch(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-sm text-blue-400">#{selectedBatch.batchId}</span>
                  <span className="text-sm font-bold text-white">Inspection — {selectedBatch.fileName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                    {selectedBatch.batchType || 'LAPTOP'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Business Snapshot: {selectedBatch.snapshotDate} | Ingested:{' '}
                  {new Date(selectedBatch.uploadedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-5 gap-3 text-center text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-slate-400 block">Total Records</span>
                <span className="text-base font-bold text-slate-800">{selectedBatch.recordCount}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-blue-500 block">New Records</span>
                <span className="text-base font-bold text-blue-600">{selectedBatch.newCount}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-amber-500 block">Changed / Actioned</span>
                <span className="text-base font-bold text-amber-600">{selectedBatch.changedCount}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-emerald-500 block">Unchanged</span>
                <span className="text-base font-bold text-emerald-600">{selectedBatch.unchangedCount}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-rose-500 block">Missing / Exited</span>
                <span className="text-base font-bold text-rose-600">{selectedBatch.missingCount}</span>
              </div>
            </div>

            {/* Staged Rows Sample */}
            <div className="p-6 flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Staged Rows Sample (up to 50 rows)
              </h4>
              {loadingDetails ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading batch records...</div>
              ) : batchDetails && batchDetails.stagedRows && batchDetails.stagedRows.length > 0 ? (
                <div className="border border-slate-200 rounded-lg max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase">
                      <tr>
                        <th className="py-2 px-3">Serial / ID</th>
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3">Changed Fields</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Location</th>
                        <th className="py-2 px-3">User Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {batchDetails.stagedRows.slice(0, 50).map((row) => (
                        <tr key={row.batchRowId} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-mono font-medium">{row.serialNumber}</td>
                          <td className="py-1.5 px-3">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100">
                              {row.changeType || 'STAGED'}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-slate-600">{row.changedFields || '—'}</td>
                          <td className="py-1.5 px-3">{row.status || '—'}</td>
                          <td className="py-1.5 px-3">{row.location}</td>
                          <td className="py-1.5 px-3">{row.userName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  No staged laptop rows recorded for this batch.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
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
