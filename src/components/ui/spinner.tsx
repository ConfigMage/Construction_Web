import { HTMLAttributes, forwardRef } from 'react';

interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          ${sizeStyles[size]}
          border-primary border-t-transparent
          rounded-full animate-spin
          ${className}
        `}
        role="status"
        aria-label="Loading"
        {...props}
      />
    );
  }
);

Spinner.displayName = 'Spinner';

// Full-page loading overlay
interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-secondary font-medium">{message}</p>
      </div>
    </div>
  );
}

// Inline loading state
interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner size="lg" />
      <p className="mt-4 text-secondary-light">{message}</p>
    </div>
  );
}
