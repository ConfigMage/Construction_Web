'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllCustomers } from '@/lib/actions/customers';
import { createEstimate } from '@/lib/actions/estimates';
import { PageHeader } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { LoadingState } from '@/components/ui/spinner';
import { LineItemEditor, type LineItemData } from '@/components/forms/line-item-editor';
import type { Customer } from '@/lib/db/schema';

export default function NewEstimatePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string>('');
  const [lineItems, setLineItems] = useState<LineItemData[]>([
    { action: '', amount: 0, description: '' },
  ]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await getAllCustomers();
      setCustomers(data);
    } catch (err) {
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('Please select a customer');
      return;
    }

    if (lineItems.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    // Validate line items
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.action.trim()) {
        setError(`Line item ${i + 1}: Action is required`);
        return;
      }
      if (!item.description.trim()) {
        setError(`Line item ${i + 1}: Description is required`);
        return;
      }
    }

    setSaving(true);
    try {
      const result = await createEstimate({
        customerId: parseInt(customerId),
        lineItems,
        notes,
      });

      if (result.success) {
        router.push('/estimates');
      } else {
        setError(result.error || 'Failed to create estimate');
      }
    } catch (err) {
      setError('Failed to create estimate');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading..." />;
  }

  return (
    <div>
      <PageHeader
        title="New Estimate"
        description="Create a new estimate for a customer"
      />

      <form onSubmit={handleSubmit}>
        {error && (
          <Alert variant="danger" className="mb-6" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <Card>
              <CardContent className="pt-6">
                <Select
                  label="Customer *"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: `${c.name} - ${c.phone}`,
                  }))}
                  placeholder="Select a customer..."
                />
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardContent className="pt-6">
                <LineItemEditor items={lineItems} onChange={setLineItems} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <Textarea
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for this estimate..."
                  className="min-h-[150px]"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  loading={saving}
                  disabled={saving}
                >
                  Create Estimate
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
