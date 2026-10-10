'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApiData } from './useApi';
import { DraftState } from '../types';

const STEP_ORDER: Record<DraftState['currentStep'], number> = { personal: 1, 'salary-slip': 2, 'loan-config': 3 };
const STEP_PATHS: Record<DraftState['currentStep'], string> = {
  personal: '/apply/personal-details',
  'salary-slip': '/apply/salary-slip',
  'loan-config': '/apply/loan-config',
};

/**
 * Loads the borrower's draft and redirects back if they open a step whose prerequisites
 * aren't complete (e.g. typing /apply/loan-config before uploading a slip). The server
 * enforces the same order (409 INVALID_STEP).
 */
export function useDraft(requiredStep: DraftState['currentStep']) {
  const router = useRouter();
  const draft = useApiData<DraftState>('/borrower/loans/draft');

  const reached = draft.data ? STEP_ORDER[draft.data.currentStep] >= STEP_ORDER[requiredStep] : false;

  useEffect(() => {
    if (draft.data && !reached) router.replace(STEP_PATHS[draft.data.currentStep]);
  }, [draft.data, reached, router]);

  return { ...draft, ready: !!draft.data && reached };
}
