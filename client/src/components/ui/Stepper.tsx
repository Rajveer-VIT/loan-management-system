import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  name: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative max-w-2xl mx-auto">
        {/* Background Connecting Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
        
        {/* Progress Fill Line */}
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-300"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 border-2 ${
                  isCompleted
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                    : isCurrent
                    ? 'bg-white border-indigo-600 text-indigo-600 shadow-lg ring-4 ring-indigo-50'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : step.id}
              </div>
              <span
                className={`mt-2 text-xs font-semibold tracking-wide transition-colors ${
                  isCurrent ? 'text-indigo-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
