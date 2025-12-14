'use server';

import { db, jobs, customers, lineItems } from '@/lib/db';
import { eq, and, or, ilike, gte, lte, desc, sql, count } from 'drizzle-orm';
import type { JobStatus } from '@/lib/db/schema';

export interface SearchFilters {
  term?: string;
  status?: JobStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  customerId?: number;
}

export interface SearchResult {
  id: number;
  type: 'customer' | 'job' | 'estimate' | 'invoice';
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  status: string;
  customerId: number;
  customerName: string;
}

/**
 * Global search across all entities
 */
export async function globalSearch(filters: SearchFilters): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const pattern = filters.term ? `%${filters.term}%` : '%';

  // Search jobs/estimates/invoices
  let jobsQuery = db
    .select({
      id: jobs.id,
      estimateNumber: jobs.estimateNumber,
      invoiceNumber: jobs.invoiceNumber,
      status: jobs.status,
      totalAmount: jobs.totalAmount,
      estimateDate: jobs.estimateDate,
      invoiceDate: jobs.invoiceDate,
      paymentDate: jobs.paymentDate,
      customerId: jobs.customerId,
      customerName: customers.name,
    })
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id));

  // Apply filters
  const conditions: any[] = [];

  if (filters.term) {
    conditions.push(
      or(
        ilike(jobs.estimateNumber, pattern),
        ilike(jobs.invoiceNumber, pattern),
        ilike(jobs.notes, pattern),
        ilike(customers.name, pattern)
      )
    );
  }

  if (filters.status && filters.status !== 'all') {
    conditions.push(eq(jobs.status, filters.status));
  }

  if (filters.dateFrom) {
    conditions.push(gte(jobs.estimateDate, filters.dateFrom));
  }

  if (filters.dateTo) {
    conditions.push(lte(jobs.estimateDate, filters.dateTo));
  }

  if (filters.customerId) {
    conditions.push(eq(jobs.customerId, filters.customerId));
  }

  if (conditions.length > 0) {
    jobsQuery = jobsQuery.where(and(...conditions)) as any;
  }

  const jobResults = await jobsQuery.orderBy(desc(jobs.updatedAt)).limit(100);

  for (const job of jobResults) {
    const amount = parseFloat(job.totalAmount || '0');

    // Apply amount filter
    if (filters.amountMin && amount < filters.amountMin) continue;
    if (filters.amountMax && amount > filters.amountMax) continue;

    let type: 'estimate' | 'job' | 'invoice' = 'job';
    let date = job.estimateDate || '';

    if (job.status === 'Estimate Created' || job.status === 'Estimate Sent') {
      type = 'estimate';
    } else if (job.status === 'Invoiced' || job.status === 'Paid') {
      type = 'invoice';
      date = job.invoiceDate || job.estimateDate || '';
    }

    results.push({
      id: job.id,
      type,
      title: type === 'invoice'
        ? `Invoice #${job.invoiceNumber || job.estimateNumber}`
        : `${type === 'estimate' ? 'Estimate' : 'Job'} #${job.estimateNumber}`,
      subtitle: job.customerName,
      amount,
      date,
      status: job.status,
      customerId: job.customerId,
      customerName: job.customerName,
    });
  }

  // If searching by term, also search customers
  if (filters.term) {
    const customerResults = await db
      .select()
      .from(customers)
      .where(
        or(
          ilike(customers.name, pattern),
          ilike(customers.phone, pattern),
          ilike(customers.email, pattern),
          ilike(customers.address, pattern)
        )
      )
      .limit(20);

    for (const customer of customerResults) {
      results.push({
        id: customer.id,
        type: 'customer',
        title: customer.name,
        subtitle: customer.phone,
        amount: 0,
        date: customer.createdAt?.toISOString().split('T')[0] || '',
        status: 'Active',
        customerId: customer.id,
        customerName: customer.name,
      });
    }
  }

  return results;
}

/**
 * Get monthly revenue report
 */
