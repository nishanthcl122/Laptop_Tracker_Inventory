import React, { useEffect, useState } from 'react';
import KpiCards from '../components/KpiCards';
import LaptopResultsModal from '../components/LaptopResultsModal';
import AuditModal from '../components/AuditModal';
import RasIdleModal from '../components/RasIdleModal';
import { api } from '../services/api';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);

  // Centered Laptop Results Modal state
  const [resultsModal, setResultsModal] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    filters: {}
  });

  // Selected laptop for detailed audit trail modal
  const [selectedLaptop, setSelectedLaptop] = useState(null);

  // RAS Idle Workforce Modal state
  const [rasIdleModalOpen, setRasIdleModalOpen] = useState(false);
  const [rasIdleFilters, setRasIdleFilters] = useState({});

  const openRasIdleModal = (filters = {}) => {
    if (typeof filters === 'string') {
      setRasIdleFilters({ location: filters });
    } else {
      setRasIdleFilters(filters || {});
    }
    setRasIdleModalOpen(true);
  };

  // Load Dashboard Summary
  const loadDashboardMetrics = () => {
    api.getDashboardSummary().then(setSummary).catch(console.error);
  };

  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  // Helper to open the reusable LaptopResultsModal
  const openResultsModal = (config) => {
    setResultsModal({
      isOpen: true,
      title: config.title || 'Filtered Laptops',
      subtitle: config.subtitle || '',
      filters: config.filters || {}
    });
  };

  const closeResultsModal = () => {
    setResultsModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Handle LWD Risk Bucket Clicks -> Open LaptopResultsModal with matching date filter
  const handleOpenLwdRiskModal = (bucketName) => {
    if (!bucketName) {
      openResultsModal({
        title: 'LWD ≤ 15 Days Exit Risk',
        subtitle: 'Allocated laptops whose assigned resource has Last Working Day within the next 15 days',
        filters: { status: 'Allocated', lwdApproaching15Days: true }
      });
      return;
    }

    const formatDateStr = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const d = new Date();
    d.setHours(0, 0, 0, 0);

    let fromStr = '';
    let toStr = '';
    let isWindow = false;

    const valLower = (bucketName || '').toLowerCase();
    if (valLower.includes('overdue')) {
      const yesterday = new Date(d);
      yesterday.setDate(yesterday.getDate() - 1);
      toStr = formatDateStr(yesterday);
    } else if (bucketName.includes('0–7') || bucketName.includes('0-7')) {
      const plus7 = new Date(d);
      plus7.setDate(plus7.getDate() + 7);
      fromStr = formatDateStr(d);
      toStr = formatDateStr(plus7);
    } else if (bucketName.includes('8–15') || bucketName.includes('8-15')) {
      const plus8 = new Date(d);
      plus8.setDate(plus8.getDate() + 8);
      const plus15 = new Date(d);
      plus15.setDate(plus15.getDate() + 15);
      fromStr = formatDateStr(plus8);
      toStr = formatDateStr(plus15);
    } else if (bucketName.includes('15') || bucketName.includes('> 15')) {
      const plus16 = new Date(d);
      plus16.setDate(plus16.getDate() + 16);
      fromStr = formatDateStr(plus16);
    } else {
      isWindow = true;
    }

    openResultsModal({
      title: `LWD Exit Risk: ${bucketName}`,
      subtitle: `Allocated laptops with Last Working Day in ${bucketName} window`,
      filters: {
        status: 'Allocated',
        lwdFrom: fromStr || undefined,
        lwdTo: toStr || undefined,
        lwdApproaching15Days: isWindow
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Top KPI Hierarchy Cards (Laptop Fleet & RAS Signals) */}
      <KpiCards
        summary={summary}
        onOpenResultsModal={openResultsModal}
        onOpenRasIdleModal={openRasIdleModal}
        onOpenLwdRiskModal={handleOpenLwdRiskModal}
      />

      {/* 3. Reusable Centered Laptop Results Modal */}
      {resultsModal.isOpen && (
        <LaptopResultsModal
          isOpen={resultsModal.isOpen}
          title={resultsModal.title}
          subtitle={resultsModal.subtitle}
          initialFilters={resultsModal.filters}
          onClose={closeResultsModal}
          onSelectLaptop={(lap) => setSelectedLaptop(lap)}
        />
      )}

      {/* 4. Audit History Lifecycle Modal */}
      {selectedLaptop && (
        <AuditModal
          laptop={selectedLaptop}
          onClose={() => setSelectedLaptop(null)}
        />
      )}

      {/* 5. RAS Idle Workforce Centered Modal */}
      {rasIdleModalOpen && (
        <RasIdleModal
          initialFilters={rasIdleFilters}
          initialLocation={rasIdleFilters.location || 'ALL'}
          onClose={() => setRasIdleModalOpen(false)}
        />
      )}
    </div>
  );
}
