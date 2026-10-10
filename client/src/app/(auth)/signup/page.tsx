'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupFormSchema } from '../../../lib/validators';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { ApiResponse } from '../../../types';

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: { name: string; email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/signup', data);
      if (res.data.success) {
        const { token, user } = res.data.data;
        login(token, user);
        toast.success('Account created successfully! Start your loan application.');
        router.push('/apply/personal-details');
      }
    } catch (error: unknown) {
      const axiosErr = error as AxiosError<ApiResponse>;
      toast.error(axiosErr.response?.data?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 p-12 text-white flex-col justify-between relative overflow-hidden">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white text-indigo-900 rounded-xl flex items-center justify-center font-bold shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight">FinFlow LMS</span>
        </div>

        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-black tracking-tight leading-tight">
            Apply for Personal Loans in 3 Simple Steps
          </h2>
          <p className="text-sm text-indigo-200 leading-relaxed">
            Create your borrower account to complete instant eligibility verification, upload salary slips, and configure your tenure.
          </p>
        </div>

        <div className="text-xs text-indigo-300">
          © 2026 FinFlow LMS • Fast, Transparent & Secure
        </div>
      </div>

      {/* Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Create Borrower Account</h2>
            <p className="text-sm text-gray-500 mt-1">Sign up to apply for personal loan instantly</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Rahul Sharma"
              {...register('name')}
              error={errors.name?.message as string}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="rahul@example.com"
              {...register('email')}
              error={errors.email?.message as string}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                {...register('password')}
                error={errors.password?.message as string}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full">
              Create Account & Begin Application
            </Button>
          </form>

          <div className="text-center text-xs text-gray-500 border-t border-gray-100 pt-4">
            Already registered?{' '}
            <Link href="/login" className="font-bold text-indigo-600 hover:underline">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
