import React, { useEffect, useState } from 'react';
import {
  X,
  History,
  Clock,
  CheckCircle2,
  PencilLine,
  Laptop,
  ChevronDown,
  MapPin,
  UserRound,
  CalendarDays,
  Activity
} from 'lucide-react';
import dayjs from 'dayjs';
import { api } from '../services/api';
import { toast } from '../utils/toast';

export default function AuditModal({ laptop, onClose }) {
  const [currentLaptop, setCurrentLaptop] = useState(laptop);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAuditExpanded, setIsAuditExpanded] = useState(false);
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Allocated
        </span>
      );
    }
    if (s === 'IN STOCK' || s === 'IN_STOCK') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      );
    }
    if (s === 'LOST') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Lost
        </span>
      );
    }
    if (s === 'NOT_IN_UHG' || s === 'NOT IN UHG') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
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
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-400/15 border border-blue-200/20 flex items-center justify-center text-blue-100 shadow-inner">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2.5">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Laptop Lifecycle Explorer
                </h2>
                <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-blue-400/15 text-blue-100 rounded-full border border-blue-200/25">
                  {currentLaptop.serialNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300/80 mt-1">Asset assignment, lifecycle details, and historical changes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto bg-slate-50/70 p-5 sm:p-6 space-y-5">
          {/* Laptop identity hero */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 px-5 py-5 sm:px-6 sm:py-6 text-white">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-blue-100 shadow-inner">
                    <Laptop className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200/75">Laptop identity</p>
                    <p className="mt-1 break-all font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {currentLaptop.serialNumber}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {getStatusBadge(statusVal)}
                      {getRasBadge(currentLaptop.rasStatus)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm sm:justify-end">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-blue-100">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-300/70">Assigned to</p>
                      <p className="mt-0.5 font-semibold text-white">{userNameVal}</p>
                      <p className="font-mono text-[11px] text-slate-300/80">SAP {sapIdVal}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-2 border-t border-white/10 pt-4 text-xs sm:grid-cols-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-blue-200/80" />
                  <span className="text-slate-400">Location</span>
                  <span className="font-medium text-white">{currentLaptop.location || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <History className="h-3.5 w-3.5 text-blue-200/80" />
                  <span className="text-slate-400">FBR Request</span>
                  <span className="font-mono font-medium text-white">{fbrVal}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Summary KPIs */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
              <div className="mt-2">{getStatusBadge(statusVal)}</div>
            </div>
            <div className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Owner</p>
              <p className="mt-1.5 truncate text-sm font-semibold text-slate-800">{userNameVal}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Stock ageing</p>
              <p className="mt-1.5 text-sm font-semibold text-slate-800">
                {currentLaptop.ageingDays !== null && currentLaptop.ageingDays !== undefined
                  ? `${currentLaptop.ageingDays} days`
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Audit records</p>
              <p className="mt-1.5 text-sm font-semibold tabular-nums text-slate-800">{audits.length}</p>
            </div>
          </section>

          {/* Current assignment and edit action */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Current assignment</p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">Asset details</h3>
              </div>
              <div className="flex items-center gap-2">
                {canRecoverLaptop && (
                  <button
                    type="button"
                    onClick={openEditForm}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-100 cursor-pointer"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Recover / Update Laptop
                  </button>
                )}
              </div>
            </div>

            {isEditOpen && (
              <form onSubmit={handleEditSubmit} className="mb-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Recover / Update Laptop</h4>
                    <p className="mt-0.5 text-[11px] text-slate-500">Update the asset assignment and inventory details.</p>
                  </div>
                  <button type="button" onClick={() => setIsEditOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-white hover:text-slate-700">Cancel</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <label className="space-y-1">
                    <span className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Move to / Status</span>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    >
                      <option value="In Stock">In Stock</option>
                      <option value="Allocated">Allocated</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Location</span>
                    <input
                      value={editForm.location}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </label>

                  {editForm.status === 'In Stock' ? (
                    <label className="space-y-1">
                      <span className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider">In Stock Since</span>
                      <input
                        type="date"
                        value={editForm.inStockSince}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, inStockSince: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    </label>
                  ) : (
                    <>
                      <label className="space-y-1">
                        <span className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider">SAP ID</span>
                        <input
                          value={editForm.sapId}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, sapId: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider">User Name</span>
                        <input
                          value={editForm.userName}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, userName: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                      </label>
                    </>
                  )}

                  <label className="space-y-1">
                    <span className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider">FBR Request</span>
                    <input
                      value={editForm.fbrRequest}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, fbrRequest: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </label>

                  {editForm.status === 'Allocated' && (
                    <label className="space-y-1">
                      <span className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider">IT SPOC</span>
                      <input
                        value={editForm.itSpoc}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, itSpoc: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    </label>
                  )}
                </div>

                <div className="flex justify-end border-t border-blue-100 pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="text-xs font-semibold text-slate-800">Asset Details</h4>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">FBR Request</dt><dd className="mt-1 truncate font-mono font-medium text-slate-700">{fbrVal}</dd></div>
                  <div><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Location</dt><dd className="mt-1 truncate font-medium text-slate-700">{currentLaptop.location || '—'}</dd></div>
                  <div><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Status</dt><dd className="mt-1">{getStatusBadge(statusVal)}</dd></div>
                  <div><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">IT SPOC</dt><dd className="mt-1 truncate font-medium text-slate-700">{itSpocVal}</dd></div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="text-xs font-semibold text-slate-800">Workforce Details</h4>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">User Name</dt><dd className="mt-1 truncate font-medium text-slate-700">{userNameVal}</dd></div>
                  <div><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">SAP ID</dt><dd className="mt-1 truncate font-mono font-medium text-slate-700">{sapIdVal}</dd></div>
                  <div className="col-span-2"><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">RAS Status</dt><dd className="mt-1">{getRasBadge(currentLaptop.rasStatus)}</dd></div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="text-xs font-semibold text-slate-800">Lifecycle Details</h4>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Start Date</dt><dd className="mt-1 font-mono text-slate-600">{formatDate(currentLaptop.startDate)}</dd></div>
                  <div><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">End Date</dt><dd className="mt-1 font-mono text-slate-600">{formatDate(currentLaptop.endDate)}</dd></div>
                  <div><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Last Working Day</dt><dd className="mt-1 font-mono text-slate-600">{formatDate(currentLaptop.lastWorkingDay)}</dd></div>
                  <div><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">In Stock Since</dt><dd className="mt-1 font-mono text-slate-600">{formatDate(currentLaptop.inStockSince)}</dd></div>
                  <div className="col-span-2"><dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Stock Ageing</dt><dd className="mt-1 font-semibold text-slate-700">{currentLaptop.ageingDays !== null && currentLaptop.ageingDays !== undefined ? `${currentLaptop.ageingDays} days` : '—'}</dd></div>
                </dl>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Activity className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Latest Activity</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">Current assignment and most recent audit timestamp</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Last Updated</p>
                <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  {audits[0]?.recordedAt
                    ? dayjs(audits[0].recordedAt).format('DD-MMM-YYYY HH:mm')
                    : 'No audit activity recorded'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-5">
              <div><p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Employee Name</p><p className="mt-1 truncate text-xs font-semibold text-slate-800">{userNameVal}</p></div>
              <div><p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">SAP ID</p><p className="mt-1 truncate font-mono text-xs font-medium text-slate-700">{sapIdVal}</p></div>
              <div><p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Location</p><p className="mt-1 truncate text-xs font-medium text-slate-700">{currentLaptop.location || '—'}</p></div>
              <div><p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Status</p><div className="mt-1">{getStatusBadge(statusVal)}</div></div>
              <div><p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">RAS Status</p><div className="mt-1">{getRasBadge(currentLaptop.rasStatus)}</div></div>
            </div>
          </section>

          {/* Historical changes, newest first */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Historical Changes</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">{audits.length} {audits.length === 1 ? 'record' : 'records'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditExpanded((expanded) => !expanded)}
                aria-expanded={isAuditExpanded}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 cursor-pointer"
              >
                {isAuditExpanded ? 'Hide Detailed Audit Records' : 'Show Detailed Audit Records'}
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isAuditExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isAuditExpanded && (loading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading previous records...</span>
              </div>
            ) : audits.length === 0 ? (
              <div className="mx-5 mb-5 flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-xs text-slate-500">
                <CheckCircle2 className="mb-2 h-9 w-9 text-slate-300" />
                <span>No previous records recorded for this laptop yet (initial baseline state).</span>
              </div>
            ) : (
              <div className="mx-4 mb-4 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-50/60 p-2">
                <table className="w-full border-separate border-spacing-x-0 border-spacing-y-1.5 text-xs text-left">
                  <thead className="bg-slate-100/95 text-slate-600 font-semibold text-[10px] uppercase tracking-wider backdrop-blur-md">
                    <tr>
                      <th className="rounded-l-lg border-y border-l border-slate-200 px-3 py-3 whitespace-nowrap">#</th>
                      <th className="border-y border-slate-200 px-3 py-3 whitespace-nowrap">Recorded At</th>
                      <th className="border-y border-slate-200 px-3 py-3 whitespace-nowrap">Status</th>
                      <th className="border-y border-slate-200 px-3 py-3 whitespace-nowrap">SAP ID</th>
                      <th className="border-y border-slate-200 px-3 py-3 whitespace-nowrap">User Name</th>
                      <th className="border-y border-slate-200 px-3 py-3 whitespace-nowrap">IT SPOC</th>
                      <th className="border-y border-slate-200 px-3 py-3 text-center whitespace-nowrap">RAS Status</th>
                      <th className="border-y border-slate-200 px-3 py-3 whitespace-nowrap">FBR Request</th>
                      <th className="border-y border-slate-200 px-3 py-3 whitespace-nowrap">Location</th>
                      <th className="border-y border-slate-200 px-3 py-3 whitespace-nowrap">Start Date</th>
                      <th className="border-y border-slate-200 px-3 py-3 whitespace-nowrap">End Date</th>
                      <th className="border-y border-slate-200 px-3 py-3 whitespace-nowrap">Last Working Day</th>
                      <th className="rounded-r-lg border-y border-r border-slate-200 px-3 py-3 whitespace-nowrap">In Stock Since</th>
                    </tr>
                  </thead>
                  <tbody>
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
                        <tr key={item.auditId || idx} className="group transition-all duration-200 hover:-translate-y-px hover:drop-shadow-sm">
                          <td className="rounded-l-lg border-y border-l border-slate-200/80 bg-white px-3 py-3 font-mono text-[11px] text-slate-400 font-semibold shadow-sm transition-colors group-hover:bg-blue-50/70">
                            #{audits.length - idx}
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 font-mono text-[10px] text-slate-500 whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            {dayjs(item.recordedAt).format('DD-MMM-YYYY HH:mm')}
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                              isAlloc
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isAlloc ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                              {prevStatus}
                            </span>
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 font-mono text-slate-700 text-[11px] whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            {prevSap}
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 font-medium text-slate-800 whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            {prevUser}
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 text-slate-700 whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            {prevSpoc}
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 text-center whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            {getRasBadge(prevRas)}
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 font-mono text-slate-700 text-[11px] whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            {prevFbr}
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 text-slate-700 whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            {prevLoc}
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 font-mono text-slate-700 text-[11px] whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            {formatDate(prevStart)}
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 font-mono text-slate-700 text-[11px] whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            {formatDate(prevEnd)}
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 font-mono text-slate-700 text-[11px] whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            {formatDate(prevLwd)}
                          </td>
                          <td className="rounded-r-lg border-y border-r border-slate-200/80 bg-white px-3 py-3 font-mono text-slate-700 text-[11px] whitespace-nowrap shadow-sm transition-colors group-hover:bg-blue-50/70">
                            {formatDate(prevStockSince)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Esc</kbd> to close</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
