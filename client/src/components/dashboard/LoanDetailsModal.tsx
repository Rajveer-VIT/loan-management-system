'use client';

import React from 'react';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { Skeleton } from '../ui/Skeleton';
import { LoanDetails } from './LoanDetails';
import { useApiData } from '../../hooks/useApi';
import { Loan } from '../../types';

interface LoanDetailsModalProps {
  /** Module-scoped detail endpoint, e.g. `/sanction/loans/:id`; null closes the modal. */
  detailPath: string | null;
  onClose: () => void;
  showSlip?: boolean;
  actions?: (loan: Loan) => React.ReactNode;
}

export const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({ detailPath, onClose, showSlip, actions }) => {
  const { data: loan, error, isLoading } = useApiData<Loan>(detailPath);

  return (
    <Modal isOpen={detailPath !== null} onClose={onClose} title="Loan details" size="lg">
      {error ? (
        <Alert tone="danger">{error}</Alert>
      ) : isLoading || !loan ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <LoanDetails loan={loan} showSlip={showSlip} />
          {actions && <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">{actions(loan)}</div>}
        </div>
      )}
    </Modal>
  );
};
