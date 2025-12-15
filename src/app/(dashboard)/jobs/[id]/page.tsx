'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getJobById, startJob, completeJob, updateJobNotes, type JobWithDetails } from '@/lib/actions/jobs';
import { createInvoice } from '@/lib/actions/invoices';
import { PageHeader } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { LoadingState } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/data-display/status-badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { JobStatus } from '@/lib/db/schema';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<JobWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  // Dialogs
  const [startConfirm, setStartConfirm] = useState(false);
  const [completeConfirm, setCompleteConfirm] = useState(false);
  const [invoiceConfirm, setInvoiceConfirm] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    setLoading(true);
    try {
      const data = await getJobById(parseInt(id));
      if (data) {
        setJob(data);
        setNotes(data.notes || '');
      } else {
        setError('Job not found');
      }
    } catch (err) {
      setError('Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = async () => {
    setActionLoading(true);
    try {
      const result = await startJob(parseInt(id));
      if (result.success) {
        setSuccess('Job started successfully');
        setStartConfirm(false);
        loadJob();
      } else {
        setError(result.error || 'Failed to start job');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    setActionLoading(true);
    try {
      const result = await completeJob(parseInt(id));
      if (result.success) {
        setSuccess('Job completed successfully');
        setCompleteConfirm(false);
        loadJob();
      } else {
        setError(result.error || 'Failed to complete job');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    setActionLoading(true);
    try {
      const result = await createInvoice(parseInt(id));
      if (result.success && result.invoice) {
        setSuccess('Invoice created successfully');
        setInvoiceConfirm(false);
        router.push(`/invoices/${result.invoice.id}`);
      } else {
        setError(result.error || 'Failed to create invoice');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setActionLoading(true);
    try {
      const result = await updateJobNotes(parseInt(id), notes);
      if (result.success) {
        setSuccess('Notes saved');
        setEditingNotes(false);
        loadJob();
      } else {
        setError(result.error || 'Failed to save notes');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const getActionButton = () => {
    if (!job) return null;

    switch (job.status) {
      case 'Approved':
        return (
          <Button onClick={() => setStartConfirm(true)}>
            Start Job
          </Button>
        );
      case 'In Progress':
        return (
          <Button variant="secondary" onClick={() => setCompleteConfirm(true)}>
            Mark Complete
          </Button>
        );
      case 'Completed':
        return (
          <Button onClick={() => setInvoiceConfirm(true)}>
            Create Invoice
          </Button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingState message="Loading job..." />;
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-light">Job not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Job ${job.estimateNumber}`}
        description={`${job.customer?.name || 'Unknown Customer'}`}
        actions={
          <div className="flex gap-3">
            {getActionButton()}
            <Button variant="secondary" onClick={() => router.back()}>
              Back
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="danger" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-6" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Work Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 w-16">#</th>
                      <th className="text-left py-2 px-2">Action</th>
                      <th className="text-left py-2 px-2">Description</th>
                      <th className="text-right py-2 px-2 w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.lineItems.map((item, index) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3 px-2 text-secondary-light">{index + 1}</td>
                        <td className="py-3 px-2 font-medium">{item.action}</td>
                        <td className="py-3 px-2 text-secondary-light">{item.description || '-'}</td>
                        <td className="py-3 px-2 text-right">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="py-3 px-2 text-right font-medium">Total:</td>
                      <td className="py-3 px-2 text-right font-bold text-primary text-lg">
                        {formatCurrency(job.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TimelineItem
                  label="Estimate Created"
                  date={job.estimateDate}
                  isComplete={true}
                />
                <TimelineItem
                  label="Approved"
                  date={job.approvalDate}
                  isComplete={!!job.approvalDate}
                />
                <TimelineItem
                  label="Work Started"
                  date={job.startDate}
                  isComplete={!!job.startDate}
                />
                <TimelineItem
                  label="Work Completed"
                  date={job.completionDate}
                  isComplete={!!job.completionDate}
                />
                <TimelineItem
                  label="Invoiced"
                  date={job.invoiceDate}
                  isComplete={!!job.invoiceDate}
                />
                <TimelineItem
                  label="Paid"
                  date={job.paymentDate}
                  isComplete={!!job.paymentDate}
                  isLast={true}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge status={job.status as JobStatus} />
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium text-secondary">{job.customer?.name}</p>
              <p className="text-sm text-secondary-light">{job.customer?.phone}</p>
              {job.customer?.email && (
                <p className="text-sm text-secondary-light">{job.customer.email}</p>
              )}
              {job.customer?.address && (
                <p className="text-sm text-secondary-light">{job.customer.address}</p>
              )}
            </CardContent>
          </Card>

          {/* Job Info */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary-light">Job Number:</span>
                <span className="font-medium">{job.estimateNumber}</span>
              </div>
              {job.invoiceNumber && (
                <div className="flex justify-between">
                  <span className="text-secondary-light">Invoice Number:</span>
                  <span className="font-medium">{job.invoiceNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-secondary-light">Line Items:</span>
                <span className="font-medium">{job.lineItems.length}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-secondary-light">Total Value:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(job.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Notes</CardTitle>
              {!editingNotes && (
                <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)}>
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} loading={actionLoading}>
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingNotes(false);
                        setNotes(job.notes || '');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-secondary-light">
                  {job.notes || 'No notes'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={startConfirm}
        onClose={() => setStartConfirm(false)}
        onConfirm={handleStartJob}
        title="Start Job"
        message={`Start work on this job? This will set today as the start date.`}
        confirmText="Start Job"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={completeConfirm}
        onClose={() => setCompleteConfirm(false)}
        onConfirm={handleCompleteJob}
        title="Complete Job"
        message={`Mark this job as completed? This will set today as the completion date.`}
        confirmText="Mark Complete"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={invoiceConfirm}
        onClose={() => setInvoiceConfirm(false)}
        onConfirm={handleCreateInvoice}
        title="Create Invoice"
        message={`Create an invoice for ${formatCurrency(job.totalAmount)}? You will be redirected to the invoice page.`}
        confirmText="Create Invoice"
        loading={actionLoading}
      />
    </div>
  );
}

// Timeline Item Component
function TimelineItem({
  label,
  date,
  isComplete,
  isLast = false,
}: {
  label: string;
  date: string | null;
  isComplete: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full ${
            isComplete ? 'bg-primary' : 'bg-gray-300'
          }`}
        />
        {!isLast && (
          <div className={`w-0.5 h-6 ${isComplete ? 'bg-primary' : 'bg-gray-300'}`} />
        )}
      </div>
      <div className="flex-1 -mt-0.5">
        <p className={`text-sm ${isComplete ? 'font-medium' : 'text-secondary-light'}`}>
          {label}
        </p>
        {date && (
          <p className="text-xs text-secondary-light">{formatDate(date)}</p>
        )}
      </div>
    </div>
  );
}
