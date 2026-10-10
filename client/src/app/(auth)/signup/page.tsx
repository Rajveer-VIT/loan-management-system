'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { signupFormSchema } from '../../../lib/validators';
import { useAuth } from '../../../context/AuthContext';
import { api, getApiError } from '../../../lib/api';
import { homePathFor } from '../../../lib/access';
import { AuthShell } from '../../../components/auth/AuthShell';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { ApiResponse, User } from '../../../types';

type SignupValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupFormSchema), defaultValues: { name: '', email: '', password: '' } });

  useEffect(() => {
    if (!authLoading && user) router.replace(homePathFor(user.role));
  }, [authLoading, user, router]);

  const onSubmit = async (values: SignupValues) => {
    setError(null);
    try {
      const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/signup', values);
      const { token, user: created } = res.data.data!;
      login(token, created);
      toast.success('Account created. Let’s check your eligibility.');
      router.replace('/apply/personal-details');
    } catch (err) {
      const info = getApiError(err, 'Sign-up failed');
      if (info.code === 'DUPLICATE_EMAIL') setFieldError('email', { message: info.message });
      else setError(info.message);
    }
  };

  return (
    <AuthShell
      title="Create your borrower account"
      subtitle="It takes a minute. You'll apply right after."
      aside={
        <>
          <h2 className="text-3xl font-semibold leading-tight">Apply in three steps.</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>Enter your details — eligibility is checked instantly.</li>
            <li>Upload your latest salary slip (PDF, JPG or PNG).</li>
            <li>Pick an amount (₹50,000–₹5,00,000) and tenure (30–365 days) at 12% p.a.</li>
          </ol>
        </>
      }
    >
      <div className="space-y-6">
        {error && <Alert tone="danger">{error}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input label="Full name" autoComplete="name" required {...register('name')} error={errors.name?.message} />
          <Input label="Email" type="email" autoComplete="email" required {...register('email')} error={errors.email?.message} />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              className="pr-10"
              {...register('password')}
              error={errors.password?.message}
              helperText="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-2 top-[30px] rounded p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <Button type="submit" isLoading={isSubmitting} loadingText="Creating account…" className="w-full">
            Create account
          </Button>
        </form>
        <p className="text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
