import React, { useEffect, useState } from 'react';
import { X, History, Clock, CheckCircle2, PencilLine } from 'lucide-react';
import dayjs from 'dayjs';
import { api } from '../services/api';
import { toast } from '../utils/toast';

export default function AuditModal({ laptop, onClose }) {
  const [currentLaptop, setCurrentLaptop] = useState(laptop);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    status: 'Allocated',
    location: '',
    fbrRequest: '',
    itSpoc: '',
    sapId: '',
    userName: '',
    inStockSince: ''
  });

  useEffect(() => {
    if (!laptop) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    setCurrentLaptop(laptop);
    setLoading(true);
    api.getLaptopAudit(laptop.serialNumber)
      .then(data => {
        setAudits(data || []);
      })
      .catch(err => {
        console.error('Failed to load audit history', err);
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [laptop, onClose]);

  if (!currentLaptop) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const parsed = dayjs(dateStr);
    return parsed.isValid() ? parsed.format('DD-MMM-YYYY') : dateStr;
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'ALLOCATED') {
      return (
        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Allocated
        </span>
      );
    }
    if (s === 'IN STOCK' || s === 'IN_STOCK') {
      return (
        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          In Stock
        </span>
      );
    }
    return <span className="text-slate-600 font-medium">{status || '—'}</span>;
  };

  const getRasBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Active
        </span>
      );
    }
    if (s === 'LOST') {
      return (
        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Lost
        </span>
      );
    }
    if (s === 'NOT_IN_UHG' || s === 'NOT IN UHG') {
      return (
        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Not in UHG
        </span>
      );
    }
    if (s === 'INACTIVE') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span>Inactive</span>
          <span className="px-1 py-0.2 bg-rose-200 text-rose-900 rounded text-[9px] font-extrabold uppercase">Lost</span>
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        {status || 'Unknown'}
      </span>
    );
  };

  const fbrVal = currentLaptop.fbrRequest || '—';
  const itSpocVal = currentLaptop.itSpoc || currentLaptop.itspoc || '—';
  const userNameVal = currentLaptop.userName || '—';
  const sapIdVal = currentLaptop.sapId || '—';
  const statusVal = currentLaptop.status || '—';
  const rasStatusVal = String(currentLaptop.rasStatus || '').toUpperCase();
  const canRecoverLaptop =
    (String(currentLaptop.status || '').toUpperCase() === 'ALLOCATED') &&
    (rasStatusVal === 'LOST' || rasStatusVal === 'NOT_IN_UHG' || currentLaptop.isLost === true);

  const openEditForm = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditForm({
      status: 'In Stock',
      location: currentLaptop.location || '',
      fbrRequest: currentLaptop.fbrRequest || '',
      itSpoc: currentLaptop.itSpoc || currentLaptop.itspoc || '',
      sapId: currentLaptop.sapId || '',
      userName: currentLaptop.userName || '',
      inStockSince: currentLaptop.inStockSince || today
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      status: editForm.status,
      fbrRequest: editForm.fbrRequest || currentLaptop.fbrRequest || '',
      location: editForm.location || currentLaptop.location || '',
      itsPOC: editForm.itSpoc,
      itSpoc: editForm.itSpoc,
      sapId: editForm.status === 'Allocated' ? (editForm.sapId || currentLaptop.sapId || '') : null,
      userName: editForm.status === 'Allocated' ? (editForm.userName || currentLaptop.userName || '') : null,
      inStockSince: editForm.status === 'In Stock' ? (editForm.inStockSince || new Date().toISOString().slice(0, 10)) : null
    };

    try {
      setSaving(true);
      const response = await api.updateLaptop(currentLaptop.serialNumber, payload);
      const updatedLaptop = response?.laptop || response;
      const nextLaptop = updatedLaptop || currentLaptop;
      setCurrentLaptop(nextLaptop);
      setIsEditOpen(false);
      setLoading(true);
      const [freshLaptop, freshAudits] = await Promise.all([
        api.getLaptop(currentLaptop.serialNumber),
        api.getLaptopAudit(currentLaptop.serialNumber)
      ]);
      setCurrentLaptop(freshLaptop);
      setAudits(freshAudits || []);
      toast.success('Laptop recovered and audit history updated.');
    } catch (error) {
      console.error('Failed to update laptop', error);
      const detail = error?.response?.data?.message || 'Unable to update the laptop at this time.';
      toast.error(detail);
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Laptop Allocation & Audit History
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-950 text-blue-300 rounded border border-blue-800">
                  {currentLaptop.serialNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">Complete historical records and audit tracking lifecycle log</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Current State */}
          <div className="bg-slate-50/90 rounded-lg p-4 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Current State (Accepted Laptop Details)
              </h3>
              <div className="flex items-center gap-2">
                {canRecoverLaptop && (
                  <button
                    type="button"
                    onClick={openEditForm}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 text-[10px] font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <PencilLine className="w-3 h-3" />
                    Edit / Update Laptop
                  </button>
                )}
                <span className="text-[11px] text-slate-500 font-mono">
                  Serial No: <strong className="text-slate-800 font-bold">{currentLaptop.serialNumber}</strong>
                </span>
              </div>
            </div>

            {isEditOpen && (
              <form onSubmit={handleEditSubmit} className="mb-4 rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Laptop Recovery / Edit</h4>
                  <button type="button" onClick={() => setIsEditOpen(false)} className="text-[10px] text-slate-500 hover:text-slate-700">Cancel</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Status</span>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="In Stock">In Stock</option>
                      <option value="Allocated">Allocated</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Location</span>
                    <input
                      value={editForm.location}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>

                  {editForm.status === 'In Stock' ? (
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">In Stock Since</span>
                      <input
                        type="date"
                        value={editForm.inStockSince}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, inStockSince: e.target.value }))}
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  ) : (
                    <>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">SAP ID</span>
                        <input
                          value={editForm.sapId}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, sapId: e.target.value }))}
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">User Name</span>
                        <input
                          value={editForm.userName}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, userName: e.target.value }))}
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                    </>
                  )}

                  <label className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">FBR Request</span>
                    <input
                      value={editForm.fbrRequest}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, fbrRequest: e.target.value }))}
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>

                  {editForm.status === 'Allocated' && (
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">IT SPOC</span>
                      <input
                        value={editForm.itSpoc}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, itSpoc: e.target.value }))}
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-3 py-1.5 rounded bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">FBR Request</span>
                <span className="font-mono font-semibold text-slate-800">{fbrVal}</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Location</span>
                <span className="font-semibold text-slate-800">{currentLaptop.location || '—'}</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Status</span>
                <div>{getStatusBadge(statusVal)}</div>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">IT SPOC</span>
                <span className="font-semibold text-slate-800 truncate block">{itSpocVal}</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">SAP ID</span>
                <span className="font-mono font-semibold text-slate-800">{sapIdVal}</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">User Name</span>
                <span className="font-medium text-slate-800 truncate block">{userNameVal}</span>
              </div>

              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">RAS Status</span>
                <div>{getRasBadge(currentLaptop.rasStatus)}</div>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Start Date</span>
                <span className="font-mono text-slate-800">{formatDate(currentLaptop.startDate)}</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">End Date</span>
                <span className="font-mono text-slate-800">{formatDate(currentLaptop.endDate)}</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Last Working Day</span>
                <span className="font-mono text-slate-800">{formatDate(currentLaptop.lastWorkingDay)}</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">In Stock Since</span>
                <span className="font-mono text-slate-800">{formatDate(currentLaptop.inStockSince)}</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Stock Ageing</span>
                <span className="font-mono font-semibold text-slate-800">
                  {currentLaptop.ageingDays !== null && currentLaptop.ageingDays !== undefined ? `${currentLaptop.ageingDays} days` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Previous Records / Allocation History (Newest First) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Previous Records & Allocation History</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {audits.length} previous record{audits.length === 1 ? '' : 's'} preserved
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading previous records...</span>
              </div>
            ) : audits.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No previous records recorded for this laptop yet (initial baseline state).</span>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs bg-white">
                <table className="w-full text-xs text-left divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3 whitespace-nowrap">#</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Recorded At</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">SAP ID</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">User Name</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">IT SPOC</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">RAS Status</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">FBR Request</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Location</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Start Date</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">End Date</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Last Working Day</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">In Stock Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {audits.map((item, idx) => {
                      const prevStatus = item.previousStatus || '—';
                      const isAlloc = (prevStatus || '').toUpperCase() === 'ALLOCATED';
                      const prevFbr = item.previousFbrRequest || item.previousFBRRequest || '—';
                      const prevSpoc = item.previousItspoc || item.previousItSpoc || item.previousITSPOC || '—';
                      const prevUser = item.previousUserName || '—';
                      const prevSap = item.previousSapId || item.previousSAPId || '—';
                      const prevRas = item.previousRasStatus || item.previousRASStatus || '—';
                      const prevLoc = item.previousLocation || '—';
                      const prevStart = item.previousStartDate;
                      const prevEnd = item.previousEndDate;
                      const prevLwd = item.previousLastWorkingDay;
                      const prevStockSince = item.previousInStockSince;

                      return (
                        <tr key={item.auditId || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 font-semibold">
                            #{audits.length - idx}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                            {dayjs(item.recordedAt).format('DD-MMM-YYYY HH:mm')}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isAlloc
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {prevStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                            {prevSap}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                            {prevUser}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                            {prevSpoc}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {getRasBadge(prevRas)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                            {prevFbr}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                            {prevLoc}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                            {formatDate(prevStart)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                            {formatDate(prevEnd)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                            {formatDate(prevLwd)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                            {formatDate(prevStockSince)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Esc</kbd> to close</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
