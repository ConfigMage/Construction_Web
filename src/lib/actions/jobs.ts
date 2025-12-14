'use server';

import { db, jobs, lineItems, customers, type Job, type LineItem } from '@/lib/db';
import { eq, and, or, not, desc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getStatusDateUpdates, canTransitionTo, isActiveJob } from '@/lib/utils/workflow';
import type { JobStatus } from '@/lib/db/schema';

export type JobWithDetails = Job & {
  customer: { id: number; name: string; phone: string; email: string | null; address: string | null };
  lineItems: LineItem[];
};

/**
 * Get all jobs (approved and beyond)
 */
export async function getAllJobs(): Promise<JobWithDetails[]> {
  const allJobs = await db
    .select()
    .from(jobs)
    .where(
      not(
        or(
          eq(jobs.status, 'Estimate Created'),
          eq(jobs.status, 'Estimate Sent')
        )!
      )
    )
    .orderBy(desc(jobs.updatedAt));

  return await enrichJobsWithDetails(allJobs);
}

/**
 * Get active jobs (Approved, In Progress, Completed, Invoiced)
 */
export async function getActiveJobs(): Promise<JobWithDetails[]> {
  const activeJobs = await db
    .select()
    .from(jobs)
    .where(
      or(
        eq(jobs.status, 'Approved'),
        eq(jobs.status, 'In Progress'),
        eq(jobs.status, 'Completed'),
        eq(jobs.status, 'Invoiced')
      )
    )
    .orderBy(desc(jobs.updatedAt));

  return await enrichJobsWithDetails(activeJobs);
}

/**
 * Get completed jobs (Paid)
 */
export async function getCompletedJobs(): Promise<JobWithDetails[]> {
  const completedJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, 'Paid'))
    .orderBy(desc(jobs.paymentDate));

  return await enrichJobsWithDetails(completedJobs);
}

/**
 * Get job by ID
 */
export async function getJobById(id: number): Promise<JobWithDetails | null> {
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
 * Update job status
 */
export async function updateJobStatus(
  id: number,
  newStatus: JobStatus
): Promise<{ success: boolean; job?: JobWithDetails; error?: string }> {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    const currentStatus = job.status as JobStatus;

    // Validate status transition
    if (!canTransitionTo(currentStatus, newStatus)) {
      return {
        success: false,
        error: `Cannot transition from "${currentStatus}" to "${newStatus}". Status must progress in order.`,
      };
    }

    // Get date updates for this status
    const dateUpdates = getStatusDateUpdates(newStatus);

    await db
      .update(jobs)
      .set({
        status: newStatus,
        ...dateUpdates,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id));

    const updatedJob = await getJobById(id);

    revalidatePath('/jobs');
    revalidatePath(`/jobs/${id}`);
    revalidatePath('/');
    return { success: true, job: updatedJob! };
  } catch (error) {
    console.error('Error updating job status:', error);
    return { success: false, error: 'Failed to update job status' };
  }
}

/**
 * Start a job (transition from Approved to In Progress)
 */
export async function startJob(
  id: number
): Promise<{ success: boolean; error?: string }> {
  return updateJobStatus(id, 'In Progress');
}

/**
 * Complete a job (transition from In Progress to Completed)
 */
export async function completeJob(
  id: number
): Promise<{ success: boolean; error?: string }> {
  return updateJobStatus(id, 'Completed');
}

/**
 * Update job notes
 */
export async function updateJobNotes(
  id: number,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(jobs)
      .set({
        notes: notes.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id));

    revalidatePath('/jobs');
    revalidatePath(`/jobs/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating job notes:', error);
    return { success: false, error: 'Failed to update job notes' };
  }
}

/**
 * Get job statistics
 */
export async function getJobStats() {
  const allJobs = await db.select().from(jobs);

  const activeCount = allJobs.filter((job) =>
    ['Approved', 'In Progress', 'Completed', 'Invoiced'].includes(job.status)
  ).length;

  const inProgressCount = allJobs.filter(
    (job) => job.status === 'In Progress'
  ).length;

  const completedCount = allJobs.filter(
    (job) => job.status === 'Completed'
  ).length;

  const activeValue = allJobs
    .filter((job) => ['Approved', 'In Progress', 'Completed', 'Invoiced'].includes(job.status))
    .reduce((sum, job) => sum + parseFloat(job.totalAmount || '0'), 0);

  return {
    activeCount,
    inProgressCount,
    completedCount,
    activeValue,
  };
}

/**
 * Get jobs by status
 */
export async function getJobsByStatus(status: JobStatus): Promise<JobWithDetails[]> {
  const filteredJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, status))
    .orderBy(desc(jobs.updatedAt));

  return await enrichJobsWithDetails(filteredJobs);
}

/**
 * Get recent jobs for dashboard
 */
export async function getRecentJobs(limit: number = 5): Promise<JobWithDetails[]> {
  const recentJobs = await db
    .select()
    .from(jobs)
    .orderBy(desc(jobs.updatedAt))
    .limit(limit);

  return await enrichJobsWithDetails(recentJobs);
}

/**
 * Helper function to enrich jobs with customer and line item details
 */
async function enrichJobsWithDetails(jobList: Job[]): Promise<JobWithDetails[]> {
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

      return {
        ...job,
        customer,
        lineItems: jobLineItems,
      };
    })
  );
}
