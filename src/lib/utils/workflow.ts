import { JobStatus, JOB_STATUSES } from '@/lib/db/schema';

/**
 * Status workflow order
 */
export const STATUS_ORDER = JOB_STATUSES;

/**
 * Map of status to corresponding date field
 */
export const STATUS_DATE_FIELDS: Record<JobStatus, string | null> = {
  'Estimate Created': 'estimateDate',
  'Estimate Sent': null, // No date field for this status
  'Approved': 'approvalDate',
  'In Progress': 'startDate',
  'Completed': 'completionDate',
  'Invoiced': 'invoiceDate',
  'Paid': 'paymentDate',
};

/**
 * Check if a status transition is valid
 * Status can only progress forward in the workflow
 */
export function canTransitionTo(currentStatus: JobStatus, newStatus: JobStatus): boolean {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const newIdx = STATUS_ORDER.indexOf(newStatus);

  // Can only move forward by exactly one step
  return newIdx === currentIdx + 1;
}

/**
 * Get the next status in the workflow
 */
export function getNextStatus(currentStatus: JobStatus): JobStatus | null {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  if (currentIdx === -1 || currentIdx >= STATUS_ORDER.length - 1) {
    return null;
  }

  return STATUS_ORDER[currentIdx + 1];
}

/**
 * Get the previous status in the workflow
 */
export function getPreviousStatus(currentStatus: JobStatus): JobStatus | null {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  if (currentIdx <= 0) {
    return null;
  }

  return STATUS_ORDER[currentIdx - 1];
}

/**
 * Check if a job can be edited based on its status
 * Jobs can only be edited when in 'Estimate Created' or 'Estimate Sent' status
 */
export function canEditJob(status: JobStatus): boolean {
  return status === 'Estimate Created' || status === 'Estimate Sent';
}

/**
 * Check if a job can be deleted based on its status
 * Jobs can only be deleted when in 'Estimate Created' or 'Estimate Sent' status
 */
export function canDeleteJob(status: JobStatus): boolean {
  return status === 'Estimate Created' || status === 'Estimate Sent';
}

/**
 * Check if a job is considered an estimate (not yet approved)
 */
export function isEstimate(status: JobStatus): boolean {
  return status === 'Estimate Created' || status === 'Estimate Sent';
}

/**
 * Check if a job is active (approved but not yet paid)
 */
export function isActiveJob(status: JobStatus): boolean {
  return status === 'Approved' || status === 'In Progress' || status === 'Completed' || status === 'Invoiced';
}

/**
 * Check if a job has been invoiced
 */
export function isInvoiced(status: JobStatus): boolean {
  return status === 'Invoiced' || status === 'Paid';
}

/**
 * Check if a job is paid
 */
export function isPaid(status: JobStatus): boolean {
  return status === 'Paid';
}

/**
 * Get status badge color
 */
export function getStatusColor(status: JobStatus): 'primary' | 'warning' | 'success' | 'info' | 'danger' {
  switch (status) {
    case 'Estimate Created':
    case 'Estimate Sent':
      return 'info';
    case 'Approved':
    case 'In Progress':
      return 'warning';
    case 'Completed':
    case 'Invoiced':
      return 'primary';
    case 'Paid':
      return 'success';
    default:
      return 'info';
  }
}

/**
 * Get all date updates needed for a status transition
 */
export function getStatusDateUpdates(newStatus: JobStatus, date: Date = new Date()): Record<string, string> {
  const dateField = STATUS_DATE_FIELDS[newStatus];
  const dateValue = date.toISOString().split('T')[0];

  if (dateField) {
    return { [dateField]: dateValue };
  }

  return {};
}
