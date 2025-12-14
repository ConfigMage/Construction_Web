'use client';

import { useState, useEffect, useTransition } from 'react';
import { globalSearch, getMonthlyRevenueReport, getOutstandingInvoicesReport, getTopCustomersReport, type SearchFilters, type SearchResult } from '@/lib/actions/reports';
import { getAllCustomers } from '@/lib/actions/customers';
import { PageHeader } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, CurrencyInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { LoadingState } from '@/components/ui/spinner';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { JOB_STATUSES } from '@/lib/db/schema';
import type { Customer } from '@/lib/db/schema';

type ReportType = 'search' | 'monthly' | 'outstanding' | 'customers';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('search');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState<number>(0);
  const [amountMax, setAmountMax] = useState<number>(0);
  const [customerId, setCustomerId] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Report data
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [outstandingReport, setOutstandingReport] = useState<any[]>([]);
  const [topCustomersReport, setTopCustomersReport] = useState<any[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await getAllCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers');
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: SearchFilters = {
        term: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as any),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        amountMin: amountMin > 0 ? amountMin : undefined,
        amountMax: amountMax > 0 ? amountMax : undefined,
        customerId: customerId ? parseInt(customerId) : undefined,
      };
      const results = await globalSearch(filters);
      setSearchResults(results);
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    setLoading(true);
    try {
      const report = await getMonthlyRevenueReport();
      setMonthlyReport(report);
    } catch (err) {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const loadOutstandingReport = async () => {
    setLoading(true);
    try {
      const report = await getOutstandingInvoicesReport();
      setOutstandingReport(report);
    } catch (err) {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const loadTopCustomersReport = async () => {
    setLoading(true);
    try {
      const report = await getTopCustomersReport();
      setTopCustomersReport(report);
    } catch (err) {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === 'monthly') loadMonthlyReport();
    if (reportType === 'outstanding') loadOutstandingReport();
    if (reportType === 'customers') loadTopCustomersReport();
  }, [reportType]);

  const getResultBadgeVariant = (type: string) => {
    switch (type) {
      case 'customer': return 'info';
      case 'estimate': return 'warning';
      case 'job': return 'primary';
      case 'invoice': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports & Search"
        description="Search and generate reports"
      />

      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Report Type Selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={reportType === 'search' ? 'primary' : 'outline'}
          onClick={() => setReportType('search')}
        >
          Search
        </Button>
        <Button
          variant={reportType === 'monthly' ? 'primary' : 'outline'}
          onClick={() => setReportType('monthly')}
        >
          Monthly Revenue
        </Button>
        <Button
          variant={reportType === 'outstanding' ? 'primary' : 'outline'}
          onClick={() => setReportType('outstanding')}
        >
          Outstanding Invoices
        </Button>
        <Button
          variant={reportType === 'customers' ? 'primary' : 'outline'}
          onClick={() => setReportType('customers')}
        >
          Top Customers
        </Button>
      </div>

      {/* Search Panel */}
      {reportType === 'search' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Search Term"
                  placeholder="Search by name, number, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    ...JOB_STATUSES.map((s) => ({ value: s, label: s })),
                  ]}
                />
                <Select
                  label="Customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  options={[
                    { value: '', label: 'All Customers' },
                    ...customers.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
                <Input
                  label="Date From"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <Input
                  label="Date To"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
                <div className="flex gap-2">
                  <CurrencyInput
                    label="Min Amount"
                    value={amountMin}
                    onChange={setAmountMin}
                  />
                  <CurrencyInput
                    label="Max Amount"
                    value={amountMax}
                    onChange={setAmountMax}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleSearch} loading={loading}>
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          <Card>
            <CardHeader>
              <CardTitle>Results ({searchResults.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.length === 0 ? (
                    <TableEmpty colSpan={6} message="No results found. Try adjusting your filters." />
                  ) : (
                    searchResults.map((result) => (
                      <TableRow key={`${result.type}-${result.id}`}>
                        <TableCell>
                          <Badge variant={getResultBadgeVariant(result.type)}>
                            {result.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{result.title}</TableCell>
                        <TableCell>{result.customerName}</TableCell>
                        <TableCell>{result.amount > 0 ? formatCurrency(result.amount) : '-'}</TableCell>
                        <TableCell>{formatDate(result.date)}</TableCell>
                        <TableCell>{result.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Revenue Report */}
      {reportType === 'monthly' && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue - {monthlyReport?.year || new Date().getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState message="Loading report..." />
            ) : monthlyReport ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-secondary-light">Total Revenue</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(monthlyReport.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-secondary-light">Total Jobs</p>
                    <p className="text-2xl font-bold text-secondary">
                      {monthlyReport.totalJobs}
                    </p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Jobs</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyReport.months.map((month: any) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{month.monthName}</TableCell>
                        <TableCell className="text-right">{month.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Outstanding Invoices Report */}
      {reportType === 'outstanding' && (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState message="Loading report..." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Days Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingReport.length === 0 ? (
                    <TableEmpty colSpan={6} message="No outstanding invoices" />
                  ) : (
                    outstandingReport.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          {inv.invoiceNumber || inv.estimateNumber}
                        </TableCell>
                        <TableCell>{inv.customerName}</TableCell>
                        <TableCell>{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                        <TableCell>{inv.daysSinceInvoice} days</TableCell>
                        <TableCell>
                          {inv.isOverdue ? (
                            <Badge variant="danger">Overdue ({inv.daysOverdue} days)</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Customers Report */}
      {reportType === 'customers' && (
        <Card>
          <CardHeader>
            <CardTitle>Top Customers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState message="Loading report..." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Total Jobs</TableHead>
                    <TableHead className="text-right">Paid Jobs</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomersReport.length === 0 ? (
                    <TableEmpty colSpan={6} message="No customer data" />
                  ) : (
                    topCustomersReport.map((customer, index) => (
                      <TableRow key={customer.customerId}>
                        <TableCell className="font-bold text-primary">#{index + 1}</TableCell>
                        <TableCell className="font-medium">{customer.customerName}</TableCell>
                        <TableCell>{customer.customerPhone}</TableCell>
                        <TableCell className="text-right">{customer.totalJobs}</TableCell>
                        <TableCell className="text-right">{customer.paidJobs}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(customer.totalRevenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
