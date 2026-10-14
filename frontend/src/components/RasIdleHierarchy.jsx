import React, { useState } from 'react';
import { UserMinus, ChevronDown, MapPin, ChevronRight } from 'lucide-react';

export default function RasIdleHierarchy({ totalCount = 0, breakdown, onOpenModal }) {
  const [isTotalExpanded, setIsTotalExpanded] = useState(true);
  const [showAllPsa, setShowAllPsa] = useState(false);
  const [isOffshoreExpanded, setIsOffshoreExpanded] = useState(true);
  const [isBillableExpanded, setIsBillableExpanded] = useState(true);

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
    <div className='ras'>
      {/* Primary KPI Card: RAS Idle */}
      <div
        onClick={() => setIsTotalExpanded((prev) => !prev)}
        className="total-assets-card m-0"
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
        <div className="space-y-1 transition-all duration-200 ease-out">
          {total === 0 ? (
            <div className="p-4 rounded-xl border border-slate-200/80 bg-white text-center text-xs text-slate-400">
              No resource without laptop found.
            </div>
          ) : (
            <>
              {/* Section Sub-heading */}
              <div className="px-0.5 pt-3">

              </div>

              {/* Grid: Row 1 = Offshore, Onsite; Row 2 = Nearshore, (Unknown if any) */}
              <div className="grid grid-cols-2 gap-2 mt-3">

                {/* 1. Onsite Card */}
                <button
                  type="button"
                  onClick={() => onOpenModal({ wbsType: 'Onsite' })}
                  className="onsite-card"
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
                    {/* <span className="text-[11px] text-slate-400 font-medium">
                      Client site staff
                    </span> */}
                  </div>
                </button>

                {/* 2. Nearshore Card */}
                <button
                  type="button"
                  onClick={() => onOpenModal({ wbsType: 'Nearshore' })}
                  className="nearshore-card"
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
                    {/* <span className="text-[11px] text-slate-400 font-medium">
                      Nearshore staff
                    </span> */}
                  </div>
                </button>

                {/* 3. Offshore Card (includes nested Billable / Unbillable counts) */}
                {/* Offshore Card */}
                <div className="offshore-card">
                  <div
                    className="offshore-header"
                    onClick={() => setIsOffshoreExpanded((prev) => !prev)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: '#7c3aed' }}
                      />
                      <span className="text-[12px] font-semibold text-slate-700">
                        Offshore
                      </span>
                    </div>

                    <div className="offshore-value-wrap">
                      <strong>{offshoreTotal.toLocaleString()}</strong>

                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${isOffshoreExpanded ? 'rotate-0' : '-rotate-90'
                          }`}
                      />
                    </div>
                  </div>

                  {isOffshoreExpanded && (
                    <div className="offshore-kpi-row">

                      <div className="offshore-billable-section">

                        <div
                          className="allocation-header offshore-billable-header"
                          onClick={() => setIsBillableExpanded((prev) => !prev)}
                        >
                          <div className="allocation-header-copy">
                            <span className="allocation-icon purple">
                              <MapPin className="w-4 h-4" />
                            </span>

                            <div>
                              <p className="allocation-label">Billable</p>
                            </div>
                          </div>

                          <div className="allocation-value-wrap">
                            <strong className="allocation-value">
                              {billableCount.toLocaleString()}
                            </strong>

                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${isBillableExpanded ? 'rotate-0' : '-rotate-90'
                                }`}
                            />
                          </div>
                        </div>

                        {isBillableExpanded && (
                          <div className="offshore-location-container">
                            <div className="offshore-location-grid">
                              {psaList.map((item) => (
                                <button
                                  key={item.psa}
                                  type="button"
                                  className="offshore-location-card"
                                  onClick={() =>
                                    onOpenModal({
                                      wbsType: 'Offshore',
                                      billingClassification: 'Billable',
                                      location: item.psa,
                                    })
                                  }
                                >
                                  <span
                                    className="offshore-location-name"
                                    title={(item.psa || 'Unknown').split('(')[0].trim()}
                                  >
                                    <span className="offshore-dot" />
                                    {(item.psa || 'Unknown').split('(')[0].trim()}
                                  </span>
                                  <strong>{item.count.toLocaleString()}</strong>

                                  {/* <small>Staff</small> */}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="allocation-header offshore-unbillable-header">
                        <div className="allocation-header-copy">
                          <span className="allocation-icon amber">
                            <UserMinus className="w-4 h-4" />
                          </span>

                          <div>
                            <p className="allocation-label">Unbillable</p>
                          </div>
                        </div>

                        <div className="allocation-value-wrap">
                          <strong className="allocation-value">
                            {unbillableCount.toLocaleString()}
                          </strong>

                          <span className="offshore-chevron-placeholder" />
                        </div>
                      </div>
                    </div>
                  )}
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

            </>
          )}
        </div>
      )}
    </div>
  );
}
