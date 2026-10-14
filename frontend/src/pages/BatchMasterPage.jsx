import React, { useEffect, useState } from 'react';
import {
  History,
  Eye,
  X,
  Laptop,
  Users,
  RefreshCw,
  Database,
  Plus,
  ArrowLeftRight,
  CircleCheck,
  CircleAlert
} from 'lucide-react';
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
    <div className="min-w-0 space-y-5 lg:-mx-5 lg:w-[calc(100%+2.5rem)]">
      {/* Header */}
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 shadow-inner">
            <History className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Batch Master Log
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
              Track laptop and workforce import history, reconciliation activity, and ingestion status.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
          {/* Type Filter Buttons */}
          <div className="inline-flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                typeFilter === 'ALL' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
              }`}
            >
              All Batches
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('LAPTOP')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                typeFilter === 'LAPTOP' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
              }`}
            >
              Laptop Batches
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('RAS')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                typeFilter === 'RAS' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
              }`}
            >
              RAS Batches
            </button>
          </div>

          <button
            type="button"
            onClick={fetchBatches}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Log
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto bg-slate-50/60 p-3 sm:p-4">
          <table className="w-full min-w-[1560px] border-separate border-spacing-y-1.5 text-left text-xs text-slate-600">
            <thead className="sticky top-0 z-10 bg-slate-100/95 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 shadow-sm backdrop-blur-md">
              <tr>
                <th className="whitespace-nowrap rounded-l-lg border-y border-l border-slate-200/80 bg-slate-100/95 px-4 py-3.5">Batch</th>
                <th className="whitespace-nowrap border-y border-slate-200/80 bg-slate-100/95 px-4 py-3.5">Type</th>
                <th className="whitespace-nowrap border-y border-slate-200/80 bg-slate-100/95 px-4 py-3.5">Snapshot Date</th>
                <th className="min-w-[280px] border-y border-slate-200/80 bg-slate-100/95 px-4 py-3.5">File Name</th>
                <th className="whitespace-nowrap border-y border-slate-200/80 bg-slate-100/95 px-4 py-3.5 text-right">Records</th>
                <th className="whitespace-nowrap border-y border-slate-200/80 bg-slate-100/95 px-4 py-3.5 text-right text-blue-700">New</th>
                <th className="whitespace-nowrap border-y border-slate-200/80 bg-slate-100/95 px-4 py-3.5 text-right text-amber-700">Changed / Transitioned</th>
                <th className="whitespace-nowrap border-y border-slate-200/80 bg-slate-100/95 px-4 py-3.5 text-right text-emerald-700">Same</th>
                <th className="whitespace-nowrap border-y border-slate-200/80 bg-slate-100/95 px-4 py-3.5 text-right text-rose-700">Missing</th>
                <th className="whitespace-nowrap border-y border-slate-200/80 bg-slate-100/95 px-4 py-3.5">Status</th>
                <th className="whitespace-nowrap border-y border-slate-200/80 bg-slate-100/95 px-4 py-3.5">Uploaded At</th>
                <th className="whitespace-nowrap rounded-r-lg border-y border-r border-slate-200/80 bg-slate-100/95 px-4 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="rounded-xl border border-slate-200/80 bg-white px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                      </span>
                      <p className="mt-4 text-sm font-semibold text-slate-800">Loading batch registry</p>
                      <p className="mt-1 text-xs text-slate-500">Retrieving import and reconciliation activity.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={12} className="rounded-xl border border-slate-200/80 bg-white px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                        <Database className="h-5 w-5" />
                      </span>
                      <p className="mt-4 text-sm font-semibold text-slate-800">No batches match the filter</p>
                      <p className="mt-1 text-xs text-slate-500">Try another batch type to view available imports.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const isConfirmed = batch.status === 'CONFIRMED';
                  const isFailed = batch.status === 'FAILED';
                  const isRas = (batch.batchType || '').toUpperCase() === 'RAS';
                  const isCommitted = batch.status === 'COMMITTED';

                  return (
                    <tr
                      key={batch.batchId}
                      onClick={() => handleSelectBatch(batch)}
                      className="group cursor-pointer transition-all duration-200 hover:-translate-y-px hover:drop-shadow-sm"
                    >
                      <td className="whitespace-nowrap rounded-l-xl border-y border-l border-slate-200/80 bg-white px-4 py-3.5 align-middle font-mono font-bold text-slate-900 transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        #{batch.batchId}
                      </td>
                      <td className="border-y border-slate-200/80 bg-white px-4 py-3.5 align-middle transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        {isRas ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                            <Users className="h-3.5 w-3.5 text-indigo-600" />
                            <span>RAS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                            <Laptop className="h-3.5 w-3.5 text-blue-600" />
                            <span>Laptop</span>
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap border-y border-slate-200/80 bg-white px-4 py-3.5 align-middle font-mono font-medium text-slate-700 transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        {batch.snapshotDate}
                      </td>
                      <td className="max-w-[380px] border-y border-slate-200/80 bg-white px-4 py-3.5 align-middle font-medium leading-5 text-slate-700 [overflow-wrap:anywhere] transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        {batch.fileName}
                      </td>
                      <td className="whitespace-nowrap border-y border-slate-200/80 bg-white px-4 py-3.5 text-right align-middle font-semibold tabular-nums text-slate-900 transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        {batch.recordCount.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap border-y border-slate-200/80 bg-white px-4 py-3.5 text-right align-middle font-semibold tabular-nums text-blue-700 transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        {batch.newCount}
                      </td>
                      <td className="whitespace-nowrap border-y border-slate-200/80 bg-white px-4 py-3.5 text-right align-middle font-semibold tabular-nums text-amber-700 transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        {batch.changedCount}
                      </td>
                      <td className="whitespace-nowrap border-y border-slate-200/80 bg-white px-4 py-3.5 text-right align-middle font-semibold tabular-nums text-emerald-700 transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        {batch.unchangedCount}
                      </td>
                      <td className="whitespace-nowrap border-y border-slate-200/80 bg-white px-4 py-3.5 text-right align-middle font-semibold tabular-nums text-rose-700 transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        {batch.missingCount}
                      </td>
                      <td className="whitespace-nowrap border-y border-slate-200/80 bg-white px-4 py-3.5 align-middle transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            isConfirmed || isCommitted
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : isFailed
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isConfirmed || isCommitted ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-amber-500'
                          }`} />
                          {batch.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-y border-slate-200/80 bg-white px-4 py-3.5 align-middle font-mono text-[11px] text-slate-500 transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        {new Date(batch.uploadedAt).toLocaleString()}
                      </td>
                      <td className="rounded-r-xl border-y border-r border-slate-200/80 bg-white px-4 py-3.5 text-center align-middle transition-colors group-hover:border-y-blue-100 group-hover:bg-blue-50/70">
                        <button
                          type="button"
                          aria-label={`View batch ${batch.batchId}`}
                          onClick={() => handleSelectBatch(batch)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
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
     
    </div>
  );
}
