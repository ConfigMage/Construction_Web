'use server';

import { db, jobs, lineItems, customers, type Job, type LineItem } from '@/lib/db';
import { eq, or, and, desc, lt, isNotNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { generateInvoiceNumber } from '@/lib/utils/numbers';
import { getStatusDateUpdates } from '@/lib/utils/workflow';
import type { JobStatus } from '@/lib/db/schema';

export type InvoiceWithDetails = Job & {
  customer: { id: number; name: string; phone: string; email: string | null; address: string | null };
  lineItems: LineItem[];
  isOverdue: boolean;
  daysOverdue: number;
};

/**
 * Get all invoiced jobs
 */
export async function getAllInvoices(): Promise<InvoiceWithDetails[]> {
  const invoicedJobs = await db
    .select()
    .from(jobs)
    .where(
      or(
        eq(jobs.status, 'Invoiced'),
        eq(jobs.status, 'Paid')
      )
    )
    .orderBy(desc(jobs.invoiceDate));

  return await enrichInvoicesWithDetails(invoicedJobs);
}

/**
 * Get unpaid invoices
 */
export async function getUnpaidInvoices(): Promise<InvoiceWithDetails[]> {
  const unpaidJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, 'Invoiced'))
    .orderBy(desc(jobs.invoiceDate));

  return await enrichInvoicesWithDetails(unpaidJobs);
}

/**
 * Get overdue invoices (invoiced more than 30 days ago and not paid)
 */
export async function getOverdueInvoices(): Promise<InvoiceWithDetails[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const overdueJobs = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.status, 'Invoiced'),
        lt(jobs.invoiceDate, thirtyDaysAgoStr)
      )
    )
    .orderBy(jobs.invoiceDate);

  return await enrichInvoicesWithDetails(overdueJobs);
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(id: number): Promise<InvoiceWithDetails | null> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id));

  if (!job) return null;

  const [customer] = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      address: customers.address,
    })
    .from(customers)
    .where(eq(customers.id, job.customerId));

  const jobLineItems = await db
    .select()
    .from(lineItems)
    .where(eq(lineItems.jobId, job.id))
    .orderBy(lineItems.itemNumber);

  const { isOverdue, daysOverdue } = calculateOverdueStatus(job);

  return {
    ...job,
    customer,
    lineItems: jobLineItems,
    isOverdue,
    daysOverdue,
  };
}

/**
 * Create invoice from completed job
 */
export async function createInvoice(
  jobId: number
): Promise<{ success: boolean; invoice?: InvoiceWithDetails; error?: string }> {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    if (job.status !== 'Completed') {
      return { success: false, error: 'Job must be completed before invoicing' };
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();
    const dateUpdates = getStatusDateUpdates('Invoiced');

    await db
      .update(jobs)
      .set({
        status: 'Invoiced',
        invoiceNumber,
        ...dateUpdates,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));

    const invoice = await getInvoiceById(jobId);

    revalidatePath('/invoices');
    revalidatePath('/jobs');
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath('/');
    return { success: true, invoice: invoice! };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { success: false, error: 'Failed to create invoice' };
  }
}

/**
 * Record payment for invoice
 */
