import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';

interface StatsCardProps {
  title: string;
  value: number | string;
  type?: 'number' | 'currency';
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  type = 'number',
  icon,
  trend,
  onClick,
}: StatsCardProps) {
  const displayValue = type === 'currency' ? formatCurrency(value as number) : value;

  return (
    <Card
      className={`${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-secondary-light">{title}</p>
          <p className="text-2xl font-bold text-secondary mt-1">{displayValue}</p>
          {trend && (
            <p
              className={`text-sm mt-1 ${trend.isPositive ? 'text-success' : 'text-danger'}`}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-primary/10 rounded-lg text-primary">{icon}</div>
        )}
      </div>
    </Card>
  );
}
