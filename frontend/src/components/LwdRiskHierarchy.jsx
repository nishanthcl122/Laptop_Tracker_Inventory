import React, { useState } from 'react';
import { CalendarClock, ChevronDown } from 'lucide-react';

const BUCKET_COLORS = {
  'Overdue': '#ef4444',
  '0–7 days': '#f59e0b',
  '0-7 days': '#f59e0b',
  '8–15 days': '#3b82f6',
  '8-15 days': '#3b82f6',
  '> 15 days': '#64748b'
};

export default function LwdRiskHierarchy({ totalCount = 0, breakdown = [], onOpenModal }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter or take existing buckets from breakdown
  const buckets = Array.isArray(breakdown) && breakdown.length > 0
    ? breakdown
    : [
        { name: 'Overdue', value: 0 },
        { name: '0–7 days', value: 0 },
        { name: '8–15 days', value: 0 }
      ];

  const hasAnyData = totalCount > 0 || buckets.some((b) => Number(b?.value ?? 0) > 0);

  return (
    <div className="space-y-2.5">
      {/* Primary KPI Card: LWD < 15 Days */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="total-assets-card"
        title={isExpanded ? 'Click to collapse breakdown' : 'Click to expand breakdown'}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
      >
        <div className="total-assets-copy">
          <div
            className="total-assets-icon"
            style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#d97706' }}
          >
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <p className="eyebrow">LWD &lt; 15 Days</p>
            {/* <p className="muted">Allocated assets with employee exit in &le; 15 days</p> */}
          </div>
        </div>

        <div className="total-assets-value-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(null);
            }}
            className="total-assets-value hover:underline cursor-pointer"
            title="View all upcoming LWD risk laptops"
          >
            {totalCount.toLocaleString()}
          </button>
          <span className="collapse-indicator">
            <ChevronDown
              className={"w-4 h-4 transition-transform duration-200 " + (isExpanded ? "rotate-0" : "-rotate-90")}
            />
          </span>
        </div>
      </div>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <div className="space-y-2.5 animate-in fade-in duration-200">
          {!hasAnyData ? (
            <div className="p-4 rounded-xl border border-slate-200/80 bg-white text-center text-xs text-slate-400">
              No upcoming LWD risks.
            </div>
          ) : (
            <>
              {/* Section Sub-heading */}
              <div className="px-0.5 pt-0.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  LWD Exit Risk Breakdown
                </span>
              </div>

              {/* Compact Breakdown List */}
              <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {buckets.map((bucket) => {
                  const val = Number(bucket?.value ?? 0);
                  const color = BUCKET_COLORS[bucket.name] || '#64748b';

                  return (
                    <button
                      key={bucket.name}
                      type="button"
                      onClick={() => onOpenModal(bucket.name)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-amber-50/40 transition-colors text-left cursor-pointer group"
                      title={`Filter by ${bucket.name}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: color }}
                        />
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                          {bucket.name}
                        </span>
                      </div>

                      <span className="text-xs font-bold text-slate-900 font-mono group-hover:text-amber-900 transition-colors">
                        {val.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
