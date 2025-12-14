'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getEstimateById, updateEstimate, type EstimateWithDetails } from '@/lib/actions/estimates';
import { PageHeader } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { LoadingState } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/data-display/status-badge';
import { LineItemEditor, type LineItemData } from '@/components/forms/line-item-editor';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { canEditJob } from '@/lib/utils/workflow';
import type { JobStatus } from '@/lib/db/schema';

export default function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [estimate, setEstimate] = useState<EstimateWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [lineItems, setLineItems] = useState<LineItemData[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadEstimate();
  }, [id]);

  const loadEstimate = async () => {
    setLoading(true);
    try {
      const data = await getEstimateById(parseInt(id));
      if (data) {
        setEstimate(data);
        setLineItems(
          data.lineItems.map((item) => ({
            action: item.action,
            amount: parseFloat(item.amount),
            description: item.description,
          }))
        );
        setNotes(data.notes || '');
      } else {
        setError('Estimate not found');
      }
    } catch (err) {
      setError('Failed to load estimate');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const result = await updateEstimate(parseInt(id), {
        lineItems,
        notes,
      });
      if (result.success) {
        setSuccess('Estimate updated successfully');
        setIsEditing(false);
        loadEstimate();
      } else {
        setError(result.error || 'Failed to update estimate');
      }
    } catch (err) {
      setError('Failed to update estimate');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (estimate) {
      setLineItems(
        estimate.lineItems.map((item) => ({
          action: item.action,
          amount: parseFloat(item.amount),
          description: item.description,
        }))
      );
      setNotes(estimate.notes || '');
    }
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return <LoadingState message="Loading estimate..." />;
  }

  if (!estimate) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-light">Estimate not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const canEdit = canEditJob(estimate.status as JobStatus);

  return (
    <div>
      <PageHeader
        title={`Estimate ${estimate.estimateNumber}`}
        description={`Created ${formatDate(estimate.estimateDate)}`}
        actions={
          <div className="flex gap-3">
            {canEdit && !isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
            {isEditing && (
              <>
                <Button variant="ghost" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} loading={saving}>
                  Save Changes
                </Button>
              </>
            )}
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
            <CardContent className="pt-6">
              <LineItemEditor
                items={lineItems}
                onChange={setLineItems}
                disabled={!isEditing}
              />
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
              <StatusBadge status={estimate.status as JobStatus} />
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium text-secondary">{estimate.customer?.name}</p>
              <p className="text-sm text-secondary-light">{estimate.customer?.phone}</p>
              {estimate.customer?.email && (
                <p className="text-sm text-secondary-light">{estimate.customer.email}</p>
              )}
              {estimate.customer?.address && (
                <p className="text-sm text-secondary-light">{estimate.customer.address}</p>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary-light">Items:</span>
                <span className="font-medium">{estimate.lineItems.length}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-secondary-light">Total:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(estimate.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="min-h-[100px]"
                />
              ) : (
                <p className="text-secondary-light">
                  {estimate.notes || 'No notes'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
