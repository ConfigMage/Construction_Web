import { forwardRef, TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const textareaId = id || props.name || Math.random().toString(36).slice(2);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-secondary mb-1"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            w-full px-3 py-2 min-h-[100px]
            border rounded-md
            text-secondary placeholder-secondary-light
            resize-y
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

Textarea.displayName = 'Textarea';
