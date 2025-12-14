'use client';

import { forwardRef, InputHTMLAttributes, useState, useEffect } from 'react';
import { formatPhoneNumber } from '@/lib/utils/format';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).slice(2);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-secondary mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2 min-h-touch
            border rounded-md
            text-secondary placeholder-secondary-light
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-danger focus:ring-danger/50 focus:border-danger' : 'border-border'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-secondary-light">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface PhoneInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
      setDisplayValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      // Remove all non-digit characters
      const digits = input.replace(/\D/g, '');

      // Limit to 10 digits
      const limitedDigits = digits.slice(0, 10);

      // Format as user types
      let formatted = limitedDigits;
      if (limitedDigits.length >= 6) {
        formatted = `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
      } else if (limitedDigits.length >= 3) {
        formatted = `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
      } else if (limitedDigits.length > 0) {
        formatted = `(${limitedDigits}`;
      }

      setDisplayValue(formatted);
      onChange(formatted);
    };

    return (
      <Input
        ref={ref}
        type="tel"
        value={displayValue}
        onChange={handleChange}
        placeholder="(555) 555-5555"
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

interface CurrencyInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value.toString());

    useEffect(() => {
      setDisplayValue(value.toString());
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      // Allow only digits and one decimal point
      const cleaned = input.replace(/[^\d.]/g, '');
      const parts = cleaned.split('.');
      const formatted =
        parts.length > 2
          ? parts[0] + '.' + parts.slice(1).join('')
          : cleaned;

      setDisplayValue(formatted);
      onChange(parseFloat(formatted) || 0);
    };

    const handleBlur = () => {
      // Format to 2 decimal places on blur
      const num = parseFloat(displayValue) || 0;
      setDisplayValue(num.toFixed(2));
      onChange(num);
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-light">
          $
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="pl-7"
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
