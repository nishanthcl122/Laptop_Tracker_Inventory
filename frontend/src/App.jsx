import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ToastContainer from './components/ToastContainer';
import DashboardPage from './pages/DashboardPage';
import LaptopDetailsPage from './pages/LaptopDetailsPage';
import RasDataPage from './pages/RasDataPage';
import ImportPage from './pages/ImportPage';
import BatchMasterPage from './pages/BatchMasterPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [importInitialTab, setImportInitialTab] = useState('laptop');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImportSuccess = () => {
    setRefreshKey(k => k + 1);
    setActiveTab('dashboard');
  };

  const handleNavigateImport = (tab = 'laptop') => {
    setImportInitialTab(tab);
    setActiveTab('import');
  };

  return (
    <div className="premium-app-shell">
      <ToastContainer />
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="premium-main-shell">
        {activeTab === 'dashboard' && (
          <DashboardPage
            key={refreshKey}
            onNavigateDetails={() => setActiveTab('laptops')}
          />
        )}

        {activeTab === 'laptops' && (
          <LaptopDetailsPage key={refreshKey} />
        )}

        {activeTab === 'ras' && (
          <RasDataPage
            key={refreshKey}
            onNavigateImport={handleNavigateImport}
          />
        )}

        {activeTab === 'import' && (
          <ImportPage
            key={importInitialTab}
            initialTab={importInitialTab}
            onImportSuccess={handleImportSuccess}
          />
        )}

        {activeTab === 'batches' && (
          <BatchMasterPage key={refreshKey} />
        )}
      </main>

      <footer className="premium-footer">
        Laptop Tracking & Daily Excel Reconciliation System &bull; Enterprise Asset Audit &bull; ASP.NET Core & EF Core SQL Server
      </footer>
    </div>
  );
}
