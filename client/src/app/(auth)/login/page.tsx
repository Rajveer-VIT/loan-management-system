'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { loginFormSchema } from '../../../lib/validators';
import { useAuth } from '../../../context/AuthContext';
import { api, getApiError } from '../../../lib/api';
import { canAccessPath, homePathFor } from '../../../lib/access';
import { AuthShell } from '../../../components/auth/AuthShell';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { ApiResponse, ROLES, User } from '../../../types';

type LoginValues = z.infer<typeof loginFormSchema>;

// Seeded evaluator accounts (see README / `npm run seed`). Shown only to speed up testing.
const DEMO_ACCOUNTS: Array<{ role: string; email: string; password: string }> = [
  { role: 'Borrower', email: 'borrower@lms.com', password: 'Borrower@123' },
  { role: 'Admin', email: 'admin@lms.com', password: 'Admin@123' },
  { role: 'Sales', email: 'sales@lms.com', password: 'Sales@123' },
  { role: 'Sanction', email: 'sanction@lms.com', password: 'Sanction@123' },
  { role: 'Disbursement', email: 'disbursement@lms.com', password: 'Disburse@123' },
  { role: 'Collection', email: 'collection@lms.com', password: 'Collect@123' },
];

/** Only same-site paths the user may actually open are honoured as `?next=` targets. */
function safeNext(next: string | null, role: ROLES): string {
  if (next && next.startsWith('/') && !next.startsWith('//') && canAccessPath(role, next)) return next;
  return homePathFor(role);
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isLoading: authLoading, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginFormSchema), defaultValues: { email: '', password: '' } });

  // Already signed in → go straight to the right home page.
  useEffect(() => {
    if (!authLoading && user) router.replace(safeNext(params.get('next'), user.role));
  }, [authLoading, user, params, router]);

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    try {
      const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', values);
      const { token, user: loggedIn } = res.data.data!;
      login(token, loggedIn);
      toast.success(`Welcome back, ${loggedIn.name}`);
      router.replace(safeNext(params.get('next'), loggedIn.role));
    } catch (err) {
      setError(getApiError(err, 'Login failed').message);
    }
  };

  return (
    <div className="space-y-6">
      {error && <Alert tone="danger">{error}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input label="Email" type="email" autoComplete="email" required {...register('email')} error={errors.email?.message} />
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="pr-10"
            {...register('password')}
            error={errors.password?.message}
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
        <Button type="submit" isLoading={isSubmitting} loadingText="Signing in…" className="w-full">
          Log in
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        New borrower?{' '}
        <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts</p>
        <p className="mt-1 text-xs text-slate-500">Fill in a seeded account for each role:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                setValue('email', acc.email, { shouldValidate: true });
                setValue('password', acc.password, { shouldValidate: true });
              }}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-400 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {acc.role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Log in"
      subtitle="Borrowers and operations staff sign in here."
      aside={
        <>
          <h2 className="text-3xl font-semibold leading-tight">Loan operations, from application to closure.</h2>
          <p className="text-sm text-slate-300">
            Borrowers apply and track repayments. Sales, Sanction, Disbursement and Collection teams each work their own queue.
          </p>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
