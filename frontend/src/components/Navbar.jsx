import React from 'react';
import { Laptop, LayoutDashboard, Users, UploadCloud, History } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'laptops', label: 'Laptop Details', icon: Laptop },
    { id: 'ras', label: 'RAS Data', icon: Users },
    { id: 'import', label: 'Excel Import & Reconcile', icon: UploadCloud },
    { id: 'batches', label: 'Batch Master Data', icon: History },
  ];

  return (
    <header className="premium-header">
      <div className="premium-header-inner">
        <div className="brand-area">
          <div className="brand-mark">
            <Laptop className="w-4 h-4" />
          </div>
          <div className="brand-copy">
            <span className="brand-name">LaptopTracker</span>
            {/* <span className="brand-divider">|</span> */}
            {/* <span className="brand-subtitle">Daily Excel Reconciliation & Inventory Monitoring</span> */}
          </div>
        </div>

        <nav className="top-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`nav-pill ${isActive ? 'nav-pill-active' : ''}`}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
