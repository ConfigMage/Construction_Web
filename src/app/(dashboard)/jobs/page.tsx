'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllJobs, getActiveJobs, getCompletedJobs, startJob, completeJob, type JobWithDetails } from '@/lib/actions/jobs';
import { createInvoice } from '@/lib/actions/invoices';
import { PageHeader } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import { LoadingState } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/data-display/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { JobStatus } from '@/lib/db/schema';

type FilterType = 'all' | 'active' | 'completed';

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('active');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [startingJob, setStartingJob] = useState<JobWithDetails | null>(null);
  const [completingJob, setCompletingJob] = useState<JobWithDetails | null>(null);
  const [invoicingJob, setInvoicingJob] = useState<JobWithDetails | null>(null);

  useEffect(() => {
    loadJobs();
  }, [filter]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      let data: JobWithDetails[];
      switch (filter) {
        case 'active':
          data = await getActiveJobs();
          break;
        case 'completed':
          data = await getCompletedJobs();
          break;
        default:
          data = await getAllJobs();
      }
      setJobs(data);
    } catch (err) {
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = async () => {
    if (!startingJob) return;
    setActionLoading(true);
    try {
      const result = await startJob(startingJob.id);
      if (result.success) {
        setSuccess('Job started');
        setStartingJob(null);
        loadJobs();
      } else {
        setError(result.error || 'Failed to start job');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!completingJob) return;
    setActionLoading(true);
    try {
      const result = await completeJob(completingJob.id);
      if (result.success) {
        setSuccess('Job marked as completed');
        setCompletingJob(null);
        loadJobs();
      } else {
        setError(result.error || 'Failed to complete job');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoicingJob) return;
    setActionLoading(true);
    try {
      const result = await createInvoice(invoicingJob.id);
      if (result.success) {
        setSuccess('Invoice created');
        setInvoicingJob(null);
        loadJobs();
      } else {
        setError(result.error || 'Failed to create invoice');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const getActionButton = (job: JobWithDetails) => {
    switch (job.status) {
      case 'Approved':
        return (
          <Button size="sm" onClick={() => setStartingJob(job)}>
            Start Job
          </Button>
        );
      case 'In Progress':
        return (
          <Button size="sm" variant="secondary" onClick={() => setCompletingJob(job)}>
            Complete
          </Button>
        );
      case 'Completed':
        return (
          <Button size="sm" onClick={() => setInvoicingJob(job)}>
            Create Invoice
          </Button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingState message="Loading jobs..." />;
  }

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Track and manage active jobs"
      />

      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'active' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active Jobs
        </Button>
        <Button
          variant={filter === 'completed' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Paid Jobs
        </Button>
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Jobs
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="w-40">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 ? (
            <TableEmpty colSpan={6} message="No jobs found" />
          ) : (
            jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.estimateNumber}</TableCell>
                <TableCell>{job.customer?.name || 'Unknown'}</TableCell>
                <TableCell>{formatCurrency(job.totalAmount)}</TableCell>
                <TableCell>
                  <StatusBadge status={job.status as JobStatus} />
                </TableCell>
                <TableCell className="text-sm text-secondary-light">
                  {job.approvalDate && <div>Approved: {formatDate(job.approvalDate)}</div>}
                  {job.startDate && <div>Started: {formatDate(job.startDate)}</div>}
                  {job.completionDate && <div>Completed: {formatDate(job.completionDate)}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                    {getActionButton(job)}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={!!startingJob}
        onClose={() => setStartingJob(null)}
        onConfirm={handleStartJob}
        title="Start Job"
        message={`Start work on job ${startingJob?.estimateNumber} for ${startingJob?.customer?.name}?`}
        confirmText="Start Job"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!completingJob}
        onClose={() => setCompletingJob(null)}
        onConfirm={handleCompleteJob}
        title="Complete Job"
        message={`Mark job ${completingJob?.estimateNumber} as completed?`}
        confirmText="Complete"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!invoicingJob}
        onClose={() => setInvoicingJob(null)}
        onConfirm={handleCreateInvoice}
        title="Create Invoice"
        message={`Create an invoice for job ${invoicingJob?.estimateNumber}? Total: ${formatCurrency(invoicingJob?.totalAmount || 0)}`}
        confirmText="Create Invoice"
        loading={actionLoading}
      />
    </div>
  );
}
