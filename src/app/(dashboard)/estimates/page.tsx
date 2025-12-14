'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllEstimates, searchEstimates, markEstimateAsSent, approveEstimate, deleteEstimate, type EstimateWithDetails } from '@/lib/actions/estimates';
import { PageHeader } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import { LoadingState } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/data-display/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { JobStatus } from '@/lib/db/schema';

export default function EstimatesPage() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<EstimateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();

  const [deletingEstimate, setDeletingEstimate] = useState<EstimateWithDetails | null>(null);
  const [approvingEstimate, setApprovingEstimate] = useState<EstimateWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadEstimates();
  }, []);

  const loadEstimates = async () => {
    setLoading(true);
    try {
      const data = await getAllEstimates();
      setEstimates(data);
    } catch (err) {
      setError('Failed to load estimates');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    startTransition(async () => {
      try {
        const data = await searchEstimates(term);
        setEstimates(data);
      } catch (err) {
        setError('Search failed');
      }
    });
  };

  const handleMarkAsSent = async (estimate: EstimateWithDetails) => {
    setActionLoading(true);
    try {
      const result = await markEstimateAsSent(estimate.id);
      if (result.success) {
        setSuccess('Estimate marked as sent');
        loadEstimates();
      } else {
        setError(result.error || 'Failed to mark as sent');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approvingEstimate) return;
    setActionLoading(true);
    try {
      const result = await approveEstimate(approvingEstimate.id);
      if (result.success) {
        setSuccess('Estimate approved and converted to job');
        setApprovingEstimate(null);
        loadEstimates();
      } else {
        setError(result.error || 'Failed to approve estimate');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEstimate) return;
    setActionLoading(true);
    try {
      const result = await deleteEstimate(deletingEstimate.id);
      if (result.success) {
        setSuccess('Estimate deleted');
        setDeletingEstimate(null);
        loadEstimates();
      } else {
        setError(result.error || 'Failed to delete estimate');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading estimates..." />;
  }

  return (
    <div>
      <PageHeader
        title="Estimates"
        description="Manage pending estimates"
        actions={
          <Link href="/estimates/new">
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Estimate
            </Button>
          </Link>
        }
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

      <div className="mb-6">
        <Input
          placeholder="Search by estimate number, customer name, or description..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estimate #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-48">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {estimates.length === 0 ? (
            <TableEmpty colSpan={6} message="No estimates found" />
          ) : (
            estimates.map((estimate) => (
              <TableRow key={estimate.id}>
                <TableCell className="font-medium">{estimate.estimateNumber}</TableCell>
                <TableCell>{formatDate(estimate.estimateDate)}</TableCell>
                <TableCell>{estimate.customer?.name || 'Unknown'}</TableCell>
                <TableCell>{formatCurrency(estimate.totalAmount)}</TableCell>
                <TableCell>
                  <StatusBadge status={estimate.status as JobStatus} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    <Link href={`/estimates/${estimate.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                    {estimate.status === 'Estimate Created' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsSent(estimate)}
                        disabled={actionLoading}
                      >
                        Mark Sent
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setApprovingEstimate(estimate)}
                      disabled={actionLoading}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingEstimate(estimate)}
                      className="text-danger hover:text-danger"
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        isOpen={!!deletingEstimate}
        onClose={() => setDeletingEstimate(null)}
        onConfirm={handleDelete}
        title="Delete Estimate"
        message={`Are you sure you want to delete estimate ${deletingEstimate?.estimateNumber}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!approvingEstimate}
        onClose={() => setApprovingEstimate(null)}
        onConfirm={handleApprove}
        title="Approve Estimate"
        message={`Approve estimate ${approvingEstimate?.estimateNumber} for ${approvingEstimate?.customer?.name}? This will convert it to an active job.`}
        confirmText="Approve"
        variant="primary"
        loading={actionLoading}
      />
    </div>
  );
}
