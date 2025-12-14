import { z } from 'zod';

/**
 * Validate phone number format
 * Must be exactly 10 digits or formatted as (XXX) XXX-XXXX
 */
export function validatePhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Zod schemas for form validation

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255),
  phone: z.string().min(1, 'Phone number is required').refine(
    (val) => validatePhoneNumber(val),
    { message: 'Phone number must be 10 digits' }
  ),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  address: z.string().max(1000).optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
});

export const lineItemSchema = z.object({
  action: z.string().min(1, 'Action is required').max(100),
  amount: z.number().min(0, 'Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
});

export const estimateSchema = z.object({
  customerId: z.number().positive('Please select a customer'),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional().or(z.literal('')),
});

export const jobStatusUpdateSchema = z.object({
  status: z.enum([
    'Estimate Created',
    'Estimate Sent',
    'Approved',
    'In Progress',
    'Completed',
    'Invoiced',
    'Paid',
  ]),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  paymentDate: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional(),
});

// Type exports from schemas
export type CustomerInput = z.infer<typeof customerSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
export type EstimateInput = z.infer<typeof estimateSchema>;
export type JobStatusUpdate = z.infer<typeof jobStatusUpdateSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
