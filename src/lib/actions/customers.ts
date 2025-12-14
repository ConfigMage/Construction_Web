'use server';

import { db, customers, jobs, type Customer, type NewCustomer } from '@/lib/db';
import { eq, ilike, or, sql, desc, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { formatPhoneNumber } from '@/lib/utils/format';
import { validatePhoneNumber, validateEmail, customerSchema } from '@/lib/utils/validation';

/**
 * Get all customers ordered by most recent first
 */
export async function getAllCustomers(): Promise<Customer[]> {
  return await db.select().from(customers).orderBy(desc(customers.id));
}

/**
 * Get a customer by ID
 */
export async function getCustomerById(id: number): Promise<Customer | null> {
  const result = await db.select().from(customers).where(eq(customers.id, id));
  return result[0] || null;
}

/**
 * Search customers by name, phone, email, or address
 */
export async function searchCustomers(term: string): Promise<Customer[]> {
  if (!term.trim()) {
    return getAllCustomers();
  }

  const pattern = `%${term}%`;
  return await db
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
    .orderBy(desc(customers.id));
}

/**
 * Create a new customer
 */
export async function createCustomer(data: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    // Validate input
    const validation = customerSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || 'Invalid input' };
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(data.phone);

    // Check for duplicate phone number
    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, formattedPhone));

    if (existing.length > 0) {
      return {
        success: false,
        error: `A customer with this phone number already exists: ${existing[0].name}`,
      };
    }

    // Create customer
    const [newCustomer] = await db
      .insert(customers)
      .values({
        name: data.name.trim(),
        phone: formattedPhone,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
      })
      .returning();

    revalidatePath('/customers');
    return { success: true, customer: newCustomer };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { success: false, error: 'Failed to create customer' };
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  id: number,
  data: Partial<{
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
  }>
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    // Validate phone if provided
    if (data.phone) {
      if (!validatePhoneNumber(data.phone)) {
        return { success: false, error: 'Invalid phone number format' };
      }
      data.phone = formatPhoneNumber(data.phone);

      // Check for duplicate phone (excluding current customer)
      const existing = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, data.phone));

      if (existing.length > 0 && existing[0].id !== id) {
        return {
          success: false,
          error: `A customer with this phone number already exists: ${existing[0].name}`,
        };
      }
    }

    // Validate email if provided
    if (data.email && !validateEmail(data.email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Update customer
    const [updated] = await db
      .update(customers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    if (!updated) {
      return { success: false, error: 'Customer not found' };
    }

    revalidatePath('/customers');
    revalidatePath(`/customers/${id}`);
    return { success: true, customer: updated };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { success: false, error: 'Failed to update customer' };
  }
}

/**
 * Delete a customer
 * BUSINESS RULE: Cannot delete a customer with existing jobs
 */
export async function deleteCustomer(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check for existing jobs
    const jobCount = await db
      .select({ count: count() })
      .from(jobs)
      .where(eq(jobs.customerId, id));

    if (Number(jobCount[0]?.count || 0) > 0) {
      return {
        success: false,
        error: 'Cannot delete customer with existing jobs. Please delete all jobs first.',
      };
    }

    // Delete customer
    await db.delete(customers).where(eq(customers.id, id));

    revalidatePath('/customers');
    return { success: true };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { success: false, error: 'Failed to delete customer' };
  }
}

/**
 * Get customer with their jobs
 */
export async function getCustomerWithJobs(id: number) {
  const customer = await getCustomerById(id);
  if (!customer) return null;

  const customerJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.customerId, id))
    .orderBy(desc(jobs.createdAt));

  return {
    ...customer,
    jobs: customerJobs,
  };
}

/**
 * Get customer statistics
 */
export async function getCustomerStats(id: number) {
  const customerJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.customerId, id));

  const totalRevenue = customerJobs
    .filter((job) => job.status === 'Paid')
    .reduce((sum, job) => sum + parseFloat(job.totalAmount || '0'), 0);

  const unpaidAmount = customerJobs
    .filter((job) => job.status === 'Invoiced')
    .reduce((sum, job) => sum + parseFloat(job.totalAmount || '0'), 0);

  return {
    totalJobs: customerJobs.length,
    completedJobs: customerJobs.filter((job) => job.status === 'Paid').length,
    activeJobs: customerJobs.filter((job) =>
      ['Approved', 'In Progress', 'Completed', 'Invoiced'].includes(job.status)
    ).length,
    pendingEstimates: customerJobs.filter((job) =>
      ['Estimate Created', 'Estimate Sent'].includes(job.status)
    ).length,
    totalRevenue,
    unpaidAmount,
  };
}

/**
 * Get top customers by revenue
 */
export async function getTopCustomers(limit: number = 10) {
  const result = await db
    .select({
      customerId: jobs.customerId,
      customerName: customers.name,
      totalRevenue: sql<number>`SUM(CASE WHEN ${jobs.status} = 'Paid' THEN CAST(${jobs.totalAmount} AS DECIMAL) ELSE 0 END)`,
      jobCount: count(),
    })
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .groupBy(jobs.customerId, customers.name)
    .orderBy(sql`SUM(CASE WHEN ${jobs.status} = 'Paid' THEN CAST(${jobs.totalAmount} AS DECIMAL) ELSE 0 END) DESC`)
    .limit(limit);

  return result;
}
