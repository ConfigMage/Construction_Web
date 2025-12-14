'use server';

import { db, jobs, customers } from '@/lib/db';
import { eq, desc, and, isNotNull, or } from 'drizzle-orm';

export interface DashboardStats {
  pendingEstimates: number;
  activeJobs: number;
  unpaidInvoices: number;
  unpaidTotal: number;
  monthlyRevenue: number;
}

export interface RecentActivity {
  id: number;
  type: 'estimate' | 'job' | 'invoice' | 'payment';
  title: string;
  customerName: string;
  amount: number;
  date: string;
  status: string;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const allJobs = await db.select().from(jobs);

  // Pending estimates
  const pendingEstimates = allJobs.filter(
    (job) => job.status === 'Estimate Created' || job.status === 'Estimate Sent'
  ).length;

  // Active jobs
  const activeJobs = allJobs.filter((job) =>
    ['Approved', 'In Progress', 'Completed', 'Invoiced'].includes(job.status)
  ).length;

  // Unpaid invoices
  const unpaidInvoices = allJobs.filter((job) => job.status === 'Invoiced');
  const unpaidTotal = unpaidInvoices.reduce(
    (sum, job) => sum + parseFloat(job.totalAmount || '0'),
    0
  );

  // Monthly revenue (paid jobs this month)
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const monthlyPaid = allJobs.filter(
    (job) =>
      job.status === 'Paid' &&
      job.paymentDate &&
      job.paymentDate >= firstOfMonth
  );

  const monthlyRevenue = monthlyPaid.reduce(
    (sum, job) => sum + parseFloat(job.totalAmount || '0'),
    0
  );

  return {
    pendingEstimates,
    activeJobs,
    unpaidInvoices: unpaidInvoices.length,
    unpaidTotal,
    monthlyRevenue,
  };
}

/**
 * Get recent activity for dashboard
 */
export async function getRecentActivity(
  limit: number = 5
): Promise<RecentActivity[]> {
  // Get recent jobs with customer info
  const recentJobs = await db
    .select({
      id: jobs.id,
      status: jobs.status,
      estimateNumber: jobs.estimateNumber,
      invoiceNumber: jobs.invoiceNumber,
      totalAmount: jobs.totalAmount,
      estimateDate: jobs.estimateDate,
      approvalDate: jobs.approvalDate,
      invoiceDate: jobs.invoiceDate,
      paymentDate: jobs.paymentDate,
      updatedAt: jobs.updatedAt,
      customerName: customers.name,
    })
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .orderBy(desc(jobs.updatedAt))
    .limit(limit);

  return recentJobs.map((job) => {
    let type: RecentActivity['type'] = 'job';
    let title = '';
    let date = job.updatedAt?.toISOString().split('T')[0] || '';

    if (job.status === 'Paid') {
      type = 'payment';
      title = `Payment received for Invoice #${job.invoiceNumber || job.estimateNumber}`;
      date = job.paymentDate || date;
    } else if (job.status === 'Invoiced') {
      type = 'invoice';
      title = `Invoice #${job.invoiceNumber || job.estimateNumber} created`;
      date = job.invoiceDate || date;
    } else if (job.status === 'Estimate Created' || job.status === 'Estimate Sent') {
      type = 'estimate';
      title = `Estimate #${job.estimateNumber} ${job.status === 'Estimate Sent' ? 'sent' : 'created'}`;
      date = job.estimateDate || date;
    } else {
      type = 'job';
      title = `Job #${job.estimateNumber} - ${job.status}`;
      date = job.approvalDate || job.estimateDate || date;
    }

    return {
      id: job.id,
      type,
      title,
      customerName: job.customerName,
      amount: parseFloat(job.totalAmount || '0'),
      date,
      status: job.status,
    };
  });
}

/**
 * Get quick action counts for dashboard
 */
export async function getQuickActionCounts() {
  const allJobs = await db.select().from(jobs);

  return {
    estimatesToSend: allJobs.filter((job) => job.status === 'Estimate Created').length,
    jobsToStart: allJobs.filter((job) => job.status === 'Approved').length,
    jobsToComplete: allJobs.filter((job) => job.status === 'In Progress').length,
    jobsToInvoice: allJobs.filter((job) => job.status === 'Completed').length,
    invoicesToCollect: allJobs.filter((job) => job.status === 'Invoiced').length,
  };
}
