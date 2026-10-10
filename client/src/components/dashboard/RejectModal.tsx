'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Alert } from '../ui/Alert';
import { getApiError } from '../../lib/api';
import { REJECTION_REASON_MAX, REJECTION_REASON_MIN } from '../../lib/validators';

interface RejectModalProps {
  isOpen: boolean;
  applicantName: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const RejectModal: React.FC<RejectModalProps> = ({ isOpen, applicantName, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const close = () => {
    setReason('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < REJECTION_REASON_MIN) {
      setError(`Please give a reason of at least ${REJECTION_REASON_MIN} characters.`);
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(trimmed);
      close();
    } catch (err) {
      setError(getApiError(err, 'Could not reject the application').message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="Reject application" description={`Applicant: ${applicantName}`} preventClose={isSubmitting}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Alert tone="warning">Rejection is final. The borrower will see the reason you enter below.</Alert>
        <Textarea
          label="Reason for rejection"
          required
          rows={4}
          maxLength={REJECTION_REASON_MAX}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          error={error ?? undefined}
          helperText={`${reason.trim().length}/${REJECTION_REASON_MAX} characters (minimum ${REJECTION_REASON_MIN})`}
          placeholder="e.g. Net salary on the slip does not match the declared monthly income."
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" isLoading={isSubmitting} loadingText="Rejecting…">
            Reject application
          </Button>
        </div>
      </form>
    </Modal>
  );
};
