import React, { useState } from 'react';
import {
  Laptop,
  CheckCircle2,
  Package,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import RasIdleHierarchy from './RasIdleHierarchy';
import LwdRiskHierarchy from './LwdRiskHierarchy';

export default function KpiCards({
  summary,
  onOpenResultsModal,
  onOpenRasIdleModal,
  onOpenLwdRiskModal
}) {
  const [isTotalExpanded, setIsTotalExpanded] = useState(true);
  const [isAllocatedExpanded, setIsAllocatedExpanded] = useState(true);
  const [isInStockExpanded, setIsInStockExpanded] = useState(true);

  const totalCount = summary?.totalLaptops ?? 0;
  const allocatedCount = summary?.allocatedLaptops ?? 0;
  const inStockCount = summary?.inStock ?? 0;
  const locationBreakdown = summary?.locationBreakdown ?? [];
  const rasActiveCount = summary?.rasActive ?? 0;
  const lostCount = summary?.lost ?? 0;
  const notInUhgCount = summary?.notInUhg ?? 0;
  const rasIdleCount = summary?.rasIdle ?? 0;
  const lwd15Count = summary?.lwdApproaching15Days ?? 0;

  return (
    <div className="kpi-section">
      <section className="premium-panel asset-panel">
        <div className="panel-header">
          <div className="section-badge">
            <span className="dot" />
            <span>Laptop fleet</span>
          </div>
          <span className="panel-meta">
            Total {totalCount.toLocaleString()} = Allocated {allocatedCount.toLocaleString()} + In Stock {inStockCount.toLocaleString()}
          </span>
        </div>

        <div
          onClick={() => setIsTotalExpanded((prev) => !prev)}
          className="total-assets-card"
          title={isTotalExpanded ? 'Click to collapse child categories' : 'Click to expand child categories'}
        >
          <div className="total-assets-copy">
            <div className="total-assets-icon">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <p className="eyebrow">Total laptops</p>
              <p className="muted">Complete fleet in registry</p>
            </div>
          </div>

          <div className="total-assets-value-wrap">
            <strong className="total-assets-value">{totalCount.toLocaleString()}</strong>
            <span className="collapse-indicator">
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isTotalExpanded ? 'rotate-0' : '-rotate-90'}`} />
            </span>
          </div>
        </div>

        {isTotalExpanded && (
          <div className="fleet-grid">
            <div className="allocation-card">
              <div
                onClick={() => setIsAllocatedExpanded((prev) => !prev)}
                className="allocation-header"
                title={isAllocatedExpanded ? 'Click to collapse breakdown' : 'Click to expand breakdown'}
              >
                <div className="allocation-header-copy">
                  <span className="allocation-icon blue">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="allocation-label">Allocated</p>
                    <p className="allocation-meta">Active + Lost + Not in UHG</p>
                  </div>
                </div>

                <div className="allocation-value-wrap">
                  <strong className="allocation-value">{allocatedCount.toLocaleString()}</strong>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAllocatedExpanded ? 'rotate-0' : '-rotate-90'}`} />
                </div>
              </div>

              {isAllocatedExpanded && (
                <div className="allocation-subgrid">
                  <button
                    type="button"
                    className="mini-stat success"
                    onClick={() => onOpenResultsModal({
                      title: 'RAS Active Laptops',
                      subtitle: 'Allocated laptops whose assigned staff is present in latest RAS roster',
                      filters: { status: 'Allocated', rasStatus: 'ACTIVE', isLost: false }
                    })}
                  >
                    <span className="mini-stat-label"><span className="dot green" />Active</span>
                    <strong>{rasActiveCount.toLocaleString()}</strong>
                    <small>In RAS</small>
                  </button>

                  <button
                    type="button"
                    className="mini-stat danger"
                    onClick={() => onOpenResultsModal({
                      title: 'Lost Laptops',
                      subtitle: 'Laptops whose assigned staff was missing during initial RAS baseline',
                      filters: { status: 'Allocated', rasStatus: 'LOST', isLost: true }
                    })}
                  >
                    <span className="mini-stat-label"><span className="dot red" />Lost</span>
                    <strong>{lostCount.toLocaleString()}</strong>
                    <small>Baseline</small>
                  </button>

                  <button
                    type="button"
                    className="mini-stat warning"
                    onClick={() => onOpenResultsModal({
                      title: 'Not in UHG Laptops',
                      subtitle: 'Allocated laptops whose assigned staff exited from subsequent RAS roster',
                      filters: { status: 'Allocated', rasStatus: 'NOT_IN_UHG', isLost: false }
                    })}
                  >
                    <span className="mini-stat-label"><span className="dot amber" />Not in UHG</span>
                    <strong>{notInUhgCount.toLocaleString()}</strong>
                    <small>Exited</small>
                  </button>
                </div>
              )}
            </div>

            <div className="in-stock-card">
              <div
                onClick={() => setIsInStockExpanded((prev) => !prev)}
                className="allocation-header"
                title={isInStockExpanded ? 'Click to collapse breakdown' : 'Click to expand breakdown'}
              >
                <div className="allocation-header-copy">
                  <span className="in-stock-icon">
                    <Package className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="allocation-label">In stock</p>
                    <p className="allocation-meta">Available inventory</p>
                  </div>
                </div>

                <div className="allocation-value-wrap">
                  <strong className="allocation-value">{inStockCount.toLocaleString()}</strong>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isInStockExpanded ? 'rotate-0' : '-rotate-90'}`} />
                </div>
              </div>

              {isInStockExpanded && (
                <div className="allocation-subgrid">
                  {locationBreakdown.length > 0 ? (
                    locationBreakdown.map((item) => (
                      <button
                        key={item.location}
                        type="button"
                        className="mini-stat success"
                        onClick={() => onOpenResultsModal({
                          title: `In Stock Laptops in ${item.location}`,
                          subtitle: `Laptops currently in stock at ${item.location}`,
                          filters: { status: 'In Stock', location: item.location }
                        })}
                      >
                        <span className="mini-stat-label"><span className="dot green" />{item.location}</span>
                        <strong>{item.count.toLocaleString()}</strong>
                        <small>In stock</small>
                      </button>
                    ))
                  ) : (
                    <div className="mini-stat success" style={{ gridColumn: '1 / -1' }}>
                      <span className="mini-stat-label"><span className="dot green" />No location data</span>
                      <strong>0</strong>
                      <small>In stock</small>
                    </div>
                  )}
                </div>
              )}

              <div
                className="in-stock-footer"
                onClick={() => onOpenResultsModal({
                  title: 'In Stock Laptops',
                  subtitle: 'Laptops currently available in project inventory',
                  filters: { status: 'In Stock' }
                })}
                style={{ cursor: 'pointer' }}
              >
                <span>View inventory</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="premium-panel risk-panel">
        <div className="panel-header">
          <div className="section-badge muted-badge">
            <span className="dot dark" />
            <span>RAS signals</span>
          </div>
          <span className="panel-meta">Roster analysis</span>
        </div>

        <RasIdleHierarchy
          totalCount={rasIdleCount}
          breakdown={summary?.rasIdleBreakdown}
          onOpenModal={(filters) => onOpenRasIdleModal(filters)}
        />

        <LwdRiskHierarchy
          totalCount={lwd15Count}
          breakdown={summary?.lwdRiskBreakdown}
          onOpenModal={(bucket) => onOpenLwdRiskModal(bucket)}
        />
      </aside>
    </div>
  );
}
