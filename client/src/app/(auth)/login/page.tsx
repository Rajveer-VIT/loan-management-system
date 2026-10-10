'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginFormSchema } from '../../../lib/validators';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { ApiResponse } from '../../../types';

const DEMO_ACCOUNTS = [
  { role: 'Borrower', email: 'borrower@lms.com', pass: 'Borrower@123', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { role: 'Sanction', email: 'sanction@lms.com', pass: 'Sanction@123', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { role: 'Disburse', email: 'disbursement@lms.com', pass: 'Disburse@123', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { role: 'Collect', email: 'collection@lms.com', pass: 'Collect@123', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { role: 'Sales', email: 'sales@lms.com', pass: 'Sales@123', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { role: 'Admin', email: 'admin@lms.com', pass: 'Admin@123', color: 'bg-slate-100 text-slate-800 border-slate-300' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleDemoClick = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setValue('email', acc.email);
    setValue('password', acc.pass);
    toast.info(`Filled demo credentials for ${acc.role}`);
  };

  const onSubmit = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      if (res.data.success) {
        const { token, user } = res.data.data;
        login(token, user);
        toast.success(`Welcome back, ${user.name}!`);

        if (user.role === 'BORROWER') {
          router.push('/my-loans');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error: unknown) {
      const axiosErr = error as AxiosError<ApiResponse>;
      toast.error(axiosErr.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 p-12 text-white flex-col justify-between relative overflow-hidden">
        <div className="flex items-center space-x-3 z-10">
          <div className="w-10 h-10 bg-white text-indigo-900 rounded-xl flex items-center justify-center font-bold shadow-lg">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight">FinFlow LMS</span>
        </div>

        <div className="space-y-4 max-w-md z-10">
          <h2 className="text-3xl font-black tracking-tight leading-tight">
            Institutional-Grade Loan Management & Operations
          </h2>
          <p className="text-sm text-indigo-200/90 leading-relaxed">
            Multi-role operations workspace for Borrower application tracking, Underwriting reviews, Disbursement workflows, and Repayments.
          </p>
        </div>

        <div className="text-xs text-indigo-300/80 z-10">
          © 2026 FinFlow LMS • Role-Based Encrypted Platform
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Log In to Platform</h2>
            <p className="text-sm text-gray-500 mt-1">Select demo credentials or enter your account details</p>
          </div>

          {/* Quick Demo Login Chips */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Quick Demo Login Chips
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleDemoClick(acc)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all hover:scale-105 ${acc.color}`}
                >
                  {acc.role}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="user@example.com"
              {...register('email')}
              error={errors.email?.message as string}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                error={errors.password?.message as string}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full shadow-indigo-100">
              Log In
            </Button>
          </form>

          <div className="text-center text-xs text-gray-500 border-t border-gray-100 pt-4">
            Don't have a borrower account yet?{' '}
            <Link href="/signup" className="font-bold text-indigo-600 hover:underline">
              Sign Up Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
