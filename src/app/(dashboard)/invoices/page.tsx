'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllInvoices, getUnpaidInvoices, getOverdueInvoices, recordPayment, type InvoiceWithDetails } from '@/lib/actions/invoices';
import { PageHeader } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import { LoadingState } from '@/components/ui/spinner';
import { formatCurrency, formatDate } from '@/lib/utils/format';

type FilterType = 'all' | 'unpaid' | 'overdue';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('unpaid');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [payingInvoice, setPayingInvoice] = useState<InvoiceWithDetails | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [filter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      let data: InvoiceWithDetails[];
      switch (filter) {
        case 'unpaid':
          data = await getUnpaidInvoices();
          break;
        case 'overdue':
          data = await getOverdueInvoices();
          break;
        default:
          data = await getAllInvoices();
      }
      setInvoices(data);
    } catch (err) {
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payingInvoice) return;
    setActionLoading(true);
    try {
      const result = await recordPayment(payingInvoice.id);
      if (result.success) {
        setSuccess('Payment recorded');
        setPayingInvoice(null);
        loadInvoices();
      } else {
        setError(result.error || 'Failed to record payment');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const getPaymentStatus = (invoice: InvoiceWithDetails) => {
    if (invoice.status === 'Paid') {
      return <Badge variant="success">Paid</Badge>;
    }
    if (invoice.isOverdue) {
      return <Badge variant="danger">Overdue ({invoice.daysOverdue} days)</Badge>;
    }
    return <Badge variant="warning">Unpaid</Badge>;
  };

  // Calculate totals
  const unpaidTotal = invoices
    .filter((inv) => inv.status === 'Invoiced')
    .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || '0'), 0);

  if (loading) {
    return <LoadingState message="Loading invoices..." />;
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={filter === 'unpaid' ? `Outstanding: ${formatCurrency(unpaidTotal)}` : 'Manage invoices and payments'}
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
          variant={filter === 'unpaid' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('unpaid')}
        >
          Unpaid
        </Button>
        <Button
          variant={filter === 'overdue' ? 'danger' : 'outline'}
          size="sm"
          onClick={() => setFilter('overdue')}
        >
          Overdue
        </Button>
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Invoices
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-40">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableEmpty colSpan={6} message="No invoices found" />
          ) : (
            invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  {invoice.invoiceNumber || invoice.estimateNumber}
                </TableCell>
                <TableCell>{invoice.customer?.name || 'Unknown'}</TableCell>
                <TableCell className="font-medium">{formatCurrency(invoice.totalAmount)}</TableCell>
                <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                <TableCell>{getPaymentStatus(invoice)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href={`/invoices/${invoice.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                    {invoice.status === 'Invoiced' && (
                      <Button
                        size="sm"
                        onClick={() => setPayingInvoice(invoice)}
                      >
                        Record Payment
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Payment Dialog */}
      <ConfirmDialog
        isOpen={!!payingInvoice}
        onClose={() => setPayingInvoice(null)}
        onConfirm={handleRecordPayment}
        title="Record Payment"
        message={`Record payment for invoice ${payingInvoice?.invoiceNumber || payingInvoice?.estimateNumber}? Amount: ${formatCurrency(payingInvoice?.totalAmount || 0)}`}
        confirmText="Record Payment"
        loading={actionLoading}
      />
    </div>
  );
}