export async function recordPayment(
  id: number,
  paymentDate?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));

    if (!job) {
      return { success: false, error: 'Invoice not found' };
    }

    if (job.status !== 'Invoiced') {
      return { success: false, error: 'Invoice is not in invoiced status' };
    }

    const dateValue = paymentDate || new Date().toISOString().split('T')[0];

    await db
      .update(jobs)
      .set({
        status: 'Paid',
        paymentDate: dateValue,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id));

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error recording payment:', error);
    return { success: false, error: 'Failed to record payment' };
  }
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const allInvoiced = await db
    .select()
    .from(jobs)
    .where(
      or(
        eq(jobs.status, 'Invoiced'),
        eq(jobs.status, 'Paid')
      )
    );

  const unpaidInvoices = allInvoiced.filter((job) => job.status === 'Invoiced');
  const paidInvoices = allInvoiced.filter((job) => job.status === 'Paid');
  const overdueInvoices = unpaidInvoices.filter(
    (job) => job.invoiceDate && job.invoiceDate < thirtyDaysAgoStr
  );

  const unpaidTotal = unpaidInvoices.reduce(
    (sum, job) => sum + parseFloat(job.totalAmount || '0'),
    0
  );

  const overdueTotal = overdueInvoices.reduce(
    (sum, job) => sum + parseFloat(job.totalAmount || '0'),
    0
  );

  const paidTotal = paidInvoices.reduce(
    (sum, job) => sum + parseFloat(job.totalAmount || '0'),
    0
  );

  // Calculate average days to pay for paid invoices
  let totalDaysToPay = 0;
  let paidWithDates = 0;

  for (const invoice of paidInvoices) {
    if (invoice.invoiceDate && invoice.paymentDate) {
      const invoiceDate = new Date(invoice.invoiceDate);
      const paymentDate = new Date(invoice.paymentDate);
      const daysToPay = Math.floor(
        (paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      totalDaysToPay += daysToPay;
      paidWithDates++;
    }
  }

  const averageDaysToPay =
    paidWithDates > 0 ? Math.round(totalDaysToPay / paidWithDates) : 0;

  return {
    unpaidCount: unpaidInvoices.length,
    unpaidTotal,
    overdueCount: overdueInvoices.length,
    overdueTotal,
    paidCount: paidInvoices.length,
    paidTotal,
    averageDaysToPay,
  };
}

/**
 * Get monthly revenue for a given month
 */
export async function getMonthlyRevenue(
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth() + 1
): Promise<number> {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

  const paidInMonth = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.status, 'Paid'),
        isNotNull(jobs.paymentDate)
      )
    );

  const revenue = paidInMonth
    .filter((job) => {
      if (!job.paymentDate) return false;
      return job.paymentDate >= startDate && job.paymentDate < endDate;
    })
    .reduce((sum, job) => sum + parseFloat(job.totalAmount || '0'), 0);

  return revenue;
}

/**
 * Update invoice notes
 */
export async function updateInvoiceNotes(
  id: number,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));

    if (!job) {
      return { success: false, error: 'Invoice not found' };
    }

    // Only allow editing unpaid invoices
    if (job.status === 'Paid') {
      return { success: false, error: 'Cannot edit paid invoice' };
    }

    await db
      .update(jobs)
      .set({
        notes: notes.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id));

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating invoice notes:', error);
    return { success: false, error: 'Failed to update invoice notes' };
  }
}

/**
 * Helper function to calculate overdue status
 */
function calculateOverdueStatus(job: Job): { isOverdue: boolean; daysOverdue: number } {
  if (job.status === 'Paid' || !job.invoiceDate) {
    return { isOverdue: false, daysOverdue: 0 };
  }

  const invoiceDate = new Date(job.invoiceDate);
  const today = new Date();
  const daysSinceInvoice = Math.floor(
    (today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const isOverdue = daysSinceInvoice > 30;
  const daysOverdue = isOverdue ? daysSinceInvoice - 30 : 0;

  return { isOverdue, daysOverdue };
}

/**
 * Helper function to enrich invoices with details
 */
async function enrichInvoicesWithDetails(
  jobList: Job[]
): Promise<InvoiceWithDetails[]> {
  return await Promise.all(
    jobList.map(async (job) => {
      const [customer] = await db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
          address: customers.address,
        })
        .from(customers)
        .where(eq(customers.id, job.customerId));

      const jobLineItems = await db
        .select()
        .from(lineItems)
        .where(eq(lineItems.jobId, job.id))
        .orderBy(lineItems.itemNumber);

      const { isOverdue, daysOverdue } = calculateOverdueStatus(job);

      return {
        ...job,
        customer,
        lineItems: jobLineItems,
        isOverdue,
        daysOverdue,
      };
    })
  );
}