export async function getMonthlyRevenueReport(year: number = new Date().getFullYear()) {
  const months = [];

  for (let month = 1; month <= 12; month++) {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    const paidJobs = await db
      .select({
        totalAmount: jobs.totalAmount,
        paymentDate: jobs.paymentDate,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'Paid'),
          gte(jobs.paymentDate, startDate),
          lte(jobs.paymentDate, endDate)
        )
      );

    const revenue = paidJobs.reduce(
      (sum, job) => sum + parseFloat(job.totalAmount || '0'),
      0
    );

    months.push({
      month,
      monthName: new Date(year, month - 1).toLocaleString('en-US', { month: 'long' }),
      revenue,
      count: paidJobs.length,
    });
  }

  return {
    year,
    months,
    totalRevenue: months.reduce((sum, m) => sum + m.revenue, 0),
    totalJobs: months.reduce((sum, m) => sum + m.count, 0),
  };
}

/**
 * Get outstanding invoices report
 */
export async function getOutstandingInvoicesReport() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const unpaidInvoices = await db
    .select({
      id: jobs.id,
      invoiceNumber: jobs.invoiceNumber,
      estimateNumber: jobs.estimateNumber,
      invoiceDate: jobs.invoiceDate,
      totalAmount: jobs.totalAmount,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .where(eq(jobs.status, 'Invoiced'))
    .orderBy(jobs.invoiceDate);

  return unpaidInvoices.map((inv) => {
    const isOverdue = inv.invoiceDate && inv.invoiceDate < thirtyDaysAgoStr;
    const daysSinceInvoice = inv.invoiceDate
      ? Math.floor(
          (new Date().getTime() - new Date(inv.invoiceDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    return {
      ...inv,
      isOverdue,
      daysSinceInvoice,
      daysOverdue: isOverdue ? daysSinceInvoice - 30 : 0,
    };
  });
}

/**
 * Get customer history report
 */
export async function getCustomerHistoryReport(customerId: number) {
  const customer = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId));

  if (customer.length === 0) {
    return null;
  }

  const customerJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.customerId, customerId))
    .orderBy(desc(jobs.createdAt));

  const jobsWithLineItems = await Promise.all(
    customerJobs.map(async (job) => {
      const items = await db
        .select()
        .from(lineItems)
        .where(eq(lineItems.jobId, job.id))
        .orderBy(lineItems.itemNumber);

      return { ...job, lineItems: items };
    })
  );

  const totalRevenue = customerJobs
    .filter((job) => job.status === 'Paid')
    .reduce((sum, job) => sum + parseFloat(job.totalAmount || '0'), 0);

  const unpaidAmount = customerJobs
    .filter((job) => job.status === 'Invoiced')
    .reduce((sum, job) => sum + parseFloat(job.totalAmount || '0'), 0);

  return {
    customer: customer[0],
    jobs: jobsWithLineItems,
    stats: {
      totalJobs: customerJobs.length,
      completedJobs: customerJobs.filter((j) => j.status === 'Paid').length,
      activeJobs: customerJobs.filter((j) =>
        ['Approved', 'In Progress', 'Completed', 'Invoiced'].includes(j.status)
      ).length,
      pendingEstimates: customerJobs.filter((j) =>
        ['Estimate Created', 'Estimate Sent'].includes(j.status)
      ).length,
      totalRevenue,
      unpaidAmount,
    },
  };
}

/**
 * Get top customers report
 */
export async function getTopCustomersReport(limit: number = 10) {
  const result = await db
    .select({
      customerId: jobs.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      totalRevenue: sql<number>`SUM(CASE WHEN ${jobs.status} = 'Paid' THEN CAST(${jobs.totalAmount} AS DECIMAL) ELSE 0 END)`,
      totalJobs: count(),
      paidJobs: sql<number>`SUM(CASE WHEN ${jobs.status} = 'Paid' THEN 1 ELSE 0 END)`,
    })
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .groupBy(jobs.customerId, customers.name, customers.phone)
    .orderBy(
      sql`SUM(CASE WHEN ${jobs.status} = 'Paid' THEN CAST(${jobs.totalAmount} AS DECIMAL) ELSE 0 END) DESC`
    )
    .limit(limit);

  return result;
}
