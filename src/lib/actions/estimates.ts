'use server';

import { db, jobs, lineItems, customers, type Job, type LineItem } from '@/lib/db';
import { eq, or, ilike, desc, and, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { generateEstimateNumber } from '@/lib/utils/numbers';
import { canEditJob, canDeleteJob, getStatusDateUpdates } from '@/lib/utils/workflow';
import type { JobStatus } from '@/lib/db/schema';

export type EstimateWithDetails = Job & {
  customer: { id: number; name: string; phone: string; email: string | null; address: string | null };
  lineItems: LineItem[];
};

/**
 * Get all estimates (jobs with status 'Estimate Created' or 'Estimate Sent')
 */
export async function getAllEstimates(): Promise<EstimateWithDetails[]> {
  const estimateJobs = await db
    .select()
    .from(jobs)
    .where(
      or(
        eq(jobs.status, 'Estimate Created'),
        eq(jobs.status, 'Estimate Sent')
      )
    )
    .orderBy(desc(jobs.estimateDate));

  // Fetch related data for each estimate
  const estimates = await Promise.all(
    estimateJobs.map(async (job) => {
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

      return {
        ...job,
        customer,
        lineItems: jobLineItems,
      };
    })
  );

  return estimates;
}

/**
 * Get estimate by ID
 */
export async function getEstimateById(id: number): Promise<EstimateWithDetails | null> {
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

  return {
    ...job,
    customer,
    lineItems: jobLineItems,
  };
}

/**
 * Create a new estimate
 */
export async function createEstimate(data: {
  customerId: number;
  lineItems: { action: string; amount: number; description: string }[];
  notes?: string;
}): Promise<{ success: boolean; estimate?: EstimateWithDetails; error?: string }> {
  try {
    // Validate line items
    if (!data.lineItems || data.lineItems.length === 0) {
      return { success: false, error: 'At least one line item is required' };
    }

    for (let i = 0; i < data.lineItems.length; i++) {
      const item = data.lineItems[i];
      if (!item.action?.trim()) {
        return { success: false, error: `Line item ${i + 1}: Action is required` };
      }
      if (item.amount < 0) {
        return { success: false, error: `Line item ${i + 1}: Amount must be positive` };
      }
      if (!item.description?.trim()) {
        return { success: false, error: `Line item ${i + 1}: Description is required` };
      }
    }

    // Generate estimate number
    const estimateNumber = await generateEstimateNumber();

    // Calculate total
    const total = data.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Create job record
    const [newJob] = await db
      .insert(jobs)
      .values({
        customerId: data.customerId,
        estimateNumber,
        estimateDate: new Date().toISOString().split('T')[0],
        status: 'Estimate Created',
        totalAmount: total.toFixed(2),
        notes: data.notes?.trim() || null,
      })
      .returning();

    // Create line items
    await db.insert(lineItems).values(
      data.lineItems.map((item, index) => ({
        jobId: newJob.id,
        itemNumber: index + 1,
        action: item.action.trim(),
        amount: item.amount.toFixed(2),
        description: item.description.trim(),
      }))
    );

    // Fetch complete estimate
    const estimate = await getEstimateById(newJob.id);

    revalidatePath('/estimates');
    revalidatePath('/');
    return { success: true, estimate: estimate! };
  } catch (error) {
    console.error('Error creating estimate:', error);
    return { success: false, error: 'Failed to create estimate' };
  }
}

/**
 * Update an existing estimate
 * BUSINESS RULE: Cannot update after approval
 */
export async function updateEstimate(
  id: number,
  data: {
    lineItems?: { action: string; amount: number; description: string }[];
    notes?: string;
  }
): Promise<{ success: boolean; estimate?: EstimateWithDetails; error?: string }> {
  try {
    // Get current job
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));

    if (!job) {
      return { success: false, error: 'Estimate not found' };
    }

    // Check if editable
    if (!canEditJob(job.status as JobStatus)) {
      return { success: false, error: 'Cannot update estimate after approval' };
    }

    // Update line items if provided
    if (data.lineItems !== undefined) {
      // Validate line items
      if (data.lineItems.length === 0) {
        return { success: false, error: 'At least one line item is required' };
      }

      // Delete existing line items
      await db.delete(lineItems).where(eq(lineItems.jobId, id));

      // Insert new line items
      await db.insert(lineItems).values(
        data.lineItems.map((item, index) => ({
          jobId: id,
          itemNumber: index + 1,
          action: item.action.trim(),
          amount: item.amount.toFixed(2),
          description: item.description.trim(),
        }))
      );

      // Recalculate total
      const total = data.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

      await db
        .update(jobs)
        .set({
          totalAmount: total.toFixed(2),
          notes: data.notes?.trim() || job.notes,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, id));
    } else if (data.notes !== undefined) {
      await db
        .update(jobs)
        .set({
          notes: data.notes?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, id));
    }

    const estimate = await getEstimateById(id);

    revalidatePath('/estimates');
    revalidatePath(`/estimates/${id}`);
    return { success: true, estimate: estimate! };
  } catch (error) {
    console.error('Error updating estimate:', error);
    return { success: false, error: 'Failed to update estimate' };
  }
}

