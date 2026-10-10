'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatFileSize } from '../../lib/format';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { ApiResponse, Loan, SalarySlip } from '../../types';

interface SalarySlipUploaderProps {
  loanId: string;
  existingSlip?: SalarySlip;
  onSuccess: (updatedLoan: Loan) => void;
}

export const SalarySlipUploader: React.FC<SalarySlipUploaderProps> = ({
  loanId,
  existingSlip,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are allowed.');
      return false;
    }
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB.');
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const res = await api.post(`/borrower/loans/${loanId}/salary-slip`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      if (res.data.success) {
        toast.success('Salary slip uploaded successfully!');
        onSuccess(res.data.data);
      }
    } catch (error: unknown) {
      const axiosErr = error as AxiosError<ApiResponse>;
      toast.error(axiosErr.response?.data?.message || 'Failed to upload salary slip');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      {existingSlip && !selectedFile && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{existingSlip.originalName}</p>
              <p className="text-xs text-gray-500">
                Uploaded • {formatFileSize(existingSlip.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="flex items-center text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Uploaded
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Replace
            </Button>
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-indigo-600 bg-indigo-50/50'
            : selectedFile
            ? 'border-indigo-400 bg-indigo-50/20'
            : 'border-gray-300 hover:border-indigo-400 bg-gray-50/50 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
              <FileText className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-gray-900">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove File
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="p-3 bg-white shadow-sm border border-gray-100 rounded-2xl text-indigo-600">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Click to upload or drag & drop salary slip
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: PDF, JPG, PNG (Max size: 5MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-gray-700">
            <span>Uploading document...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {selectedFile && (
        <Button
          onClick={handleUpload}
          isLoading={isUploading}
          className="w-full"
        >
          Upload & Continue
        </Button>
      )}
    </div>
  );
};
