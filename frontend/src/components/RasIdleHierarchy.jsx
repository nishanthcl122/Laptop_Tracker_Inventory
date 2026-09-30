import React, { useState } from 'react';
import { UserMinus, ChevronDown, MapPin, ChevronRight } from 'lucide-react';

export default function RasIdleHierarchy({ totalCount = 0, breakdown, onOpenModal }) {
  const [isTotalExpanded, setIsTotalExpanded] = useState(true);
  const [showAllPsa, setShowAllPsa] = useState(false);

  const total = breakdown?.total ?? totalCount ?? 0;
  const offshore = breakdown?.offshore || {};
  const offshoreTotal = offshore?.total ?? 0;
  const billableCount = offshore?.billable ?? 0;
  const unbillableCount = offshore?.unbillable ?? 0;
  const psaList = offshore?.billableByPsa ?? [];
  const onsiteCount = breakdown?.onsite ?? 0;
  const nearshoreCount = breakdown?.nearshore ?? 0;
  const unknownCount = breakdown?.unknown ?? 0;

  const displayedPsa = showAllPsa ? psaList : psaList.slice(0, 5);

  return (
    <div className="space-y-2.5">
      {/* Primary KPI Card: RAS Idle */}
      <div
        onClick={() => setIsTotalExpanded((prev) => !prev)}
        className="total-assets-card"
        title={isTotalExpanded ? 'Click to collapse breakdown' : 'Click to expand breakdown'}
        role="button"
        aria-expanded={isTotalExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsTotalExpanded((prev) => !prev);
          }
        }}
      >
        <div className="total-assets-copy">
          <div
            className="total-assets-icon"
            style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed' }}
          >
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <p className="eyebrow">Resource without Laptop</p>
            {/* <p className="muted">Active RAS staff without an allocated laptop</p> */}
          </div>
        </div>

        <div className="total-assets-value-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal({});
            }}
            className="total-assets-value hover:cursor-pointer"
            title="View all unallocated RAS resource"
          >
            <span className='font-medium'>{total.toLocaleString()}</span>
          </button>
          <span className="collapse-indicator">
            <ChevronDown
              className={"w-4 h-4 transition-transform duration-200 " + (isTotalExpanded ? "rotate-0" : "-rotate-90")}
            />
          </span>
        </div>
      </div>

      {/* Expanded Breakdown */}
      {isTotalExpanded && (
        <div className="space-y-2.5 transition-all duration-200 ease-out">
          {total === 0 ? (
            <div className="p-4 rounded-xl border border-slate-200/80 bg-white text-center text-xs text-slate-400">
              No resource without laptop found.
            </div>
          ) : (
            <>
              {/* Section Sub-heading */}
              <div className="px-0.5 pt-0.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Breakdown:
                </span>
              </div>

              {/* Grid: Row 1 = Offshore, Onsite; Row 2 = Nearshore, (Unknown if any) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                
                {/* 1. Onsite Card */}
                <button
                  type="button"
                  onClick={() => onOpenModal({ wbsType: 'Onsite' })}
                  className="flex flex-col justify-between p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-sky-50/30 hover:border-sky-300 transition-all text-left shadow-2xs group cursor-pointer"
                  title="Filter by Onsite staff"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#0284c7' }} />
                    <span className="text-[12px] font-semibold text-slate-700 group-hover:text-sky-900 transition-colors">
                      Onsite
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-sky-950 font-mono">
                      {onsiteCount.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Client site staff
                    </span>
                  </div>
                </button>

                {/* 2. Nearshore Card */}
                <button
                  type="button"
                  onClick={() => onOpenModal({ wbsType: 'Nearshore' })}
                  className="flex flex-col justify-between p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-emerald-50/30 hover:border-emerald-300 transition-all text-left shadow-2xs group cursor-pointer"
                  title="Filter by Nearshore staff"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#10b981' }} />
                    <span className="text-[12px] font-semibold text-slate-700 group-hover:text-emerald-900 transition-colors">
                      Nearshore
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-emerald-950 font-mono">
                      {nearshoreCount.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Nearshore staff
                    </span>
                  </div>
                </button>

                {/* 3. Offshore Card (includes nested Billable / Unbillable counts) */}
                <div className="flex flex-col justify-between p-2.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
                  <div
                    onClick={() => onOpenModal({ wbsType: 'Offshore' })}
                    className="flex items-center justify-between cursor-pointer group pb-2 border-b border-slate-100"
                    title="Filter by all Offshore staff"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#7c3aed' }} />
                      <span className="text-[12px] font-semibold text-slate-700 group-hover:text-purple-900 transition-colors">
                        Offshore
                      </span>
                    </div>
                    <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-purple-950 font-mono">
                      {offshoreTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Partitioned Sub-row: Billable vs Unbillable */}
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => onOpenModal({ wbsType: 'Offshore', billingClassification: 'Billable' })}
                      className="flex flex-col p-1.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-purple-50/50 hover:border-purple-200 transition-all text-left cursor-pointer group"
                      title="Filter by Billable Offshore staff"
                    >
                      <span className="text-[10px] font-semibold text-slate-500 group-hover:text-purple-800">
                        Billable
                      </span>
                      <span className="text-sm font-bold text-slate-900 group-hover:text-purple-950 font-mono mt-0.5">
                        {billableCount.toLocaleString()}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenModal({ wbsType: 'Offshore', billingClassification: 'Unbillable' })}
                      className="flex flex-col p-1.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-amber-50/50 hover:border-amber-200 transition-all text-left cursor-pointer group"
                      title="Filter by Unbillable Offshore staff"
                    >
                      <span className="text-[10px] font-semibold text-slate-500 group-hover:text-amber-800">
                        Unbillable
                      </span>
                      <span className="text-sm font-bold text-slate-900 group-hover:text-amber-950 font-mono mt-0.5">
                        {unbillableCount.toLocaleString()}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 4. Optional Unknown Card (only if unknownCount > 0) */}
                {unknownCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenModal({ wbsType: 'Unknown' })}
                    className="flex flex-col justify-between p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-all text-left shadow-2xs group cursor-pointer"
                    title="Filter by Unknown WBS staff"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#94a3b8' }} />
                      <span className="text-[12px] font-semibold text-slate-700">
                        Unknown
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-bold tracking-tight text-slate-900 font-mono">
                        {unknownCount.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Unclassified
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {/* Billable Offshore by PSA Section */}
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
                {/* Section Header */}
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    Billable Offshore — PSA
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 font-mono">
                    {billableCount.toLocaleString()} staff
                  </span>
                </div>

                {/* PSA Row List */}
                {psaList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center italic">
                    No billable Offshore PSA data.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {displayedPsa.map((item) => (
                      <button
                        key={item.psa}
                        type="button"
                        onClick={() =>
                          onOpenModal({
                            wbsType: 'Offshore',
                            billingClassification: 'Billable',
                            location: item.psa
                          })
                        }
                        className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-purple-50/50 transition-colors text-left cursor-pointer group"
                        title={`Filter by Billable Offshore at ${item.psa || 'Unknown'}`}
                      >
                        <span className="text-xs font-medium text-slate-700 group-hover:text-purple-900 truncate">
                          {item.psa || 'Unknown'}
                        </span>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-purple-950 font-mono tabular-nums ml-2">
                          {item.count.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Show All / Collapse Footer */}
                {psaList.length > 5 && (
                  <div className="p-2 border-t border-slate-100 bg-slate-50/30">
                    <button
                      type="button"
                      onClick={() => setShowAllPsa((prev) => !prev)}
                      className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer py-1"
                    >
                      <span>{showAllPsa ? 'Show fewer locations' : `View all locations (${psaList.length})`}</span>
                      <ChevronRight className={"w-3.5 h-3.5 transition-transform " + (showAllPsa ? "-rotate-90" : "rotate-90")} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
