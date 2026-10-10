import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  prefix?: string;
  onChange: (val: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  prefix = '',
  onChange,
}) => {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 font-bold text-gray-900 text-sm">
          <span>{prefix}</span>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (!isNaN(val)) onChange(val);
            }}
            className="w-24 text-right bg-transparent focus:outline-none pr-1"
          />
          <span className="text-gray-500 font-normal text-xs">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
      />
      <div className="flex justify-between text-xs font-medium text-gray-400">
        <span>
          {prefix}
          {min.toLocaleString('en-IN')} {unit}
        </span>
        <span>
          {prefix}
          {max.toLocaleString('en-IN')} {unit}
        </span>
      </div>
    </div>
  );
};
