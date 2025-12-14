import { Badge } from '@/components/ui/badge';
import { getStatusColor } from '@/lib/utils/workflow';
import type { JobStatus } from '@/lib/db/schema';

interface StatusBadgeProps {
  status: JobStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = getStatusColor(status);

  return <Badge variant={color}>{status}</Badge>;
}
