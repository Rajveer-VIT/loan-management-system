'use client';

import React, { useId, useRef, useState } from 'react';
import { CheckCircle2, FileText, UploadCloud, X } from 'lucide-react';
import { api, getApiError } from '../../lib/api';
import { formatFileSize } from '../../lib/format';
import { LOAN_CONFIG } from '../../lib/loanConfig';
import { ApiResponse, Loan, SalarySlip } from '../../types';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

/** Client-side pre-check (the server re-validates extension, MIME type, size and file content). */
export function validateSlipFile(file: { name: string; type: string; size: number }): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext) || (file.type && !ACCEPTED_MIME.includes(file.type))) {
    return 'Please choose a PDF, JPG or PNG file.';
  }
  if (file.size > LOAN_CONFIG.MAX_UPLOAD_BYTES) {
    return `This file is ${formatFileSize(file.size)}. The maximum size is 5 MB.`;
  }
  if (file.size === 0) return 'This file is empty.';
  return null;
}

interface SalarySlipUploaderProps {
  loanId: string;
  existingSlip?: SalarySlip;
  onUploaded: (loan: Loan) => void;
}

export const SalarySlipUploader: React.FC<SalarySlipUploaderProps> = ({ loanId, existingSlip, onUploaded }) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const choose = (candidate: File | undefined) => {
    if (!candidate) return;
    const problem = validateSlipFile(candidate);
    setError(problem);
    setFile(problem ? null : candidate);
  };

  const upload = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setError(null);
    setProgress(0);
    try {
      const res = await api.post<ApiResponse<Loan>>(`/borrower/loans/${loanId}/salary-slip`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded * 100) / e.total)),
      });
      setFile(null);
      onUploaded(res.data.data!);
    } catch (err) {
      setError(getApiError(err, 'Upload failed. Please try again.').message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      {existingSlip && !file && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{existingSlip.originalName}</p>
              <p className="text-xs text-slate-500">Uploaded · {formatFileSize(existingSlip.size)}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Replace file
          </Button>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          choose(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:p-8 ${
          dragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-8 w-8 text-brand-600" aria-hidden="true" />
            <p className="max-w-full truncate text-sm font-medium text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-sm text-slate-700">
              Drag and drop your salary slip here, or{' '}
              <label htmlFor={inputId} className="cursor-pointer font-semibold text-brand-700 underline-offset-2 hover:underline">
                browse files
              </label>
            </p>
            <p className="text-xs text-slate-500">PDF, JPG or PNG · up to 5 MB</p>
          </div>
        )}
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {progress !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {file && (
        <Button onClick={upload} isLoading={progress !== null} loadingText="Uploading…" className="w-full sm:w-auto">
          Upload salary slip
        </Button>
      )}
    </div>
  );
};
