'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle } from 'lucide-react';
import { AxiosError } from 'axios';
import { ApiResponse } from '../../types';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  applicantName?: string;
}

export const RejectModal: React.FC<RejectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  applicantName = 'applicant',
}) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Rejection reason must be at least 5 characters long.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<ApiResponse>;
      setError(axiosErr.response?.data?.message || 'Failed to reject application');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reject Loan Application">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start space-x-3 text-rose-800 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p>
            You are rejecting the loan application for <strong>{applicantName}</strong>. This action is final and will notify the borrower with the written reason below.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Rejection Reason (Required)
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="Specify reason (e.g. Salary verification mismatched, credit criteria unmet...)"
            rows={3}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          {error && <p className="text-xs font-medium text-rose-600 mt-1">{error}</p>}
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" isLoading={isLoading}>
            Confirm Rejection
          </Button>
        </div>
      </form>
    </Modal>
  );
};
