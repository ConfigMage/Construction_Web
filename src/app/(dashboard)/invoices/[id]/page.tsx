'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getInvoiceById, recordPayment, type InvoiceWithDetails } from '@/lib/actions/invoices';
import { PageHeader } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/modal';
import { LoadingState } from '@/components/ui/spinner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export default function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const data = await getInvoiceById(parseInt(id));
      if (data) {
        setInvoice(data);
      } else {
        setError('Invoice not found');
      }
    } catch (err) {
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    setActionLoading(true);
    try {
      const result = await recordPayment(parseInt(id));
      if (result.success) {
        setSuccess('Payment recorded successfully');
        setShowPayDialog(false);
        loadInvoice();
      } else {
        setError(result.error || 'Failed to record payment');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading invoice..." />;
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-light">Invoice not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const isPaid = invoice.status === 'Paid';
  const dueDate = invoice.invoiceDate
    ? new Date(new Date(invoice.invoiceDate).getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    : null;

  return (
    <div>
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber || invoice.estimateNumber}`}
        description={`Issued ${formatDate(invoice.invoiceDate)}`}
        actions={
          <div className="flex gap-3">
            {!isPaid && (
              <Button onClick={() => setShowPayDialog(true)}>
                Record Payment
              </Button>
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
          {/* Company Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-secondary">JONES GENERAL CONTRACTING, LLC</h2>
                    <p className="text-secondary-light">Serving the Willamette Valley</p>
                    <p className="text-sm text-secondary-light">CCB #247760</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-secondary">(971) 240-8071</p>
                  <p className="text-sm text-secondary-light">jonesgcoregon@gmail.com</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Work Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.action}</TableCell>
                      <TableCell className="text-secondary-light">{item.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-secondary-light">Subtotal:</span>
                      <span>{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t pt-2">
                      <span className="text-secondary">Total Due:</span>
                      <span className="text-primary">{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isPaid ? (
                <div className="text-center">
                  <Badge variant="success" className="text-lg px-4 py-2">PAID</Badge>
                  {invoice.paymentDate && (
                    <p className="mt-2 text-sm text-secondary-light">
                      Paid on {formatDate(invoice.paymentDate)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  {invoice.isOverdue ? (
                    <>
                      <Badge variant="danger" className="text-lg px-4 py-2">OVERDUE</Badge>
                      <p className="mt-2 text-sm text-danger">
                        {invoice.daysOverdue} days overdue
                      </p>
                    </>
                  ) : (
                    <>
                      <Badge variant="warning" className="text-lg px-4 py-2">UNPAID</Badge>
                      {dueDate && (
                        <p className="mt-2 text-sm text-secondary-light">
                          Due by {formatDate(dueDate)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Bill To</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium text-secondary">{invoice.customer?.name}</p>
              <p className="text-sm text-secondary-light">{invoice.customer?.phone}</p>
              {invoice.customer?.email && (
                <p className="text-sm text-secondary-light">{invoice.customer.email}</p>
              )}
              {invoice.customer?.address && (
                <p className="text-sm text-secondary-light whitespace-pre-line">
                  {invoice.customer.address}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-light">Invoice #:</span>
                <span className="font-medium">{invoice.invoiceNumber || invoice.estimateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-light">Invoice Date:</span>
                <span>{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-light">Due Date:</span>
                <span>{dueDate ? formatDate(dueDate) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-light">Original Estimate:</span>
                <span>{invoice.estimateNumber}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-secondary-light">
                <li>&#x2022; Check (payable to Jones General Contracting)</li>
                <li>&#x2022; Venmo</li>
                <li>&#x2022; Cash</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <ConfirmDialog
        isOpen={showPayDialog}
        onClose={() => setShowPayDialog(false)}
        onConfirm={handleRecordPayment}
        title="Record Payment"
        message={`Record payment of ${formatCurrency(invoice.totalAmount)} for this invoice?`}
        confirmText="Record Payment"
        loading={actionLoading}
      />
    </div>
  );
}
