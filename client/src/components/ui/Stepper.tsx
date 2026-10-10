import React from 'react';
import { Check } from 'lucide-react';

interface StepperProps {
  steps: string[];
  /** 1-based index of the active step. */
  currentStep: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => (
  <nav aria-label="Application progress">
    <ol className="flex items-center">
      {steps.map((name, i) => {
        const index = i + 1;
        const isDone = index < currentStep;
        const isCurrent = index === currentStep;
        return (
          <li key={name} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`} aria-current={isCurrent ? 'step' : undefined}>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isDone
                    ? 'bg-brand-600 text-white'
                    : isCurrent
                      ? 'border-2 border-brand-600 bg-white text-brand-700'
                      : 'border-2 border-slate-200 bg-white text-slate-400'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" aria-hidden="true" /> : index}
              </span>
              <span className={`hidden text-sm font-medium sm:inline ${isCurrent ? 'text-slate-900' : isDone ? 'text-slate-700' : 'text-slate-400'}`}>
                {name}
              </span>
              <span className="sr-only">{isDone ? '(completed)' : isCurrent ? '(current step)' : ''}</span>
            </div>
            {i < steps.length - 1 && (
              <span aria-hidden="true" className={`mx-3 h-0.5 flex-1 rounded ${isDone ? 'bg-brand-600' : 'bg-slate-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
    <p className="mt-2 text-sm text-slate-500 sm:hidden">
      Step {currentStep} of {steps.length}: <span className="font-medium text-slate-700">{steps[currentStep - 1]}</span>
    </p>
  </nav>
);
