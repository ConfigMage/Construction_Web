'use client';

import { Button } from '@/components/ui/button';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="bg-white border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div>
          {title && (
            <h1 className="text-2xl font-bold text-secondary">{title}</h1>
          )}
        </div>

        {/* Right side - Company info */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-medium text-secondary">
              Jones General Contracting, LLC
            </p>
            <p className="text-xs text-secondary-light">
              Serving the Willamette Valley
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-secondary">(971) 240-8071</p>
            <p className="text-xs text-secondary-light">
              jonesgcoregon@gmail.com
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

// Page header component for individual pages
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">{title}</h1>
        {description && (
          <p className="text-secondary-light mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
