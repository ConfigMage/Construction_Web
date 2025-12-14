import { HTMLAttributes, forwardRef, ReactNode } from 'react';

type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  onClose?: () => void;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-success/10',
    border: 'border-success',
    icon: 'text-success',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning',
    icon: 'text-yellow-600',
  },
  danger: {
    bg: 'bg-danger/10',
    border: 'border-danger',
    icon: 'text-danger',
  },
  info: {
    bg: 'bg-info/10',
    border: 'border-info',
    icon: 'text-info',
  },
};

const icons: Record<AlertVariant, ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  danger: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', title, onClose, className = '', children, ...props }, ref) => {
    const styles = variantStyles[variant];

    return (
      <div
        ref={ref}
        className={`
          flex items-start gap-3 p-4
          rounded-lg border
          ${styles.bg} ${styles.border}
          ${className}
        `}
        role="alert"
        {...props}
      >
        <div className={`flex-shrink-0 ${styles.icon}`}>{icons[variant]}</div>
        <div className="flex-1 min-w-0">
          {title && <h4 className="font-medium text-secondary mb-1">{title}</h4>}
          <div className="text-sm text-secondary">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded hover:bg-white/50 transition-colors"
            aria-label="Dismiss alert"
          >
            <svg
              className="w-4 h-4 text-secondary-light"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
