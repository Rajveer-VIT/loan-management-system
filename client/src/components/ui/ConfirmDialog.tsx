'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  confirmLabel: string;
  variant?: 'primary' | 'success' | 'danger';
  onConfirm: () => Promise<void>;
  onClose: () => void;
  children: React.ReactNode;
}

/** Confirmation step for consequential actions (approve, disburse, submit). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  confirmLabel,
  variant = 'primary',
  onConfirm,
  onClose,
  children,
}) => {
  const [isWorking, setIsWorking] = useState(false);

  const handleConfirm = async () => {
    setIsWorking(true);
    try {
      await onConfirm();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} preventClose={isWorking}>
      <div className="space-y-5">
        <div className="text-sm text-slate-600">{children}</div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isWorking}>
            Cancel
          </Button>
          <Button variant={variant} onClick={handleConfirm} isLoading={isWorking} data-autofocus>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
