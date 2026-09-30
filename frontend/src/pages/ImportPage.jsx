import React, { useState } from 'react';
import {
  UploadCloud, CheckCircle2, AlertTriangle, XCircle,
  ShieldCheck, RefreshCw, Laptop, Users, AlertOctagon,
  Eye, X, FileSpreadsheet, Info
} from 'lucide-react';
import { api } from '../services/api';

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
function isValidSpreadsheetFile(file) {
  if (!file || !file.name) return false;
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export default function ImportPage({ initialTab = 'laptop', onImportSuccess }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'laptop' | 'ras'

  // Laptop Import State
  const [laptopFile, setLaptopFile] = useState(null);
  const [laptopSnapshotDate, setLaptopSnapshotDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [laptopPreview, setLaptopPreview] = useState(null);
  const [laptopLoading, setLaptopLoading] = useState(false);
  const [laptopConfirming, setLaptopConfirming] = useState(false);
  const [laptopResult, setLaptopResult] = useState(null);
  const [laptopError, setLaptopError] = useState(null);

  // RAS Import State
  const [rasFile, setRasFile] = useState(null);
  const [rasSnapshotDate, setRasSnapshotDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rasPreview, setRasPreview] = useState(null);
  const [rasLoading, setRasLoading] = useState(false);
  const [rasConfirming, setRasConfirming] = useState(false);
  const [rasResult, setRasResult] = useState(null);
  const [rasError, setRasError] = useState(null);
  const [selectedRowDetail, setSelectedRowDetail] = useState(null);

  // --- Handlers for Laptop Import ---
  const handleLaptopUpload = async (e) => {
    e.preventDefault();
    if (!laptopFile) {
      setLaptopError('Please select a Laptop Excel file.');
      return;
    }
    setLaptopLoading(true);
    setLaptopError(null);

    const formData = new FormData();
    formData.append('file', laptopFile);
    formData.append('snapshotDate', laptopSnapshotDate);

    try {
      const data = await api.previewImport(formData);
      setLaptopPreview(data);
    } catch (err) {
      console.error(err);
      setLaptopError(err.response?.data?.message || 'Failed to process Laptop Excel file.');
    } finally {
      setLaptopLoading(false);
    }
  };

  const handleLaptopConfirm = async () => {
    if (!laptopPreview?.batchId) return;
    setLaptopConfirming(true);
    setLaptopError(null);

    try {
      const res = await api.confirmImport(laptopPreview.batchId);
      setLaptopResult(res);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      console.error(err);
      setLaptopError(err.response?.data?.message || 'Failed to commit laptop import batch.');
    } finally {
      setLaptopConfirming(false);
    }
  };

  const handleLaptopReset = () => {
    setLaptopFile(null);
    setLaptopPreview(null);
    setLaptopResult(null);
    setLaptopError(null);
  };

  // --- Handlers for RAS Import ---
  const handleRasUpload = async (e) => {
    e.preventDefault();
    if (!rasFile) {
      setRasError('Please select a RAS Excel file.');
      return;
    }
    setRasLoading(true);
    setRasError(null);

    const formData = new FormData();
    formData.append('file', rasFile);
    formData.append('snapshotDate', rasSnapshotDate);

    try {
      const data = await api.previewRas(formData);
      setRasPreview(data);
    } catch (err) {
      console.error(err);
      setRasError(err.response?.data?.message || 'Failed to process RAS Excel file.');
    } finally {
      setRasLoading(false);
    }
  };

  const handleRasConfirm = async () => {
    if (!rasPreview?.batchId) return;
    setRasConfirming(true);
    setRasError(null);

    try {
      const res = await api.confirmRas(rasPreview.batchId);
      setRasResult(res);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      console.error(err);
      setRasError(err.response?.data?.message || 'Failed to commit RAS reconciliation batch.');
    } finally {
      setRasConfirming(false);
    }
  };

  const handleRasReset = () => {
    setRasFile(null);
    setRasPreview(null);
    setRasResult(null);
    setRasError(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Excel Upload
        </h1>
        {/* <p className="text-xs text-slate-500">
          Upload daily Excel spreadsheets to compare with current inventory, detect changes, and reconcile workforce status safely.
        </p> */}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('laptop')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'laptop'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Laptop Details File Upload</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ras')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ras'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>RAS File Upload</span>
        </button>
      </div>

      {/* ======================= TAB 1: LAPTOP EXCEL ======================= */}
      {activeTab === 'laptop' && (
        <div className="space-y-5">
          {laptopError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-xs text-rose-800">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{laptopError}</span>
            </div>
          )}

          {/* Success Banner */}
          {laptopResult && laptopResult.success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{laptopResult.message}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block uppercase">Snapshot Date</span>
                  <span className="font-bold text-slate-800">{laptopResult.snapshotDate}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block uppercase">New Laptops</span>
                  <span className="font-bold text-blue-600">{laptopResult.newCount}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block uppercase">Changed Laptops</span>
                  <span className="font-bold text-amber-600">{laptopResult.changedCount}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block uppercase">Unchanged</span>
                  <span className="font-bold text-slate-700">{laptopResult.unchangedCount}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block uppercase">Missing</span>
                  <span className="font-bold text-rose-600">{laptopResult.missingCount}</span>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleLaptopReset}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Upload Another Laptop File
                </button>
              </div>
            </div>
          )}

          {/* Upload Form */}
          {(!laptopResult || !laptopResult.success) && (
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs">
              <form onSubmit={handleLaptopUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Laptop File (.xlsx, .xls, .csv)
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setLaptopPreview(null);
                        setLaptopResult(null);
                        if (!file) {
                          setLaptopFile(null);
                          setLaptopError(null);
                          return;
                        }
                        if (!isValidSpreadsheetFile(file)) {
                          setLaptopFile(null);
                          e.target.value = '';
                          setLaptopError('Only Excel (.xlsx, .xls) or CSV files are allowed.');
                          return;
                        }
                        setLaptopFile(file);
                        setLaptopError(null);
                      }}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-lg p-1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Business Snapshot Date
                    </label>
                    <input
                      type="date"
                      value={laptopSnapshotDate}
                      onChange={(e) => setLaptopSnapshotDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    Staged into temporary holding first. Please confirm to make changes in current table.
                  </span>
                  <button
                    type="submit"
                    disabled={!laptopFile || !isValidSpreadsheetFile(laptopFile) || laptopLoading}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    {laptopLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Validating & Staging...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload & Preview Comparison</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Validation Errors */}
          {laptopPreview && laptopPreview.errors && laptopPreview.errors.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-rose-800 font-semibold text-xs mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Validation Issues Encountered ({laptopPreview.errors.length})</span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-rose-200 rounded-lg bg-white">
                <table className="w-full text-left text-xs divide-y divide-rose-100">
                  <thead className="bg-rose-100/60 text-rose-900 text-[10px] font-semibold uppercase">
                    <tr>
                      <th className="py-1.5 px-3">Excel Row</th>
                      <th className="py-1.5 px-3">Field</th>
                      <th className="py-1.5 px-3">Error Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50 text-rose-700">
                    {laptopPreview.errors.map((err, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-3 font-mono font-bold">{err.row}</td>
                        <td className="py-1.5 px-3 font-medium">{err.field}</td>
                        <td className="py-1.5 px-3">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Laptop Preview Results */}
          {laptopPreview && (!laptopResult || !laptopResult.success) && (
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Staged Comparison Preview — Batch #{laptopPreview.batchId}
                  </h2>
                  <p className="text-xs text-slate-500">
                    File: <strong className="text-slate-700">{laptopPreview.fileName}</strong> | Business Snapshot:{' '}
                    <strong className="text-slate-700">{laptopPreview.snapshotDate}</strong>
                  </p>
                </div>

                <button
                  onClick={handleLaptopConfirm}
                  disabled={laptopConfirming || (laptopPreview.recordCount === 0 && laptopPreview.missingCount === 0)}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  {laptopConfirming ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Committing Transaction...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm & Commit Import</span>
                    </>
                  )}
                </button>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] font-medium uppercase text-slate-400 block">Total In File</span>
                  <span className="text-xl font-bold text-slate-800">{laptopPreview.recordCount}</span>
                </div>
                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-center">
                  <span className="text-[10px] font-medium uppercase text-blue-600 block">New Laptops</span>
                  <span className="text-xl font-bold text-blue-700">{laptopPreview.newCount}</span>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 text-center">
                  <span className="text-[10px] font-medium uppercase text-amber-600 block">Changed Laptops</span>
                  <span className="text-xl font-bold text-amber-700">{laptopPreview.changedCount}</span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-center">
                  <span className="text-[10px] font-medium uppercase text-emerald-600 block">Unchanged</span>
                  <span className="text-xl font-bold text-emerald-700">{laptopPreview.unchangedCount}</span>
                </div>
                <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-200 text-center">
                  <span className="text-[10px] font-medium uppercase text-rose-600 block">Missing In File</span>
                  <span className="text-xl font-bold text-rose-700">{laptopPreview.missingCount}</span>
                </div>
              </div>

              {/* Change Preview Table */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Action Preview (Sample of changes to be executed)
                </h3>
                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Serial Number</th>
                        <th className="py-2 px-3">Action Type</th>
                        <th className="py-2 px-3">Detected Changes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {laptopPreview.changePreview && laptopPreview.changePreview.length > 0 ? (
                        laptopPreview.changePreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-900 font-mono text-[11px]">
                              {item.serialNumber}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  item.changeType === 'NEW'
                                    ? 'bg-blue-100 text-blue-800'
                                    : item.changeType === 'CHANGED'
                                    ? 'bg-amber-100 text-amber-800'
                                    : item.changeType === 'MISSING'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {item.changeType}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {item.diffs && item.diffs.length > 0 ? (
                                <div className="space-y-0.5 text-[11px]">
                                  {item.diffs.map((d, dIdx) => (
                                    <div key={dIdx}>
                                      <span className="font-semibold text-slate-700">{d.field}:</span>{' '}
                                      <span className="text-rose-600 line-through">{d.before}</span>{' '}
                                      <span className="text-slate-400">→</span>{' '}
                                      <span className="text-emerald-600 font-semibold">{d.after}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span>{item.changedFields}</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-400">
                            All rows in this file are identical to current data (no changes required).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 2: RAS EXCEL ======================= */}
      {activeTab === 'ras' && (
        <div className="space-y-5">
          {rasError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-xs text-rose-800">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{rasError}</span>
            </div>
          )}

          {/* Success Banner */}
          {rasResult && rasResult.success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{rasResult.message}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block uppercase">Snapshot Date</span>
                  <span className="font-bold text-slate-800">{rasResult.snapshotDate}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block uppercase">Roster Records</span>
                  <span className="font-bold text-slate-800">{rasResult.recordCount}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block uppercase">New Employees</span>
                  <span className="font-bold text-blue-600">{rasResult.newCount}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block uppercase">Laptops To In-Stock</span>
                  <span className="font-bold text-amber-600">{rasResult.changedCount}</span>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleRasReset}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Upload Another RAS File
                </button>
              </div>
            </div>
          )}

          {/* Upload Form */}
          {(!rasResult || !rasResult.success) && (
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-3">
              {/* <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-lg text-xs text-blue-800">
                <strong>Dynamic Roster Ingestion:</strong> All Excel columns in your uploaded RAS file will be 100% captured and queryable. Key fields like <em>SAP ID</em>, <em>Employee Name</em>, <em>Location</em>, and <em>Last Working Day</em> are mapped to automatically reconcile laptop allocations.
              </div> */}

              <form onSubmit={handleRasUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Latest RAS File (.xlsx, .xls, .csv)
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setRasPreview(null);
                        setRasResult(null);
                        if (!file) {
                          setRasFile(null);
                          setRasError(null);
                          return;
                        }
                        if (!isValidSpreadsheetFile(file)) {
                          setRasFile(null);
                          e.target.value = '';
                          setRasError('Only Excel (.xlsx, .xls) or CSV files are allowed.');
                          return;
                        }
                        setRasFile(file);
                        setRasError(null);
                      }}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-lg p-1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Business Snapshot Date
                    </label>
                    <input
                      type="date"
                      value={rasSnapshotDate}
                      onChange={(e) => setRasSnapshotDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  {/*  */}
                  <button
                    type="submit"
                    disabled={!rasFile || !isValidSpreadsheetFile(rasFile) || rasLoading}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    {rasLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing RAS File...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload & Preview Reconciliation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* RAS Preview Results */}
          {rasPreview && (!rasResult || !rasResult.success) && (
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
              {/* Header with Mode & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-slate-800">
                      Staged RAS Import Preview — Batch #{rasPreview.batchId}
                    </h2>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      (rasPreview.mode === 'INITIAL' || !rasPreview.previousBaselineExists)
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}>
                      {(rasPreview.mode === 'INITIAL' || !rasPreview.previousBaselineExists) ? 'Initial Baseline' : 'Reconciliation'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    File: <strong className="text-slate-700">{rasPreview.fileName}</strong> | Business Snapshot:{' '}
                    <strong className="text-slate-700">{rasPreview.snapshotDate}</strong>
                  </p>
                </div>

                <button
                  onClick={handleRasConfirm}
                  disabled={rasConfirming || (rasPreview.validRows === 0 && rasPreview.totalRecords === 0)}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                >
                  {rasConfirming ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Committing Baseline...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {(rasPreview.mode === 'INITIAL' || !rasPreview.previousBaselineExists)
                          ? 'Confirm & Commit RAS Baseline'
                          : 'Confirm & Commit RAS Reconciliation'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Mode Context Banner */}
              {(rasPreview.mode === 'INITIAL' || !rasPreview.previousBaselineExists) ? (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex items-start space-x-2.5">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-blue-900 block">INITIAL RAS BASELINE</span>
                    <span className="text-[11px] text-blue-700">
                      No previous accepted RAS baseline exists. This file will establish the initial accepted workforce baseline ({rasPreview.validRows || rasPreview.totalRecords} valid source records, {rasPreview.distinctEmployees || rasPreview.baselineEmployees} distinct employees). Repeated SAP IDs are preserved across projects. Exited employee detection and laptop recovery transitions are not applicable for the initial baseline.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-lg flex items-start space-x-2.5">
                  <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">SUBSEQUENT RAS RECONCILIATION</span>
                    <span className="text-[11px] text-purple-700">
                      Reconciling against active baseline by distinct SAP ID. Laptops with employees who exited or are absent from this file will be flagged to transition to In Stock.
                    </span>
                  </div>
                </div>
              )}

              {/* Validation Errors Box if any */}
              {rasPreview.errors && rasPreview.errors.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5">
                  <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>File Validation Warnings ({rasPreview.errors.length}):</span>
                  </div>
                  <ul className="text-xs text-rose-700 space-y-1 pl-6 list-disc max-h-32 overflow-y-auto">
                    {rasPreview.errors.map((err, idx) => (
                      <li key={idx}>
                        {err.row > 0 ? `Row ${err.row}: ` : ''}{err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mapped Key Headers */}
              {rasPreview.detectedKeyColumns && Object.keys(rasPreview.detectedKeyColumns).length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Mapped Headers:</span>
                  {Object.entries(rasPreview.detectedKeyColumns).map(([key, mapped], idx) => (
                    <span key={idx} className="inline-flex items-center space-x-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
                      <span className="text-slate-500 font-medium">{key}:</span>
                      <strong className="text-blue-700 font-mono">{mapped}</strong>
                    </span>
                  ))}
                </div>
              )}

              {/* Detected Columns Chips */}
              {rasPreview.columnsDetected && rasPreview.columnsDetected.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                    Excel Columns Detected ({rasPreview.columnsDetected.length} total preserved in raw data):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    {rasPreview.columnsDetected.map((col, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-700">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode-Specific Metric Cards */}
              {(rasPreview.mode === 'INITIAL' || !rasPreview.previousBaselineExists) ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] font-medium uppercase text-slate-400 block">Total RAS Rows</span>
                    <span className="text-xl font-bold text-slate-800">{rasPreview.totalRows || rasPreview.totalRecords}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-center">
                    <span className="text-[10px] font-medium uppercase text-emerald-700 block">Valid Rows</span>
                    <span className="text-xl font-bold text-emerald-700">{rasPreview.validRows || rasPreview.totalRecords}</span>
                  </div>
                  <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-center">
                    <span className="text-[10px] font-medium uppercase text-blue-600 block">Distinct Employees</span>
                    <span className="text-xl font-bold text-blue-700">{rasPreview.distinctEmployees || rasPreview.baselineEmployees}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] font-medium uppercase text-slate-500 block">Exact Duplicates</span>
                    <span className="text-xl font-bold text-slate-600">{rasPreview.exactDuplicateRows || 0}</span>
                  </div>
                  <div className="p-3 bg-rose-50/80 rounded-lg border border-rose-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-rose-800 block">Invalid Rows</span>
                    <span className="text-xl font-bold text-rose-700">{rasPreview.invalidRows || 0}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] font-medium uppercase text-slate-400 block">Total RAS Rows</span>
                    <span className="text-xl font-bold text-slate-800">{rasPreview.totalRows || rasPreview.totalRecords}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-center">
                    <span className="text-[10px] font-medium uppercase text-emerald-700 block">Valid Rows</span>
                    <span className="text-xl font-bold text-emerald-700">{rasPreview.validRows || rasPreview.totalRecords}</span>
                  </div>
                  <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-center">
                    <span className="text-[10px] font-medium uppercase text-blue-600 block">Distinct Employees</span>
                    <span className="text-xl font-bold text-blue-700">{rasPreview.distinctEmployees || rasPreview.baselineEmployees}</span>
                  </div>
                  <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-center">
                    <span className="text-[10px] font-medium uppercase text-blue-600 block">New Employees</span>
                    <span className="text-xl font-bold text-blue-700">{rasPreview.newEmployeesCount}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] font-medium uppercase text-slate-500 block">Exited / Missing</span>
                    <span className="text-xl font-bold text-slate-700">{rasPreview.exitedEmployees ?? rasPreview.missingEmployeesCount}</span>
                  </div>
                  <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-300 text-center">
                    <span className="text-[10px] font-bold uppercase text-amber-800 block">Laptops To In-Stock</span>
                    <span className="text-xl font-bold text-amber-700">{rasPreview.laptopsToInStock ?? rasPreview.affectedLaptopsCount}</span>
                  </div>
                </div>
              )}

              {/* Staged Data Rows Preview Table */}
              {rasPreview.previewRows && rasPreview.previewRows.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Extracted Data Rows Preview ({rasPreview.previewRows.length} shown)
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Showing first {rasPreview.previewRows.length} valid rows from Excel
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg shadow-2xs">
                    <table className="w-full text-left text-xs divide-y divide-slate-200">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-3">Row #</th>
                          <th className="py-2 px-3">SAP ID / Employee Code</th>
                          <th className="py-2 px-3">Employee Name</th>
                          <th className="py-2 px-3">Location</th>
                          <th className="py-2 px-3">Last Working Day</th>
                          <th className="py-2 px-3 text-center">Status</th>
                          <th className="py-2 px-3 text-center">Raw Row (68 Cols)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {rasPreview.previewRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30">
                            <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{row.rowNumber}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900 font-mono text-[11px]">{row.sapId}</td>
                            <td className="py-2 px-3 text-slate-800 font-medium">{row.employeeName || '—'}</td>
                            <td className="py-2 px-3 text-slate-600">{row.location || '—'}</td>
                            <td className="py-2 px-3 text-slate-600">{row.lastWorkingDay || '—'}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                VALID
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedRowDetail(row)}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                                title="Inspect all Excel columns for this row"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Affected Laptops Table (for Reconciliation mode) */}
              {(rasPreview.mode !== 'INITIAL' && rasPreview.previousBaselineExists) && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center space-x-2">
                    <AlertOctagon className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Laptops Transitioning to IN_STOCK ({rasPreview.affectedLaptopsCount || 0})
                    </h3>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-amber-200 rounded-lg">
                    <table className="w-full text-left text-xs divide-y divide-slate-200">
                      <thead className="bg-amber-50/60 text-amber-900 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Serial Number</th>
                          <th className="py-2 px-3">FBR Request</th>
                          <th className="py-2 px-3">Assigned User</th>
                          <th className="py-2 px-3">Last Working Day</th>
                          <th className="py-2 px-3">Location</th>
                          <th className="py-2 px-3">Transition Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {rasPreview.affectedLaptops && rasPreview.affectedLaptops.length > 0 ? (
                          rasPreview.affectedLaptops.map((lap, idx) => (
                            <tr key={idx} className="hover:bg-amber-50/30">
                              <td className="py-2 px-3 font-semibold text-slate-900 font-mono text-[11px]">
                                {lap.serialNumber}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-700">{lap.fbrRequest || '—'}</td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-slate-800">{lap.userName || '—'}</span>
                                {lap.sapId && <span className="text-[10px] text-slate-400 block font-mono">{lap.sapId}</span>}
                              </td>
                              <td className="py-2 px-3 text-slate-600">{lap.lastWorkingDay || '—'}</td>
                              <td className="py-2 px-3 text-slate-600">{lap.location || '—'}</td>
                              <td className="py-2 px-3">
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                  {lap.transitionReason.replace(/_/g, ' ')}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-400">
                              No active laptop allocations affected. All allocated employees are present and current.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Row Detail Attribute Modal */}
          {selectedRowDetail && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
              onClick={() => setSelectedRowDetail(null)}
            >
              <div
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Row #{selectedRowDetail.rowNumber} Attributes ({selectedRowDetail.sapId})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Complete raw row extracted from Excel
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRowDetail(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-3">
                  {(() => {
                    let parsedData = {};
                    try {
                      parsedData = JSON.parse(selectedRowDetail.rawDataJson || '{}');
                    } catch {
                      parsedData = {};
                    }
                    const entries = Object.entries(parsedData);

                    return entries.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs divide-y divide-slate-200">
                          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                            <tr>
                              <th className="py-2 px-3 w-1/2">Excel Column</th>
                              <th className="py-2 px-3 w-1/2">Extracted Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {entries.map(([col, val], i) => (
                              <tr key={i} className="hover:bg-slate-50/60">
                                <td className="py-1.5 px-3 font-medium text-slate-700">{col}</td>
                                <td className="py-1.5 px-3 font-mono text-slate-900">{val || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">No attributes available.</p>
                    );
                  })()}
                </div>

                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedRowDetail(null)}
                    className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