/**
 * Delete an estimate
 * BUSINESS RULE: Cannot delete after approval
 */
export async function deleteEstimate(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));

    if (!job) {
      return { success: false, error: 'Estimate not found' };
    }

    if (!canDeleteJob(job.status as JobStatus)) {
      return { success: false, error: 'Cannot delete estimate after approval' };
    }

    // Delete line items (cascade should handle this, but be explicit)
    await db.delete(lineItems).where(eq(lineItems.jobId, id));

    // Delete job
    await db.delete(jobs).where(eq(jobs.id, id));

    revalidatePath('/estimates');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting estimate:', error);
    return { success: false, error: 'Failed to delete estimate' };
  }
}

/**
 * Mark estimate as sent
 */
export async function markEstimateAsSent(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));

    if (!job) {
      return { success: false, error: 'Estimate not found' };
    }

    if (job.status !== 'Estimate Created') {
      return { success: false, error: 'Estimate has already been sent or approved' };
    }

    await db
      .update(jobs)
      .set({
        status: 'Estimate Sent',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id));

    revalidatePath('/estimates');
    revalidatePath(`/estimates/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error marking estimate as sent:', error);
    return { success: false, error: 'Failed to mark estimate as sent' };
  }
}

/**
 * Approve estimate and convert to job
 */
export async function approveEstimate(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));

    if (!job) {
      return { success: false, error: 'Estimate not found' };
    }

    if (job.status !== 'Estimate Created' && job.status !== 'Estimate Sent') {
      return { success: false, error: 'Estimate has already been approved' };
    }

    const dateUpdates = getStatusDateUpdates('Approved');

    await db
      .update(jobs)
      .set({
        status: 'Approved',
        ...dateUpdates,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id));

    revalidatePath('/estimates');
    revalidatePath('/jobs');
    revalidatePath(`/estimates/${id}`);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error approving estimate:', error);
    return { success: false, error: 'Failed to approve estimate' };
  }
}

/**
 * Search estimates
 */
export async function searchEstimates(term: string): Promise<EstimateWithDetails[]> {
  if (!term.trim()) {
    return getAllEstimates();
  }

  const pattern = `%${term}%`;

  // Search in estimate number and notes
  const matchingJobs = await db
    .select()
    .from(jobs)
    .where(
      and(
        or(
          eq(jobs.status, 'Estimate Created'),
          eq(jobs.status, 'Estimate Sent')
        ),
        or(
          ilike(jobs.estimateNumber, pattern),
          ilike(jobs.notes, pattern)
        )
      )
    )
    .orderBy(desc(jobs.estimateDate));

  // Also search by customer name
  const customerMatches = await db
    .select({ jobId: jobs.id })
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .where(
      and(
        or(
          eq(jobs.status, 'Estimate Created'),
          eq(jobs.status, 'Estimate Sent')
        ),
        ilike(customers.name, pattern)
      )
    );

  // Combine and deduplicate
  const allJobIds = [
    ...matchingJobs.map((j) => j.id),
    ...customerMatches.map((c) => c.jobId),
  ];
  const uniqueJobIds = [...new Set(allJobIds)];

  // Fetch full estimates
  const estimates = await Promise.all(
    uniqueJobIds.map((id) => getEstimateById(id))
  );

  return estimates.filter((e): e is EstimateWithDetails => e !== null);
}

/**
 * Get estimate statistics
 */
export async function getEstimateStats() {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const firstOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];

  const allJobs = await db.select().from(jobs);

  const pendingEstimates = allJobs.filter(
    (job) => job.status === 'Estimate Created' || job.status === 'Estimate Sent'
  );

  const monthlyEstimates = allJobs.filter(
    (job) => job.estimateDate && job.estimateDate >= firstOfMonth
  );

  const approvedEstimates = allJobs.filter(
    (job) => job.status !== 'Estimate Created' && job.status !== 'Estimate Sent'
  );

  const conversionRate =
    allJobs.length > 0 ? (approvedEstimates.length / allJobs.length) * 100 : 0;

  return {
    pendingCount: pendingEstimates.length,
    pendingValue: pendingEstimates.reduce(
      (sum, job) => sum + parseFloat(job.totalAmount || '0'),
      0
    ),
    monthlyCount: monthlyEstimates.length,
    monthlyValue: monthlyEstimates.reduce(
      (sum, job) => sum + parseFloat(job.totalAmount || '0'),
      0
    ),
    conversionRate: Math.round(conversionRate),
  };
}
